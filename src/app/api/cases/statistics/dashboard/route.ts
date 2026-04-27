import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock统计数据
const mockDashboardStats = {
  // 各状态案件数
  statusCounts: {
    pending_assign: { count: 2, label: '待分配', color: 'warning' },
    pending_visit: { count: 2, label: '待外访', color: 'info' },
    following: { count: 3, label: '跟进中', color: 'primary' },
    closed: { count: 1, label: '已结案', color: 'success' },
  },
  totalCases: 8,
  
  // 逾期金额统计
  overdueAmount: 2070000,
  
  // 结案率
  closureRate: 12.5,
  
  // 月度趋势
  monthlyTrend: [
    { month: '2024-01', newCases: 8, closedCases: 1, overdueAmount: 2070000 },
    { month: '2024-02', newCases: 12, closedCases: 3, overdueAmount: 1850000 },
    { month: '2024-03', newCases: 15, closedCases: 5, overdueAmount: 1680000 },
  ],
  
  // 用户绩效排名
  userPerformance: [
    { userId: '1', userName: '张三', assignedCases: 4, closedCases: 1, repaymentAmount: 80000, closureRate: 25 },
    { userId: '2', userName: '李四', assignedCases: 2, closedCases: 0, repaymentAmount: 0, closureRate: 0 },
    { userId: '3', userName: '王五', assignedCases: 1, closedCases: 0, repaymentAmount: 0, closureRate: 0 },
  ],
  
  // 还款状态统计
  repaymentStatus: {
    total: 2070000,
    recovered: 420000,
    pending: 1650000,
    rate: 20.3,
  },
  
  // 贷后数据面板
  postLoanDashboard: {
    totalOverdueBalance: 2070000,
    recoveredAmount: 420000,
    recoveryRate: 20.3,
    dailyTrend: [
      { date: '2024-01-18', overdueAmount: 2070000, recoveredAmount: 50000 },
      { date: '2024-01-19', overdueAmount: 2050000, recoveredAmount: 35000 },
      { date: '2024-01-20', overdueAmount: 2020000, recoveredAmount: 420000 },
    ],
  },
};

// 获取仪表盘统计数据
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'post-loan-overdue') {
      // 贷后人员每日逾期统计
      return NextResponse.json(successResponse({
        users: mockDashboardStats.userPerformance.map(u => ({
          userId: u.userId,
          userName: u.userName,
          overdueAmount: u.assignedCases * 150000,
          dailyOverdue: u.assignedCases * 150000,
        })),
      }));
    }

    if (type === 'post-loan-repayment') {
      // 贷后人员每日还款统计
      return NextResponse.json(successResponse({
        users: mockDashboardStats.userPerformance.map(u => ({
          userId: u.userId,
          userName: u.userName,
          repaymentAmount: u.repaymentAmount,
          recoveryRate: u.closureRate,
        })),
      }));
    }

    if (type === 'post-loan-dashboard') {
      // 贷后数据面板
      return NextResponse.json(successResponse(mockDashboardStats.postLoanDashboard));
    }

    // 默认返回完整仪表盘数据
    return NextResponse.json(successResponse(mockDashboardStats));
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(errorResponse('获取统计数据失败'), { status: 500 });
  }
}
