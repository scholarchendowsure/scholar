import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import { HSBCLoan } from '@/lib/hsbc-loan';

// 按月份统计还款数据
function getMonthlyRepaymentStats(loans: HSBCLoan[], yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  
  let ontimeRepaymentUSD = 0; // 未逾期还款金额
  let ontimeRepaymentCNY = 0;
  let ontimeCount = 0; // 未逾期还款笔数
  
  let overdueRepaymentUSD = 0; // 逾期后还款金额
  let overdueRepaymentCNY = 0;
  let overdueCount = 0; // 逾期后还款笔数
  
  let ontimeLoanCount = 0; // 有未逾期还款的贷款数
  let overdueLoanCount = 0; // 有逾期后还款的贷款数
  
  for (const loan of loans) {
    if (!loan.repaymentSchedule || loan.repaymentSchedule.length === 0) continue;
    
    const maturityDate = new Date(loan.maturityDate);
    const maturityTimestamp = maturityDate.getTime();
    
    let loanHasOntimeRepayment = false;
    let loanHasOverdueRepayment = false;
    
    for (const repayment of loan.repaymentSchedule) {
      const repaymentDate = new Date(repayment.date);
      const repaymentTimestamp = repaymentDate.getTime();
      const repaymentAmount = repayment.amount || 0;
      
      if (repaymentAmount <= 0) continue;
      
      // 判断是否在指定月份
      const repayYear = repaymentDate.getFullYear();
      const repayMonth = repaymentDate.getMonth() + 1;
      
      if (repayYear !== year || repayMonth !== month) continue;
      
      // 判断是否在到期日之前还款（未逾期还款）
      if (repaymentTimestamp < maturityTimestamp) {
        if (loan.loanCurrency === 'USD') {
          ontimeRepaymentUSD += repaymentAmount;
        } else {
          ontimeRepaymentCNY += repaymentAmount;
        }
        loanHasOntimeRepayment = true;
        ontimeCount++;
      } else {
        // 到期日之后还款（逾期后还款）
        if (loan.loanCurrency === 'USD') {
          overdueRepaymentUSD += repaymentAmount;
        } else {
          overdueRepaymentCNY += repaymentAmount;
        }
        loanHasOverdueRepayment = true;
        overdueCount++;
      }
    }
    
    if (loanHasOntimeRepayment) ontimeLoanCount++;
    if (loanHasOverdueRepayment) overdueLoanCount++;
  }
  
  // 转换为万为单位
  return {
    ontimeRepayment: {
      amountUSD: ontimeRepaymentUSD,
      amountCNY: ontimeRepaymentCNY,
      amountUSDWan: (ontimeRepaymentUSD / 10000).toFixed(2),
      amountCNYWan: (ontimeRepaymentCNY / 10000).toFixed(2),
      count: ontimeCount,
      loanCount: ontimeLoanCount,
    },
    overdueRepayment: {
      amountUSD: overdueRepaymentUSD,
      amountCNY: overdueRepaymentCNY,
      amountUSDWan: (overdueRepaymentUSD / 10000).toFixed(2),
      amountCNYWan: (overdueRepaymentCNY / 10000).toFixed(2),
      count: overdueCount,
      loanCount: overdueLoanCount,
    },
    totalRepayment: {
      amountUSD: ontimeRepaymentUSD + overdueRepaymentUSD,
      amountCNY: ontimeRepaymentCNY + overdueRepaymentCNY,
      amountUSDWan: ((ontimeRepaymentUSD + overdueRepaymentUSD) / 10000).toFixed(2),
      amountCNYWan: ((ontimeRepaymentCNY + overdueRepaymentCNY) / 10000).toFixed(2),
    },
  };
}

// 获取所有可用的还款月份
function getAvailableRepaymentMonths(loans: HSBCLoan[]): string[] {
  const months = new Set<string>();
  
  for (const loan of loans) {
    if (!loan.repaymentSchedule) continue;
    
    for (const repayment of loan.repaymentSchedule) {
      const date = new Date(repayment.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.add(`${year}-${month}`);
    }
  }
  
  // 排序，返回最新的在前
  return Array.from(months).sort().reverse();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchDate = searchParams.get('batchDate'); // 批次日期
    const yearMonth = searchParams.get('yearMonth'); // 要查询的月份，格式：YYYY-MM
    
    // 获取所有贷款数据
    const loans = await getAllHSBCLoans();
    
    // 如果指定了批次日期，过滤数据
    let filteredLoans = loans;
    if (batchDate) {
      filteredLoans = loans.filter((loan: any) => loan.batchDate === batchDate);
    }
    
    // 获取可用的还款月份
    const availableMonths = getAvailableRepaymentMonths(filteredLoans);
    
    // 如果没有指定月份，使用最新的月份（如果当前批次的月份没有数据）
    const targetMonth = yearMonth || availableMonths[0] || '';
    
    // 如果指定了批次但该批次没有还款数据月份，则使用可用月份中与批次最近的
    let finalMonth = targetMonth;
    if (batchDate && availableMonths.length > 0) {
      finalMonth = availableMonths[0]; // 使用最新的还款月份
    }
    
    // 计算指定月份的还款统计
    const monthlyStats = finalMonth 
      ? getMonthlyRepaymentStats(filteredLoans, finalMonth) 
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        availableMonths,
        currentMonth: finalMonth,
        stats: monthlyStats,
        totalLoans: filteredLoans.length,
        loansWithRepayment: filteredLoans.filter((l: any) => l.repaymentSchedule?.length > 0).length,
      },
    });
  } catch (error) {
    console.error('获取还款统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取还款统计数据失败' },
      { status: 500 }
    );
  }
}
