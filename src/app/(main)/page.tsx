'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import {
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface DashboardStats {
  statusCount: {
    pending_assign: number;
    pending_visit: number;
    following: number;
    closed: number;
  };
  closureRate: string;
  totalOverdue: string;
  totalDebt: string;
  monthlyNewCases: number;
  monthlyClosedCases: number;
  userStats: Array<{
    userId: string | null;
    userName: string | null;
    totalCases: number;
    closedCases: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    newCases: number;
    closedCases: number;
  }>;
}

const statusConfig = [
  { key: 'pending_assign', label: '待分配', color: 'hsl(35 90% 45%)' },
  { key: 'pending_visit', label: '待外访', color: 'hsl(210 70% 50%)' },
  { key: 'following', label: '跟进中', color: 'hsl(210 95% 40%)' },
  { key: 'closed', label: '已结案', color: 'hsl(145 65% 38%)' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/cases/statistics/dashboard');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalCases = stats
    ? Object.values(stats.statusCount).reduce((a, b) => a + b, 0)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">仪表盘</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <Badge variant="outline" className="text-sm">
          数据更新: {new Date().toLocaleDateString('zh-CN')}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              案件总数
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-data">{totalCases.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              本月新增 {stats?.monthlyNewCases || 0} 件
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              结案率
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-[hsl(145,65%,38%)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(145,65%,38%)]">
              {stats?.closureRate || '0%'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              本月结案 {stats?.monthlyClosedCases || 0} 件
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              逾期总额
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-[hsl(0,75%,50%)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-data">
              {formatCurrency(stats?.totalOverdue || '0')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              欠款总额 {formatCurrency(stats?.totalDebt || '0')}
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              跟进中
            </CardTitle>
            <Clock className="h-4 w-4 text-[hsl(210,95%,40%)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(210,95%,40%)]">
              {stats?.statusCount?.following || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              待外访 {stats?.statusCount?.pending_visit || 0} 件
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">月度趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.monthlyTrend || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210,95%,40%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(210,95%,40%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(145,65%,38%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(145,65%,38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,20%,88%)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0,0%,100%)',
                      border: '1px solid hsl(220,20%,88%)',
                      borderRadius: '2px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="newCases"
                    stroke="hsl(210,95%,40%)"
                    fillOpacity={1}
                    fill="url(#colorNew)"
                    name="新增案件"
                  />
                  <Area
                    type="monotone"
                    dataKey="closedCases"
                    stroke="hsl(145,65%,38%)"
                    fillOpacity={1}
                    fill="url(#colorClosed)"
                    name="结案案件"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Case Status */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">案件状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusConfig.map((item) => {
                const count = stats?.statusCount[item.key as keyof typeof stats.statusCount] || 0;
                const percentage = totalCases > 0 ? ((count / totalCases) * 100).toFixed(1) : '0';
                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="font-data tabular-nums">
                        {count} 件 ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Performance */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">外访员绩效排名</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.userStats?.slice(0, 10) || []}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,20%,88%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="userName"
                  type="category"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0,0%,100%)',
                    border: '1px solid hsl(220,20%,88%)',
                    borderRadius: '2px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalCases"
                  fill="hsl(210,95%,40%)"
                  name="负责案件"
                  radius={[0, 2, 2, 0]}
                />
                <Bar
                  dataKey="closedCases"
                  fill="hsl(145,65%,38%)"
                  name="已结案"
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
