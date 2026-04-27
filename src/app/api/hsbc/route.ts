import { NextResponse } from 'next/server';
import { getMockHSBCLoans, getMockHSBCStats } from '@/lib/hsbc-data';

// 汇丰贷款列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    const currency = searchParams.get('currency');
    const merchantId = searchParams.get('merchantId');
    const search = searchParams.get('search');

    let loans = getMockHSBCLoans();

    // 应用筛选
    if (currency) {
      loans = loans.filter(l => l.loanCurrency === currency);
    }
    if (merchantId) {
      loans = loans.filter(l => l.merchantId === merchantId);
    }
    if (search) {
      const term = search.toLowerCase();
      loans = loans.filter(l => 
        l.loanReference.toLowerCase().includes(term) ||
        l.borrowerName.toLowerCase().includes(term) ||
        l.merchantId.includes(term)
      );
    }

    // 分页
    const total = loans.length;
    const start = (page - 1) * pageSize;
    const paginatedLoans = loans.slice(start, start + pageSize);

    return NextResponse.json({
      loans: paginatedLoans,
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
