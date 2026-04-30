import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans, getAllBatchDates, getHSBCLoansByBatchDate } from '@/storage/database/hsbc-loan-storage';
import type { HSBCLoan } from '@/lib/hsbc-loan';

interface MerchantData {
  merchantId: string;
  merchantName: string;
  totalAmount: number;
  totalBalance: number;
  overdueAmount: number;
  loanCount: number;
  overdueCount: number;
  loans?: HSBCLoan[];
}

// 计算逾期天数（只考虑是否已到期，不考虑余额）
const calculateOverdueDays = (loan: HSBCLoan, batchDate: string | null): number => {
  const maturityDate = new Date(loan.maturityDate);
  maturityDate.setHours(0, 0, 0, 0);
    
  // 根据批次日期计算逾期天数
  const refDate = batchDate ? new Date(batchDate) : new Date();
  refDate.setHours(0, 0, 0, 0);
  const diffTime = refDate.getTime() - maturityDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
  return diffDays > 0 ? diffDays : -1;
};

// 计算余额
const calcBalance = (loan: HSBCLoan): number => {
  return Math.max(0, loan.loanAmount - (loan.totalRepaid || 0));
};

// 计算逾期金额
const calcPastdueAmount = (loan: HSBCLoan): number => {
  const balance = calcBalance(loan);
  return loan.status === 'overdue' ? balance : 0;
};

// 汇丰贷款列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const currency = searchParams.get('currency');
    const merchantId = searchParams.get('merchantId');
    const search = searchParams.get('search');
    const batchDate = searchParams.get('batchDate');
    const status = searchParams.get('status');
    const hasOverdue = searchParams.get('hasOverdue') === 'true';

    // 从数据库获取数据
    let loans: HSBCLoan[];
    if (batchDate && batchDate !== 'all') {
      loans = await getHSBCLoansByBatchDate(batchDate);
    } else {
      loans = await getAllHSBCLoans();
    }

    // 批量处理贷款数据
    loans = loans.map(loan => {
      // 计算实际余额：贷款金额 - 已还款总额
      const effectiveBalance = Math.max(0, loan.loanAmount - (loan.totalRepaid || 0));
      
      // 获取批次日期
      const loanBatchDate = (loan as any).batchDate || batchDate || null;
      // 计算逾期天数
      const overdueDays = calculateOverdueDays(loan, loanBatchDate);
      
      // 计算状态：
      // 1. 逾期天数 > 0
      // 2. 余额 > 0.9（余额大于等于1才算逾期）
      // 两个条件都满足才算逾期
      const isOverdue = overdueDays > 0 && effectiveBalance > 0.9;
      const loanStatus = isOverdue ? 'overdue' : 'normal';
      
      return { 
        ...loan, 
        balance: effectiveBalance,
        overdueDays,
        status: loanStatus,
      };
    });

    // 应用筛选
    let filtered = [...loans];
    if (currency && currency !== 'all') {
      filtered = filtered.filter(l => l.loanCurrency === currency);
    }
    if (merchantId) {
      filtered = filtered.filter(l => l.merchantId === merchantId);
    }
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(l => 
        l.loanReference.toLowerCase().includes(term) ||
        l.borrowerName.toLowerCase().includes(term) ||
        l.merchantId.includes(term)
      );
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(l => l.status === status);
    }
    if (hasOverdue) {
      filtered = filtered.filter(l => l.status === 'overdue');
    }

    // 按商户分组
    const merchantMap = new Map<string, MerchantData>();
    filtered.forEach(loan => {
      const key = loan.merchantId;
      if (!merchantMap.has(key)) {
        merchantMap.set(key, {
          merchantId: loan.merchantId,
          merchantName: loan.merchantName || loan.borrowerName,
          totalAmount: 0,
          totalBalance: 0,
          overdueAmount: 0,
          loanCount: 0,
          overdueCount: 0,
          loans: [],
        });
      }
      const merchant = merchantMap.get(key)!;
      merchant.totalAmount += loan.loanAmount;
      merchant.totalBalance += calcBalance(loan);
      merchant.overdueAmount += calcPastdueAmount(loan);
      merchant.loanCount++;
      if (loan.status === 'overdue') {
        merchant.overdueCount++;
      }
      merchant.loans?.push(loan);
    });

    const merchants = Array.from(merchantMap.values());

    // 分页
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginatedLoans = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      loans: paginatedLoans,
      merchants,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching HSBC loans:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
