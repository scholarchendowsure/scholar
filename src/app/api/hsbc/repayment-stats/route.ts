import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import { HSBCLoan } from '@/lib/hsbc-loan';

// 安全解析日期字符串（避免时区偏移问题）
function parseDateSafe(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  // 使用年月日构建一个纯日期比较值，避免时区问题
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2]);
}

// 从日期字符串中提取年月
function getYearMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return '';
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
}

// 按月份统计还款数据
function getMonthlyRepaymentStats(loans: HSBCLoan[], yearMonth: string) {
  let ontimeRepaymentUSD = 0; // 未逾期还款金额
  let ontimeRepaymentCNY = 0;
  let ontimeCount = 0; // 未逾期还款笔数
  
  let overdueRepaymentUSD = 0; // 逾期后还款金额
  let overdueRepaymentCNY = 0;
  let overdueCount = 0; // 逾期后还款笔数
  
  const ontimeLoanReferences = new Set<string>(); // 有未逾期还款的贷款编号
  const overdueLoanReferences = new Set<string>(); // 有逾期后还款的贷款编号
  
  for (const loan of loans) {
    if (!loan.repaymentSchedule || loan.repaymentSchedule.length === 0) continue;
    
    const maturityDateValue = parseDateSafe(loan.maturityDate);
    
    let loanHasOntimeRepayment = false;
    let loanHasOverdueRepayment = false;
    
    for (const repayment of loan.repaymentSchedule) {
      const repaymentAmount = repayment.amount || 0;
      if (repaymentAmount <= 0) continue;
      
      // 判断是否在指定月份
      const repayYearMonth = getYearMonth(repayment.date);
      if (repayYearMonth !== yearMonth) continue;
      
      // 安全比较日期：还款日期 <= 到期日 → 未逾期还款
      const repaymentDateValue = parseDateSafe(repayment.date);
      
      if (!maturityDateValue || repaymentDateValue <= maturityDateValue) {
        // 还款日期在到期日当天或之前 → 未逾期还款
        if (loan.loanCurrency === 'USD') {
          ontimeRepaymentUSD += repaymentAmount;
        } else {
          ontimeRepaymentCNY += repaymentAmount;
        }
        loanHasOntimeRepayment = true;
        ontimeCount++;
      } else {
        // 还款日期在到期日之后 → 逾期后还款
        if (loan.loanCurrency === 'USD') {
          overdueRepaymentUSD += repaymentAmount;
        } else {
          overdueRepaymentCNY += repaymentAmount;
        }
        loanHasOverdueRepayment = true;
        overdueCount++;
      }
    }
    
    if (loanHasOntimeRepayment) ontimeLoanReferences.add(loan.loanReference);
    if (loanHasOverdueRepayment) overdueLoanReferences.add(loan.loanReference);
  }
  
  // 转换为万为单位
  // 计算合计金额（折CNY和折USD）
  const totalOntimeCNY = ontimeRepaymentCNY + ontimeRepaymentUSD * 7;
  const totalOntimeUSD = ontimeRepaymentCNY / 7 + ontimeRepaymentUSD;
  const totalOverdueCNY = overdueRepaymentCNY + overdueRepaymentUSD * 7;
  const totalOverdueUSD = overdueRepaymentCNY / 7 + overdueRepaymentUSD;
  const totalTotalCNY = (ontimeRepaymentCNY + overdueRepaymentCNY) + (ontimeRepaymentUSD + overdueRepaymentUSD) * 7;
  const totalTotalUSD = (ontimeRepaymentCNY + overdueRepaymentCNY) / 7 + (ontimeRepaymentUSD + overdueRepaymentUSD);
  
  return {
    ontimeRepayment: {
      amountUSD: ontimeRepaymentUSD,
      amountCNY: ontimeRepaymentCNY,
      amountUSDWan: (ontimeRepaymentUSD / 10000).toFixed(2),
      amountCNYWan: (ontimeRepaymentCNY / 10000).toFixed(2),
      // 新增合计金额
      totalAmountCNY: totalOntimeCNY,
      totalAmountUSD: totalOntimeUSD,
      totalAmountCNYWan: (totalOntimeCNY / 10000).toFixed(2),
      totalAmountUSDWan: (totalOntimeUSD / 10000).toFixed(2),
      count: ontimeCount,
      loanCount: ontimeLoanReferences.size,
      loanReferences: Array.from(ontimeLoanReferences),
    },
    overdueRepayment: {
      amountUSD: overdueRepaymentUSD,
      amountCNY: overdueRepaymentCNY,
      amountUSDWan: (overdueRepaymentUSD / 10000).toFixed(2),
      amountCNYWan: (overdueRepaymentCNY / 10000).toFixed(2),
      // 新增合计金额
      totalAmountCNY: totalOverdueCNY,
      totalAmountUSD: totalOverdueUSD,
      totalAmountCNYWan: (totalOverdueCNY / 10000).toFixed(2),
      totalAmountUSDWan: (totalOverdueUSD / 10000).toFixed(2),
      count: overdueCount,
      loanCount: overdueLoanReferences.size,
      loanReferences: Array.from(overdueLoanReferences),
    },
    totalRepayment: {
      amountUSD: ontimeRepaymentUSD + overdueRepaymentUSD,
      amountCNY: ontimeRepaymentCNY + overdueRepaymentCNY,
      amountUSDWan: ((ontimeRepaymentUSD + overdueRepaymentUSD) / 10000).toFixed(2),
      amountCNYWan: ((ontimeRepaymentCNY + overdueRepaymentCNY) / 10000).toFixed(2),
      // 新增合计金额
      totalAmountCNY: totalTotalCNY,
      totalAmountUSD: totalTotalUSD,
      totalAmountCNYWan: (totalTotalCNY / 10000).toFixed(2),
      totalAmountUSDWan: (totalTotalUSD / 10000).toFixed(2),
      loanReferences: Array.from(new Set([...ontimeLoanReferences, ...overdueLoanReferences])),
    },
  };
}

// 获取所有可用的还款月份
function getAvailableRepaymentMonths(loans: HSBCLoan[]): string[] {
  const months = new Set<string>();
  
  for (const loan of loans) {
    if (!loan.repaymentSchedule) continue;
    
    for (const repayment of loan.repaymentSchedule) {
      const ym = getYearMonth(repayment.date);
      if (ym) months.add(ym);
    }
  }
  
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
    
    // 确定目标月份：优先使用用户指定的月份，否则使用最新的还款月份
    let finalMonth = yearMonth || '';
    if (!finalMonth && availableMonths.length > 0) {
      finalMonth = availableMonths[0]; // 默认使用最新的还款月份
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
