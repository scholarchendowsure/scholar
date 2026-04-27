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

    if (batchDate) {
      // 按批次日期筛选
      const filteredTrend = mockHsbcStats.overdueTrend.filter(t => t.batchDate === batchDate);
      return NextResponse.json(successResponse({
        ...mockHsbcStats,
        overdueTrend: filteredTrend,
      }));
    }

    return NextResponse.json(successResponse(mockHsbcStats));
  } catch (error) {
    console.error('Get HSBC stats error:', error);
    return NextResponse.json(errorResponse('获取汇丰统计数据失败'), { status: 500 });
  }
}
