// 优化后的仪表盘统计 API
import { NextResponse } from 'next/server';
import { getCache } from '@/lib/mock-data';

export async function GET() {
  try {
    // 尝试从缓存获取
    const cached = getCache<unknown>('dashboard_stats');
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // 生成统计数据
    const stats = {
      totalCases: 50,
      statusBreakdown: [
        { status: 'pending_assign', label: '待分配', count: 12, color: '#f59e0b' },
        { status: 'pending_visit', label: '待外访', count: 15, color: '#3b82f6' },
        { status: 'following', label: '跟进中', count: 18, color: '#6366f1' },
        { status: 'closed', label: '已结案', count: 5, color: '#10b981' },
      ],
      closureRate: 10.0,
      totalOverdue: 12500000,
      monthlyTrend: Array.from({ length: 6 }, (_, i) => ({
        month: `${i + 1}月`,
        cases: Math.floor(Math.random() * 20) + 10,
        closed: Math.floor(Math.random() * 10) + 2,
      })),
      userPerformance: [
        { name: '张三', cases: 15, closed: 8, rate: 53.3 },
        { name: '李四', cases: 12, closed: 6, rate: 50.0 },
        { name: '王五', cases: 10, closed: 5, rate: 50.0 },
      ],
      repaymentStats: {
        pending: 8,
        approved: 15,
        rejected: 2,
        total: 25,
      },
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}
