'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PostLoanStats {
  totalOverdue: string;
  totalRepayment: string;
  repaymentRate: string;
  dailyTrend: Array<{
    date: string;
    overdue: number;
    repayment: number;
  }>;
  userPerformance: Array<{
    userId: string;
    userName: string;
    totalCases: number;
    closedCases: number;
    closedRate: string;
    totalRepayment: string;
  }>;
}

export default function PostLoanStatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PostLoanStats | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/statistics/post-loan-dashboard?range=${dateRange}`);
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      toast.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">贷后统计</h1>
          <p className="text-muted-foreground mt-1">逾期与还款统计面板</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="h-10 px-3 border rounded bg-background text-sm"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总逾期余额
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-[hsl(0,75%,50%)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-data text-[hsl(0,75%,50%)]">
                {formatCurrency(stats?.totalOverdue)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">当前总逾期未还款金额</p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本期催回金额
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[hsl(145,65%,38%)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-data text-[hsl(145,65%,38%)]">
                {formatCurrency(stats?.totalRepayment)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              催回率 {stats?.repaymentRate || '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              催回率
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[hsl(210,95%,40%)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.repaymentRate || '0%'}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">催回金额 / 逾期金额</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[hsl(210,95%,40%)]" />
            每日逾期与还款趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.dailyTrend || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,20%,88%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0,0%,100%)',
                      border: '1px solid hsl(220,20%,88%)',
                      borderRadius: '2px',
                    }}
                    formatter={(value: number) => [formatCurrency(value.toString()), '']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="overdue"
                    stroke="hsl(0,75%,50%)"
                    fill="hsl(0,75%,50%)"
                    fillOpacity={0.1}
                    name="逾期金额"
                  />
                  <Area
                    type="monotone"
                    dataKey="repayment"
                    stroke="hsl(145,65%,38%)"
                    fill="hsl(145,65%,38%)"
                    fillOpacity={0.1}
                    name="催回金额"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Performance */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[hsl(210,95%,40%)]" />
            贷后人员绩效排名
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">排名</th>
                  <th className="text-left py-3 px-4 font-medium">姓名</th>
                  <th className="text-right py-3 px-4 font-medium">案件总数</th>
                  <th className="text-right py-3 px-4 font-medium">结案数</th>
                  <th className="text-right py-3 px-4 font-medium">结案率</th>
                  <th className="text-right py-3 px-4 font-medium">催回金额</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-8" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : stats?.userPerformance?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  stats?.userPerformance?.map((user, index) => (
                    <tr key={user.userId} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4">
                        <Badge
                          variant={index === 0 ? 'default' : 'outline'}
                          className={index === 0 ? 'bg-[hsl(210,95%,40%)] text-white' : ''}
                        >
                          {index + 1}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{user.userName}</td>
                      <td className="py-3 px-4 text-right font-data">{user.totalCases}</td>
                      <td className="py-3 px-4 text-right font-data">{user.closedCases}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={parseFloat(user.closedRate) >= 80 ? 'default' : 'outline'}
                          className={
                            parseFloat(user.closedRate) >= 80
                              ? 'bg-[hsl(145,65%,38%)] text-white'
                              : ''
                          }
                        >
                          {user.closedRate}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-data text-[hsl(145,65%,38%)]">
                        {formatCurrency(user.totalRepayment)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
