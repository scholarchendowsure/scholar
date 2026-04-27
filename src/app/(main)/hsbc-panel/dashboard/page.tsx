'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Banknote, Building2, AlertTriangle, TrendingUp, 
  DollarSign, Percent, Calendar, Activity,
  ArrowUpRight, ArrowDownRight, FileSpreadsheet, Upload
} from 'lucide-react';
import { toast } from 'sonner';

interface HSBCStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number;
  totalPastdueAmount: number;
  overdueRate: number;
  overdueMerchantRate: number;
  warningAmount: number;
  approachingMaturityAmount: number;
  currencyBreakdown: Array<{
    currency: string;
    loanCount: number;
    totalAmount: number;
    overdueAmount: number;
    balance: number;
    overdueMerchantCount: number;
    overdueLoanCount: number;
  }>;
  approachingMaturity: Array<{
    daysRange: string;
    days: number;
    cnyAmount: number;
    cnyMerchants: number;
    usdAmount: number;
    usdMerchants: number;
  }>;
  overdueTrend: Array<{
    batchDate: string;
    overdueAmount: number;
    balance: number;
    overdueRate: number;
  }>;
  riskAssessment: Array<{
    riskLevel: string;
    overdueAmount: number;
    merchantCount: number;
    loanCount: number;
  }>;
}

const RISK_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'];

function formatCurrency(amount: number, currency: string = 'CNY'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export default function HSBCDashboardPage() {
  const [stats, setStats] = useState<HSBCStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchDate, setBatchDate] = useState<string>('all');
  const [batchDates, setBatchDates] = useState<string[]>([]);

  useEffect(() => {
    fetchBatchDates();
    fetchStats();
  }, [batchDate]);

  const fetchBatchDates = async () => {
    try {
      const res = await fetch('/api/hsbc/batch-dates');
      const data = await res.json();
      setBatchDates(data.dates || []);
    } catch (error) {
      console.error('Failed to fetch batch dates:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const url = batchDate === 'all' 
        ? '/api/hsbc/stats' 
        : `/api/hsbc/stats?batchDate=${batchDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">汇丰贷款仪表盘</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">汇丰贷款仪表盘</h1>
          <p className="text-sm text-slate-500 mt-1">实时监控汇丰贷款业务数据</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={batchDate} onValueChange={setBatchDate}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="选择批次日期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部批次</SelectItem>
              {batchDates.map(date => (
                <SelectItem key={date} value={date}>{date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">总贷款笔数</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{stats.totalLoans}</p>
                <p className="text-xs text-blue-500 mt-1">笔</p>
              </div>
              <div className="p-3 bg-blue-200/50 rounded-xl">
                <Banknote className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">在贷余额</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1 truncate" title={formatCurrency(stats.totalBalance)}>
                  {formatCurrency(stats.totalBalance)}
                </p>
                <p className="text-xs text-emerald-500 mt-1">CNY</p>
              </div>
              <div className="p-3 bg-emerald-200/50 rounded-xl">
                <Building2 className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">逾期总额</p>
                <p className="text-2xl font-bold text-amber-800 mt-1 truncate" title={formatCurrency(stats.totalPastdueAmount)}>
                  {formatCurrency(stats.totalPastdueAmount)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-amber-600 font-medium">
                    {stats.overdueRate}%
                  </span>
                  <span className="text-xs text-amber-500">逾期率</span>
                </div>
              </div>
              <div className="p-3 bg-amber-200/50 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">在贷商户</p>
                <p className="text-3xl font-bold text-purple-800 mt-1">{stats.activeMerchants}</p>
                <p className="text-xs text-purple-500 mt-1">
                  逾期 {stats.overdueMerchantRate}%
                </p>
              </div>
              <div className="p-3 bg-purple-200/50 rounded-xl">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 币种细分 */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-slate-600" />
            币种细分统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">币种</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">贷款笔数</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">累计放款</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">在贷余额</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">逾期金额</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">逾期商户</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">逾期笔数</th>
                </tr>
              </thead>
              <tbody>
                {stats.currencyBreakdown.map((item) => (
                  <tr key={item.currency} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={item.currency === 'CNY' ? 'text-blue-600 border-blue-300' : 'text-amber-600 border-amber-300'}>
                        {item.currency}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 font-mono">{item.loanCount}</td>
                    <td className="text-right py-3 px-4 font-mono text-slate-700">
                      {formatCurrency(item.totalAmount, item.currency)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-slate-700">
                      {formatCurrency(item.balance, item.currency)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-amber-600 font-medium">
                      {formatCurrency(item.overdueAmount, item.currency)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">{item.overdueMerchantCount}</td>
                    <td className="text-right py-3 px-4 font-mono">{item.overdueLoanCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 逾期趋势 */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-600" />
              逾期趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.overdueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="batchDate" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="overdueAmount" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="逾期金额" />
                  <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="在贷余额" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 风险评估分布 */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-600" />
              风险评估分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.riskAssessment}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="overdueAmount"
                    nameKey="riskLevel"
                  >
                    {stats.riskAssessment.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 临近到期 */}
        <Card className="bg-white border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              临近到期统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.approachingMaturity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="daysRange" tick={{ fontSize: 12 }} stroke="#64748b" width={60} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="cnyAmount" fill="#3b82f6" name="CNY" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="usdAmount" fill="#f59e0b" name="USD" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 风险评估详情表 */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            风险等级详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">风险等级</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">逾期金额</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">商户数</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">笔数</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">占比</th>
                </tr>
              </thead>
              <tbody>
                {stats.riskAssessment.map((item, index) => {
                  const totalOverdue = stats.riskAssessment.reduce((sum, r) => sum + r.overdueAmount, 0);
                  const percentage = totalOverdue > 0 ? (item.overdueAmount / totalOverdue * 100).toFixed(1) : '0';
                  return (
                    <tr key={item.riskLevel} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <Badge style={{ backgroundColor: RISK_COLORS[index], borderColor: RISK_COLORS[index] }} className="text-white">
                          {item.riskLevel}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-slate-700">
                        {formatCurrency(item.overdueAmount)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono">{item.merchantCount}</td>
                      <td className="text-right py-3 px-4 font-mono">{item.loanCount}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[120px]">
                            <div 
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%`, backgroundColor: RISK_COLORS[index] }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-12 text-right">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
