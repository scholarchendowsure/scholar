import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock汇丰统计数据
const mockHsbcStats = {
  totalLoans: 5,
  totalLoanAmount: 12500000,
  totalBalance: 10750000,
  totalOverdueAmount: 500000,
  overdueRate: 4.65,
  activeMerchants: 5,
  overdueMerchants: 3,
  overdueMerchantRate: 60,
  warningAmount: 800000,
  dueIn7Days: 2500000,
  dueIn15Days: 3000000,
  dueIn30Days: 5000000,
  currencyBreakdown: {
    CNY: { loans: 3, amount: 10000000, balance: 8500000, overdue: 250000, overdueMerchants: 1, overdueLoans: 1 },
    USD: { loans: 2, amount: 2500000, balance: 2250000, overdue: 250000, overdueMerchants: 2, overdueLoans: 2 },
  },
  riskBreakdown: {
    low: { days: '0-30', amount: 200000, merchants: 1, loans: 1 },
    medium: { days: '31-60', amount: 250000, merchants: 2, loans: 2 },
    high: { days: '61-90', amount: 50000, merchants: 1, loans: 1 },
    severe: { days: '91-180', amount: 0, merchants: 0, loans: 0 },
    extreme: { days: '181+', amount: 0, merchants: 0, loans: 0 },
  },
  overdueTrend: [
    { batchDate: '2024-01-15', overdueAmount: 400000, balance: 10000000, overdueRate: 4.0 },
    { batchDate: '2024-01-20', overdueAmount: 500000, balance: 10500000, overdueRate: 4.76 },
    { batchDate: '2024-01-25', overdueAmount: 500000, balance: 10750000, overdueRate: 4.65 },
  ],
};

// 获取汇丰仪表盘统计
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchDate = searchParams.get('batchDate');

    // 转换为前端期望的数组格式
    const currencyBreakdown = Object.entries(mockHsbcStats.currencyBreakdown).map(([currency, data]) => ({
      currency,
      loanCount: data.loans,
      totalLoanAmount: data.amount.toString(),
      totalBalance: data.balance.toString(),
      totalPastdue: data.overdue.toString(),
      overdueMerchantCount: data.overdueMerchants.toString(),
    }));

    const approachingMaturity = [
      {
        currency: 'CNY',
        in7DaysCount: '1', in7DaysAmount: '1500000', in7DaysMerchants: '2',
        in15DaysCount: '2', in15DaysAmount: '2000000', in15DaysMerchants: '3',
        in30DaysCount: '3', in30DaysAmount: '3500000', in30DaysMerchants: '4',
        in45DaysCount: '4', in45DaysAmount: '5000000', in45DaysMerchants: '5',
      },
      {
        currency: 'USD',
        in7DaysCount: '0', in7DaysAmount: '1000000', in7DaysMerchants: '1',
        in15DaysCount: '1', in15DaysAmount: '1000000', in15DaysMerchants: '2',
        in30DaysCount: '1', in30DaysAmount: '1500000', in30DaysMerchants: '2',
        in45DaysCount: '2', in45DaysAmount: '2000000', in45DaysMerchants: '3',
      },
    ];

    const riskStats = [
      { riskLabel: '低风险(0-30天)', merchantCount: 1, totalOverdue: '200000', loanCount: '1' },
      { riskLabel: '中风险(31-60天)', merchantCount: 2, totalOverdue: '250000', loanCount: '2' },
      { riskLabel: '高风险(61-90天)', merchantCount: 1, totalOverdue: '50000', loanCount: '1' },
      { riskLabel: '严重风险(91-180天)', merchantCount: 0, totalOverdue: '0', loanCount: '0' },
      { riskLabel: '极高风险(181天+)', merchantCount: 0, totalOverdue: '0', loanCount: '0' },
    ];

    const responseData = {
      totalLoans: mockHsbcStats.totalLoans,
      activeMerchants: mockHsbcStats.activeMerchants,
      totalLoanCNY: formatCurrency(mockHsbcStats.totalLoanAmount),
      totalBalanceCNY: formatCurrency(mockHsbcStats.totalBalance),
      totalPastdueCNY: formatCurrency(mockHsbcStats.totalOverdueAmount),
      overdueRate: `${mockHsbcStats.overdueRate}%`,
      overdueMerchants: mockHsbcStats.overdueMerchants,
      overdueMerchantRate: `${mockHsbcStats.overdueMerchantRate}%`,
      currencyBreakdown,
      approachingMaturity,
      riskStats,
      extensionMerchants: 3,
    };

    if (batchDate) {
      const filteredTrend = mockHsbcStats.overdueTrend.filter(t => t.batchDate === batchDate);
      return NextResponse.json(successResponse({ ...responseData, overdueTrend: filteredTrend }));
    }

    return NextResponse.json(successResponse({ ...responseData, overdueTrend: mockHsbcStats.overdueTrend }));
  } catch (error) {
    console.error('Get HSBC stats error:', error);
    return NextResponse.json(errorResponse('获取汇丰统计数据失败'), { status: 500 });
  }
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}
