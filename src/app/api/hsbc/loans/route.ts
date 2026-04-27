import { NextRequest, NextResponse } from 'next/server';
import { getLoansByBatchDate, getAllLoans, getLatestBatchDate } from '@/lib/hsbc-data';

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
    let loans;
    if (batchDate) {
      loans = getLoansByBatchDate(batchDate);
    } else {
      // 默认获取最新批次的数据
      const latestDate = getLatestBatchDate();
      loans = latestDate ? getLoansByBatchDate(latestDate) : getAllLoans();
    }

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
