'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { HSBC_RISK_LABELS } from '@/lib/constants';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Download,
  RefreshCw,
  CreditCard,
  Clock,
  Shield,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface CurrencyBreakdown {
  currency: string;
  loanCount: number;
  totalLoanAmount: number;
  totalBalance: number;
  totalPastdue: number;
  overdueMerchantCount: number;
}

interface ApproachingMaturity {
  currency: string;
  in7DaysCount: number;
  in7DaysAmount: number;
  in7DaysMerchants: number;
  in15DaysCount: number;
  in15DaysAmount: number;
  in15DaysMerchants: number;
  in30DaysCount: number;
  in30DaysAmount: number;
  in30DaysMerchants: number;
  in45DaysCount: number;
  in45DaysAmount: number;
  in45DaysMerchants: number;
}

interface RiskStat {
  riskLabel: string;
  merchantCount: number;
  totalOverdue: number;
  loanCount: number;
}

interface OverdueTrend {
  batchDate: string;
  overdueAmount: number;
  balance: number;
  overdueRate: number;
}

interface HSBCStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanCNY: number;
  totalBalanceCNY: number;
  totalPastdueCNY: number;
  overdueRate: string;
  overdueMerchants: number;
  overdueMerchantRate: string;
  currencyBreakdown: CurrencyBreakdown[];
  approachingMaturity: ApproachingMaturity[];
  riskStats: RiskStat[];
  extensionMerchants: number;
  overdueTrend: OverdueTrend[];
}

const RISK_COLORS: Record<string, string> = {
  '低风险(0-30天)': '#10b981',
  '中风险(31-60天)': '#f59e0b',
  '高风险(61-90天)': '#f97316',
  '严重风险(91-180天)': '#ef4444',
  '极高风险(181天+)': '#dc2626',
};

export default function HSBCDashboardPage() {
  const [stats, setStats] = useState<HSBCStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchDate, setBatchDate] = useState<string>('all');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ ...(batchDate !== 'all' && { batchDate }) });
        const res = await fetch(`/api/hsbc/stats?${params}`);
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (error) {
        console.error('获取汇丰统计失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [batchDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
          ))}
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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">汇丰贷款管理</h1>
            <p className="text-slate-500 mt-1">数据仪表盘</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={batchDate} onValueChange={setBatchDate}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择批次日期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部批次</SelectItem>
                <SelectItem value="2024-01">2024年1月</SelectItem>
                <SelectItem value="2024-02">2024年2月</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Download className="w-4 h-4" />
              导出Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">贷款笔数</CardTitle>
              <CreditCard className="w-5 h-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{stats.totalLoans}</div>
              <p className="text-xs text-slate-500 mt-1">活跃商户 {stats.activeMerchants}</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">在贷余额</CardTitle>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{formatCurrency(stats.totalBalanceCNY)}</div>
              <p className="text-xs text-slate-500 mt-1">累计放款 {formatCurrency(stats.totalLoanCNY)}</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600">逾期总额</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-red-600">{formatCurrency(stats.totalPastdueCNY)}</div>
              <p className="text-xs text-slate-500 mt-1">逾期率 {stats.overdueRate}%</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">逾期商户</CardTitle>
              <Building2 className="w-5 h-5 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.overdueMerchants}</div>
              <p className="text-xs text-slate-500 mt-1">占比 {stats.overdueMerchantRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* 币种细分 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.currencyBreakdown.map((item) => (
            <Card key={item.currency} className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    item.currency === 'CNY' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.currency}
                  </span>
                  贷款明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">笔数</p>
                    <p className="text-xl font-bold font-mono">{item.loanCount}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">贷款金额</p>
                    <p className="text-xl font-bold font-mono">{formatCurrency(item.totalLoanAmount, false)}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">余额</p>
                    <p className="text-xl font-bold font-mono">{formatCurrency(item.totalBalance, false)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-500">逾期金额</p>
                    <p className="text-xl font-bold font-mono text-red-600">{formatCurrency(item.totalPastdue, false)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-500">逾期商户</p>
                    <p className="text-xl font-bold font-mono text-red-600">{item.overdueMerchantCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 逾期趋势图 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-400" />
              逾期趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.overdueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="batchDate" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'overdueAmount' ? formatCurrency(value) : `${value}%`,
                      name === 'overdueAmount' ? '逾期金额' : '逾期率'
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="overdueAmount" name="逾期金额" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                  <Line yAxisId="right" type="monotone" dataKey="overdueRate" name="逾期率" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 风险评定 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              风险评定统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.riskStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="riskLabel" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'totalOverdue' ? '逾期金额' : name === 'merchantCount' ? '商户数' : '笔数'
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="totalOverdue" name="逾期金额" radius={[4, 4, 0, 0]}>
                    {stats.riskStats.map((entry) => (
                      <rect key={entry.riskLabel} fill={RISK_COLORS[entry.riskLabel] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {stats.riskStats.map((item) => (
                <Badge
                  key={item.riskLabel}
                  className="px-3 py-1"
                  style={{ backgroundColor: RISK_COLORS[item.riskLabel] + '20', color: RISK_COLORS[item.riskLabel] }}
                >
                  {item.riskLabel}: {item.merchantCount}商户 / {formatCurrency(item.totalOverdue, false)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
