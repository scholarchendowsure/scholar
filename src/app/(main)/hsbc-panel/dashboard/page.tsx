'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Info,
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

interface HSBCStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanCNY: string;
  totalBalanceCNY: string;
  totalPastdueCNY: string;
  overdueRate: string;
  overdueMerchants: number;
  overdueMerchantRate: string;
  currencyBreakdown: Array<{
    currency: string;
    loanCount: number;
    totalLoanAmount: string;
    totalBalance: string;
    totalPastdue: string;
    overdueMerchantCount: string;
  }>;
  approachingMaturity: Array<{
    currency: string;
    in7DaysCount: string;
    in7DaysAmount: string;
    in7DaysMerchants: string;
    in15DaysCount: string;
    in15DaysAmount: string;
    in15DaysMerchants: string;
    in30DaysCount: string;
    in30DaysAmount: string;
    in30DaysMerchants: string;
    in45DaysCount: string;
    in45DaysAmount: string;
    in45DaysMerchants: string;
  }>;
  riskStats: Array<{
    riskLabel: string;
    merchantCount: number;
    totalOverdue: string;
    loanCount: string;
  }>;
  extensionMerchants: number;
}

export default function HSBCDashboardPage() {
  const [stats, setStats] = useState<HSBCStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [batchDates, setBatchDates] = useState<Array<{ batchDate: string; count: number }>>([]);

  useEffect(() => {
    fetchBatchDates();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedBatch]);

  const fetchBatchDates = async () => {
    try {
      const res = await fetch('/api/hsbc/batch-dates');
      const data = await res.json();
      if (data.success) {
        setBatchDates(data.data || []);
        if (data.data.length > 0) {
          setSelectedBatch(data.data[0].batchDate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch batch dates:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = selectedBatch ? `?batchDate=${selectedBatch}` : '';
      const res = await fetch(`/api/hsbc/stats${params}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch HSBC stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const riskLabelConfig: Record<string, { label: string; color: string }> = {
    '低风险(0-30天)': { label: '低风险', color: 'hsl(145 65% 38%)' },
    '中风险(31-60天)': { label: '中风险', color: 'hsl(35 90% 45%)' },
    '高风险(61-90天)': { label: '高风险', color: 'hsl(30 80% 50%)' },
    '严重风险(91-180天)': { label: '严重风险', color: 'hsl(0 75% 50%)' },
    '极高风险(181天+)': { label: '极高风险', color: 'hsl(0 60% 40%)' },
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-60" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">汇丰贷款仪表盘</h1>
          <Badge variant="outline" className="text-sm">
            批次: {selectedBatch || '全部'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="h-10 px-3 border rounded bg-background text-sm"
          >
            <option value="">全部批次</option>
            {batchDates.map((bd) => (
              <option key={bd.batchDate} value={bd.batchDate}>
                {bd.batchDate} ({bd.count})
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总贷款笔数
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-data">{stats?.totalLoans?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              在贷商户 {stats?.activeMerchants?.toLocaleString()} 家
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              在贷余额
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[hsl(210,95%,40%)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-data text-[hsl(210,95%,40%)]">
              {formatCurrency(stats?.totalBalanceCNY)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              累计放款 {formatCurrency(stats?.totalLoanCNY)}
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
            <div className="text-2xl font-bold font-data text-[hsl(0,75%,50%)]">
              {formatCurrency(stats?.totalPastdueCNY)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              逾期率 {stats?.overdueRate} | 商户占比 {stats?.overdueMerchantRate}
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              逾期商户
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[hsl(35,90%,45%)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overdueMerchants?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {stats?.activeMerchants?.toLocaleString()} 家在贷商户
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Currency Breakdown */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">币种细分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">币种</th>
                  <th className="text-right py-3 px-4 font-medium">贷款笔数</th>
                  <th className="text-right py-3 px-4 font-medium">贷款金额</th>
                  <th className="text-right py-3 px-4 font-medium">余额</th>
                  <th className="text-right py-3 px-4 font-medium">逾期金额</th>
                  <th className="text-right py-3 px-4 font-medium">逾期商户数</th>
                </tr>
              </thead>
              <tbody>
                {stats?.currencyBreakdown?.map((item) => (
                  <tr key={item.currency} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <Badge variant={item.currency === 'CNY' ? 'default' : 'secondary'}>
                        {item.currency}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-data">{item.loanCount}</td>
                    <td className="py-3 px-4 text-right font-data">
                      {item.currency === 'CNY' 
                        ? formatCurrency(item.totalLoanAmount)
                        : `$${parseFloat(item.totalLoanAmount).toLocaleString()}`
                      }
                    </td>
                    <td className="py-3 px-4 text-right font-data">
                      {item.currency === 'CNY' 
                        ? formatCurrency(item.totalBalance)
                        : `$${parseFloat(item.totalBalance).toLocaleString()}`
                      }
                    </td>
                    <td className="py-3 px-4 text-right font-data text-[hsl(0,75%,50%)]">
                      {item.currency === 'CNY' 
                        ? formatCurrency(item.totalPastdue)
                        : `$${parseFloat(item.totalPastdue).toLocaleString()}`
                      }
                    </td>
                    <td className="py-3 px-4 text-right font-data">{item.overdueMerchantCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approaching Maturity */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">临近到期提醒</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { days: '7天', key: 'in7Days', color: 'hsl(0,75%,50%)' },
              { days: '15天', key: 'in15Days', color: 'hsl(35,90%,45%)' },
              { days: '30天', key: 'in30Days', color: 'hsl(35,90%,45%)' },
              { days: '45天', key: 'in45Days', color: 'hsl(210,70%,50%)' },
            ].map((item) => (
              <div key={item.days} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.days}内到期</span>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  {stats?.approachingMaturity?.map((ap) => (
                    <div key={ap.currency} className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{ap.currency}</Badge>
                      <span className="font-data">
                        {ap[`${item.key}Count` as keyof typeof ap]}笔 /{' '}
                        {ap.currency === 'CNY' 
                          ? formatCurrency(ap[`${item.key}Amount` as keyof typeof ap] as string)
                          : `$${parseFloat(ap[`${item.key}Amount` as keyof typeof ap] as string).toLocaleString()}`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">风险评定统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.riskStats?.map((r) => ({
                  ...r,
                  label: riskLabelConfig[r.riskLabel]?.label || r.riskLabel,
                  color: riskLabelConfig[r.riskLabel]?.color || 'hsl(220,20%,88%)',
                })) || []}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,20%,88%)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0,0%,100%)',
                    border: '1px solid hsl(220,20%,88%)',
                    borderRadius: '2px',
                  }}
                  formatter={(value: number) => [formatCurrency(value.toString()), '逾期金额']}
                />
                <Bar
                  dataKey="totalOverdue"
                  name="逾期金额"
                  radius={[2, 2, 0, 0]}
                >
                  {stats?.riskStats?.map((entry, index) => (
                    <rect key={index} fill={riskLabelConfig[entry.riskLabel]?.color || 'hsl(220,20%,88%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {stats?.riskStats?.map((item) => (
              <div key={item.riskLabel} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: riskLabelConfig[item.riskLabel]?.color }}
                />
                <span className="text-sm">{riskLabelConfig[item.riskLabel]?.label}:</span>
                <span className="text-sm font-medium">{item.merchantCount} 商户</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extension Merchants */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">展期商户</CardTitle>
            <Badge variant="outline">{stats?.extensionMerchants || 0} 家</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            展期商户不计入逾期统计，请至「汇丰案件列表」进行管理。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
