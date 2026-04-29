import { NextRequest, NextResponse } from 'next/server';
import { getHSBCLoansByBatchDate, getAllHSBCLoans, getAllBatchDates, saveHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import type { HSBCLoan } from '@/lib/hsbc-loan';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const batchDate = searchParams.get('batchDate') || '';
    const currency = searchParams.get('currency') || '';
    const keyword = searchParams.get('keyword') || '';
    const merchantId = searchParams.get('merchantId') || '';

    // 根据 batchDate 获取数据
    let loans: HSBCLoan[];
    if (batchDate) {
      loans = await getHSBCLoansByBatchDate(batchDate);
    } else {
      // 默认获取最新批次的数据
      const dates = await getAllBatchDates();
      if (dates.length > 0) {
        loans = await getHSBCLoansByBatchDate(dates[0]);
      } else {
        loans = await getAllHSBCLoans();
      }
    }

    // 计算逾期天数
    // 规则：
    // 1. pastdueAmount > 0 时，根据批次日期和到期日计算逾期天数
    // 2. pastdueAmount = 0 且 balance > 0.9 且已到期时，计算逾期天数
    // 3. balance <= 0.9 或未到期时，返回 -1（不逾期）
    const calculateOverdueDays = (loan: HSBCLoan, batchDate: string | null): number => {
      const balance = loan.balance ?? 0;
      const pastdueAmount = loan.pastdueAmount ?? 0;
      const maturityDate = new Date(loan.maturityDate);
      maturityDate.setHours(0, 0, 0, 0);
      
      // 如果 pastdueAmount > 0，根据批次日期计算
      if (pastdueAmount > 0) {
        const refDate = batchDate ? new Date(batchDate) : new Date();
        refDate.setHours(0, 0, 0, 0);
        const diffTime = refDate.getTime() - maturityDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      }
      
      // 如果余额 <= 0.9，不逾期
      if (balance <= 0.9) {
        return -1;
      }
      
      // 检查是否已到期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - maturityDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : -1;
    };

    // 批量处理贷款数据
    loans = loans.map(loan => {
      // 如果 balance 为空或0，使用 loanAmount
      const effectiveBalance = (loan.balance ?? 0) > 0 ? loan.balance : loan.loanAmount;
      // 获取批次日期
      const loanBatchDate = (loan as any).batchDate || batchDate || null;
      // 计算逾期天数
      const overdueDays = calculateOverdueDays({ ...loan, balance: effectiveBalance }, loanBatchDate);
      
      // 计算状态：逾期天数 > 0 为逾期，否则为正常
      const status = overdueDays > 0 ? 'overdue' : 'normal';
      
      return { 
        ...loan, 
        balance: effectiveBalance,
        overdueDays,
        status,
      };
    });

    // 筛选
    let filtered = [...loans];

    if (currency) {
      filtered = filtered.filter(l => l.loanCurrency === currency);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(l =>
        l.loanReference.toLowerCase().includes(kw) ||
        l.borrowerName.toLowerCase().includes(kw) ||
        l.merchantId.toLowerCase().includes(kw)
      );
    }
    if (merchantId) {
      filtered = filtered.filter(l => l.merchantId === merchantId);
    }

    // 分页
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    // 币种汇总
    const cnyLoans = filtered.filter(l => l.loanCurrency === 'CNY');
    const usdLoans = filtered.filter(l => l.loanCurrency === 'USD');

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        cnyCount: cnyLoans.length,
        cnyAmount: cnyLoans.reduce((s, l) => s + l.loanAmount, 0),
        usdCount: usdLoans.length,
        usdAmount: usdLoans.reduce((s, l) => s + l.loanAmount, 0),
      },
    });
  } catch (error) {
    console.error('获取汇丰贷款列表失败:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loans, batchDate } = body;

    if (!loans || !Array.isArray(loans) || loans.length === 0) {
      return NextResponse.json({ error: '贷款数据不能为空' }, { status: 400 });
    }

    // 添加批次日期
    const loansWithBatchDate = loans.map(loan => ({
      ...loan,
      batchDate: batchDate || new Date().toISOString().split('T')[0],
    }));

    await saveHSBCLoans(loansWithBatchDate);

    return NextResponse.json({ success: true, count: loans.length });
  } catch (error) {
    console.error('保存汇丰贷款失败:', error);
    return NextResponse.json({ error: '保存数据失败' }, { status: 500 });
  }
}
