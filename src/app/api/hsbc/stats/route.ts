import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans, getAllBatchDates } from '@/storage/database/hsbc-loan-storage';
import type { HSBCLoan } from '@/lib/hsbc-loan';
import { calcBalance, calcPastdueAmount, calcOverdueDays, calcTotalRepaid } from '@/lib/hsbc-loan';

const USD_TO_CNY_RATE = 7;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchDate = searchParams.get('batchDate') || '';

    // 从数据库获取贷款数据，按批次日期筛选
    let loans: HSBCLoan[];
    if (batchDate) {
      // 按批次日期筛选
      loans = await getAllHSBCLoans(batchDate);
    } else {
      loans = await getAllHSBCLoans();
    }

    if (loans.length === 0) {
      return NextResponse.json({
        data: {
          totalLoans: 0,
          activeMerchants: 0,
          totalLoanAmount: 0,
          totalBalance: 0,
          totalBalanceUSD: 0,
          totalBalanceLoanCount: 0,
          totalBalanceMerchantCount: 0,
          totalPastdueAmount: 0,
          totalPastdueAmountUSD: 0,
          overdueRate: 0,
          overdueMerchantRate: 0,
          warningAmount: 0,
          warningAmountUSD: 0,
          approachingMaturityAmount: 0,
          overdueByDays: {
            over0Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
            over30Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
            over90Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
          },
          warningInfo: { amount: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
          repaymentDue: {},
        },
      });
    }

    // 计算统计
    const totalLoans = loans.length;
    const uniqueMerchants = [...new Set(loans.map(l => l.merchantId))];
    const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
    const usdLoans = loans.filter(l => l.loanCurrency === 'USD');

    // 在贷余额计算 - 直接使用数据库中的balance字段
    const cnyBalanceSum = cnyLoans.reduce((sum, l) => sum + (l.balance ?? 0), 0);
    const usdBalanceSum = usdLoans.reduce((sum, l) => sum + (l.balance ?? 0), 0);
    const totalBalance = cnyBalanceSum + usdBalanceSum * USD_TO_CNY_RATE;
    const totalBalanceUSD = cnyBalanceSum / USD_TO_CNY_RATE + usdBalanceSum;

    // 逾期天数分级 - 使用数据库中的overdueDays字段
    const over0Merchants = new Set<string>();
    const over30Merchants = new Set<string>();
    const over90Merchants = new Set<string>();

    loans.forEach(loan => {
      const overdueDays = loan.overdueDays ?? -1;
      if (overdueDays > 0) {
        over0Merchants.add(loan.merchantId);
        if (overdueDays >= 30) over30Merchants.add(loan.merchantId);
        if (overdueDays >= 90) over90Merchants.add(loan.merchantId);
      }
    });

    // 逾期金额计算 - 直接使用数据库中的pastdueAmount字段
    const over0AmountCNY = cnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0)
      + usdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) * USD_TO_CNY_RATE, 0);
    const over0AmountUSD = cnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) / USD_TO_CNY_RATE, 0)
      + usdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0);

    const over30Loans = loans.filter(l => (l.overdueDays ?? -1) >= 30);
    const over30CnyLoans = over30Loans.filter(l => l.loanCurrency === 'CNY');
    const over30UsdLoans = over30Loans.filter(l => l.loanCurrency === 'USD');
    const over30AmountCNY = over30CnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0)
      + over30UsdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) * USD_TO_CNY_RATE, 0);
    const over30AmountUSD = over30CnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) / USD_TO_CNY_RATE, 0)
      + over30UsdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0);

    const over90Loans = loans.filter(l => (l.overdueDays ?? -1) >= 90);
    const over90CnyLoans = over90Loans.filter(l => l.loanCurrency === 'CNY');
    const over90UsdLoans = over90Loans.filter(l => l.loanCurrency === 'USD');
    const over90AmountCNY = over90CnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0)
      + over90UsdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) * USD_TO_CNY_RATE, 0);
    const over90AmountUSD = over90CnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) / USD_TO_CNY_RATE, 0)
      + over90UsdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0);

    // 预警金额：逾期但未到期的余额
    const warningMerchants = new Set<string>();
    let warningAmountCNY = 0;
    let warningAmountUSD = 0;
    let warningLoanCount = 0;

    // 获取批次日期作为参考日期，如果没有则使用当前日期
    const referenceDate = batchDate ? new Date(batchDate) : new Date();

    loans.forEach(loan => {
      const maturityDate = new Date(loan.maturityDate);
      const balance = loan.balance ?? 0;
      if (referenceDate <= maturityDate && balance > 0.9) {
        if (loan.loanCurrency === 'CNY') {
          warningAmountCNY += balance;
          warningAmountUSD += balance / USD_TO_CNY_RATE;
        } else {
          warningAmountCNY += balance * USD_TO_CNY_RATE;
          warningAmountUSD += balance;
        }
        warningLoanCount++;
        warningMerchants.add(loan.merchantId);
      }
    });

    // 还款期限分布
    const repaymentDue: Record<number, { cnyAmount: number; usdAmount: number; count: number; merchantCount: number }> = {};
    [3, 7, 15, 30, 45].forEach(days => {
      const dueLoans = loans.filter(l => {
        const maturityDate = new Date(l.maturityDate);
        const daysDiff = Math.floor((maturityDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff <= days;
      });
      
      const merchantSet = new Set(dueLoans.map(l => l.merchantId));
      const dueCnyLoans = dueLoans.filter(l => l.loanCurrency === 'CNY');
      const dueUsdLoans = dueLoans.filter(l => l.loanCurrency === 'USD');
      const cnyAmt = dueCnyLoans.reduce((s, l) => s + (l.balance ?? 0), 0);
      const usdAmt = dueUsdLoans.reduce((s, l) => s + (l.balance ?? 0), 0);
      
      repaymentDue[days] = {
        cnyAmount: cnyAmt + usdAmt * USD_TO_CNY_RATE,
        usdAmount: cnyAmt / USD_TO_CNY_RATE + usdAmt,
        count: dueLoans.length,
        merchantCount: merchantSet.size,
      };
    });

    // 已还款总额
    const totalRepaidCNY = cnyLoans.reduce((sum, l) => sum + (l.totalRepaid ?? 0), 0);
    const totalRepaidUSD = usdLoans.reduce((sum, l) => sum + (l.totalRepaid ?? 0), 0);
    const totalRepaid = totalRepaidCNY + totalRepaidUSD * USD_TO_CNY_RATE;
    const totalRepaidUSDAmount = totalRepaidCNY / USD_TO_CNY_RATE + totalRepaidUSD;

    return NextResponse.json({
      data: {
        totalLoans,
        activeMerchants: uniqueMerchants.length,
        totalLoanAmount: loans.reduce((s, l) => s + l.loanAmount, 0),
        totalBalance,
        totalBalanceUSD,
        totalBalanceLoanCount: loans.filter(l => (l.balance ?? 0) > 0.9).length,
        totalBalanceMerchantCount: [...new Set(loans.filter(l => (l.balance ?? 0) > 0.9).map(l => l.merchantId))].length,
        totalPastdueAmount: over0AmountCNY,
        totalPastdueAmountUSD: over0AmountUSD,
        totalRepaid,
        totalRepaidUSD: totalRepaidUSDAmount,
        overdueRate: totalBalance > 0 ? over0AmountCNY / totalBalance : 0,
        overdueMerchantRate: totalLoans > 0 ? over0Merchants.size / totalLoans : 0,
        warningAmount: warningAmountCNY,
        warningAmountUSD,
        approachingMaturityAmount: repaymentDue[30]?.cnyAmount || 0,
        overdueByDays: {
          over0Days: {
            amount: over0AmountCNY,
            rate: totalBalance > 0 ? over0AmountCNY / totalBalance : 0,
            amountUSD: over0AmountUSD,
            loanCount: loans.filter(l => (l.pastdueAmount ?? 0) > 0).length,
            merchantCount: over0Merchants.size,
          },
          over30Days: {
            amount: over30AmountCNY,
            rate: totalBalance > 0 ? over30AmountCNY / totalBalance : 0,
            amountUSD: over30AmountUSD,
            loanCount: loans.filter(l => (l.overdueDays ?? -1) >= 30).length,
            merchantCount: over30Merchants.size,
          },
          over90Days: {
            amount: over90AmountCNY,
            rate: totalBalance > 0 ? over90AmountCNY / totalBalance : 0,
            amountUSD: over90AmountUSD,
            loanCount: loans.filter(l => (l.overdueDays ?? -1) >= 90).length,
            merchantCount: over90Merchants.size,
          },
        },
        warningInfo: {
          amount: warningAmountCNY,
          amountUSD: warningAmountUSD,
          loanCount: warningLoanCount,
          merchantCount: warningMerchants.size,
        },
        repaymentDue,
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
