// 优化后的汇丰统计 API
import { NextRequest, NextResponse } from 'next/server';
import { getMockHSBCLoans, getCache } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchDate = searchParams.get('batchDate');

    // 尝试从缓存获取
    const cacheKey = `hsbc_stats_${batchDate || 'all'}`;
    const cached = getCache<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const loans = getMockHSBCLoans() as Array<{
      id: string;
      loanCurrency: string;
      loanAmount: string;
      balance: string;
      pastdueAmount: string;
      merchantId: string;
    }>;

    // 筛选批次日期
    let filteredLoans = loans;
    if (batchDate && batchDate !== 'all') {
      filteredLoans = loans.filter(l => l.batchDate === batchDate);
    }

    // 统计计算
    const totalLoans = filteredLoans.length;
    const totalLoanCNY = filteredLoans.reduce((sum, l) => {
      return sum + (l.loanCurrency === 'USD' ? parseFloat(l.loanAmount) * 7 : parseFloat(l.loanAmount));
    }, 0);
    const totalBalanceCNY = filteredLoans.reduce((sum, l) => {
      return sum + (l.loanCurrency === 'USD' ? parseFloat(l.balance) * 7 : parseFloat(l.balance));
    }, 0);
    const totalPastdueCNY = filteredLoans.reduce((sum, l) => {
      return sum + (l.loanCurrency === 'USD' ? parseFloat(l.pastdueAmount) * 7 : parseFloat(l.pastdueAmount));
    }, 0);

    // 币种细分 - 使用数组格式
    const cnyLoans = filteredLoans.filter(l => l.loanCurrency === 'CNY');
    const usdLoans = filteredLoans.filter(l => l.loanCurrency === 'USD');

    const currencyBreakdown = [
      {
        currency: 'CNY',
        loanCount: cnyLoans.length,
        totalLoanAmount: cnyLoans.reduce((sum, l) => sum + parseFloat(l.loanAmount), 0),
        totalBalance: cnyLoans.reduce((sum, l) => sum + parseFloat(l.balance), 0),
        totalPastdue: cnyLoans.reduce((sum, l) => sum + parseFloat(l.pastdueAmount), 0),
        overdueMerchantCount: new Set(cnyLoans.filter(l => parseFloat(l.pastdueAmount) > 0).map(l => l.merchantId)).size,
      },
      {
        currency: 'USD',
        loanCount: usdLoans.length,
        totalLoanAmount: usdLoans.reduce((sum, l) => sum + parseFloat(l.loanAmount), 0),
        totalBalance: usdLoans.reduce((sum, l) => sum + parseFloat(l.balance), 0),
        totalPastdue: usdLoans.reduce((sum, l) => sum + parseFloat(l.pastdueAmount), 0),
        overdueMerchantCount: new Set(usdLoans.filter(l => parseFloat(l.pastdueAmount) > 0).map(l => l.merchantId)).size,
      },
    ];

    // 逾期商户
    const overdueLoans = filteredLoans.filter(l => parseFloat(l.pastdueAmount) > 0);
    const overdueMerchants = new Set(overdueLoans.map(l => l.merchantId));

    const stats = {
      totalLoans,
      activeMerchants: new Set(filteredLoans.map(l => l.merchantId)).size,
      totalLoanCNY,
      totalBalanceCNY,
      totalPastdueCNY,
      overdueRate: totalBalanceCNY > 0 ? (totalPastdueCNY / totalBalanceCNY * 100).toFixed(2) : '0',
      overdueMerchants: overdueMerchants.size,
      overdueMerchantRate: ((overdueMerchants.size / new Set(filteredLoans.map(l => l.merchantId)).size) * 100).toFixed(2),
      currencyBreakdown,
      approachingMaturity: [
        {
          currency: 'CNY',
          in7DaysCount: 1, in7DaysAmount: 1500000, in7DaysMerchants: 2,
          in15DaysCount: 2, in15DaysAmount: 2000000, in15DaysMerchants: 3,
          in30DaysCount: 3, in30DaysAmount: 3500000, in30DaysMerchants: 4,
          in45DaysCount: 4, in45DaysAmount: 5000000, in45DaysMerchants: 5,
        },
        {
          currency: 'USD',
          in7DaysCount: 0, in7DaysAmount: 1000000, in7DaysMerchants: 1,
          in15DaysCount: 1, in15DaysAmount: 1000000, in15DaysMerchants: 2,
          in30DaysCount: 1, in30DaysAmount: 1500000, in30DaysMerchants: 2,
          in45DaysCount: 2, in45DaysAmount: 2000000, in45DaysMerchants: 3,
        },
      ],
      riskStats: [
        { riskLabel: '低风险(0-30天)', merchantCount: 1, totalOverdue: 200000, loanCount: 1 },
        { riskLabel: '中风险(31-60天)', merchantCount: 2, totalOverdue: 250000, loanCount: 2 },
        { riskLabel: '高风险(61-90天)', merchantCount: 1, totalOverdue: 50000, loanCount: 1 },
        { riskLabel: '严重风险(91-180天)', merchantCount: 0, totalOverdue: 0, loanCount: 0 },
        { riskLabel: '极高风险(181天+)', merchantCount: 0, totalOverdue: 0, loanCount: 0 },
      ],
      extensionMerchants: 3,
      overdueTrend: [
        { batchDate: '2024-01-15', overdueAmount: 400000, balance: 10000000, overdueRate: 4 },
        { batchDate: '2024-01-20', overdueAmount: 500000, balance: 10500000, overdueRate: 4.76 },
        { batchDate: '2024-01-25', overdueAmount: 500000, balance: 10750000, overdueRate: 4.65 },
      ],
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取汇丰统计失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}
