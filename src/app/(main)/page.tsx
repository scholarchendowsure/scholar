'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { CASE_STATUS_CONFIG } from '@/lib/constants';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface DashboardStats {
  totalCases: number;
  statusBreakdown: Array<{
    status: string;
    label: string;
    count: number;
    color: string;
  }>;
  closureRate: number;
  totalOverdue: number;
  monthlyTrend: Array<{
    month: string;
    cases: number;
    closed: number;
  }>;
  userPerformance: Array<{
    name: string;
    cases: number;
    closed: number;
    rate: number;
  }>;
}

const CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/cases/statistics/dashboard');
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (error) {
        console.error('获取统计失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-500">加载失败</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
          <p className="text-slate-500 mt-1">贷后案件管理数据概览</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">总案件数</CardTitle>
              <FileText className="w-5 h-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalCases}</div>
              <p className="text-xs text-slate-500 mt-1">较上月 +12%</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">结案率</CardTitle>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.closureRate}%</div>
              <p className="text-xs text-slate-500 mt-1">已完成 {stats.statusBreakdown.find(s => s.status === 'closed')?.count || 0} 件</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">待处理</CardTitle>
              <Clock className="w-5 h-5 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {(stats.statusBreakdown.find(s => s.status === 'pending_assign')?.count || 0) +
                 (stats.statusBreakdown.find(s => s.status === 'pending_visit')?.count || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">待分配 + 待外访</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600">逾期总额</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(stats.totalOverdue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">需重点关注</p>
            </CardContent>
          </Card>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 案件状态分布 */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">案件状态分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.statusBreakdown.map((entry, index) => (
                        <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, '案件数']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {stats.statusBreakdown.map((item, index) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <Badge variant="secondary" className="font-mono">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 月度趋势 */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">月度趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="cases" name="新增案件" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="closed" name="结案数" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 用户绩效 */}
          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">外访员绩效排名</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.userPerformance}
                    layout="vertical"
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="cases" name="负责案件" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="closed" name="已完成" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {stats.userPerformance.map((user) => (
                  <div
                    key={user.name}
                    className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{user.name}</span>
                    <Badge variant="outline" className="font-mono">
                      {user.rate}% 完成率
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
