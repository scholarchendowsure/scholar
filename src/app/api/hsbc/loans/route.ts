import { NextRequest, NextResponse } from 'next/server';
import { filterLoans, HSBCLoan, HSBCLoanFilter, generateSampleLoans } from '@/lib/hsbc-loan';

// 全局缓存
let cachedLoans: HSBCLoan[] | null = null;

// 获取缓存的贷款数据
function getCachedLoans(): HSBCLoan[] {
  if (!cachedLoans) {
    cachedLoans = generateSampleLoans();
  }
  return cachedLoans;
}

// 设置缓存的贷款数据
function setCachedLoans(loans: HSBCLoan[]): void {
  cachedLoans = loans;
}

// 获取汇丰贷款列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filter: HSBCLoanFilter = {
      search: searchParams.get('search') || undefined,
      merchantId: searchParams.get('merchantId') || undefined,
      currency: (searchParams.get('currency') as 'CNY' | 'USD' | 'all') || 'all',
      status: (searchParams.get('status') as 'all' | 'active' | 'settled' | 'overdue') || 'all',
      hasOverdue: searchParams.get('hasOverdue') === 'true',
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    };

    let loans = getCachedLoans();

    // 应用筛选
    let filteredLoans = filterLoans(loans, filter);

    // 分页
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;
    const total = filteredLoans.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedLoans = filteredLoans.slice(startIndex, startIndex + pageSize);

    // 按商户分组
    const merchantMap = new Map<string, {
      merchantId: string;
      merchantName: string;
      loanCount: number;
      totalAmount: number;
      totalBalance: number;
      overdueAmount: number;
      overdueCount: number;
      loans: HSBCLoan[];
    }>();

    paginatedLoans.forEach(loan => {
      const key = loan.merchantId;
      if (!merchantMap.has(key)) {
        merchantMap.set(key, {
          merchantId: loan.merchantId,
          merchantName: loan.borrowerName,
          loanCount: 0,
          totalAmount: 0,
          totalBalance: 0,
          overdueAmount: 0,
          overdueCount: 0,
          loans: [],
        });
      }
      const group = merchantMap.get(key)!;
      group.loanCount++;
      group.totalAmount += loan.loanAmount;
      group.totalBalance += loan.balance;
      group.overdueAmount += loan.pastdueAmount;
      if (loan.pastdueAmount > 0) group.overdueCount++;
      group.loans.push(loan);
    });

    return NextResponse.json({
      loans: paginatedLoans,
      merchants: Array.from(merchantMap.values()),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching HSBC loans:', error);
    return NextResponse.json(
      { error: '获取数据失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 导入贷款数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loans, mode } = body;

    if (!loans || !Array.isArray(loans)) {
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 });
    }

    const existingLoans = getCachedLoans();
    
    if (mode === 'replace') {
      // 覆盖模式
      cachedLoans = loans;
    } else {
      // 增量模式
      const existingRefs = new Set(existingLoans.map(l => l.loanReference));
      const newLoans = loans.filter(l => !existingRefs.has(l.loanReference));
      cachedLoans = [...existingLoans, ...newLoans];
    }

    return NextResponse.json({
      success: true,
      total: cachedLoans.length,
      imported: loans.length,
      message: mode === 'replace' ? '数据已覆盖' : `成功导入 ${loans.length} 条新数据`,
    });
  } catch (error: any) {
    console.error('Error importing HSBC loans:', error);
    return NextResponse.json(
      { error: '导入失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 清除所有数据
export async function DELETE() {
  cachedLoans = [];
  return NextResponse.json({ success: true, message: '已清除所有数据' });
}
