'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  User,
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Filter,
  Upload,
  FileSpreadsheet,
  Database,
  Building2,
  PieChart as PieChartIcon,
  Trash2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

// 月度趋势数据
const monthlyTrend = [
  { month: '1月', cases: 45, amount: 1200000, overdue: 80000 },
  { month: '2月', cases: 52, amount: 1500000, overdue: 120000 },
  { month: '3月', cases: 48, amount: 1350000, overdue: 95000 },
  { month: '4月', cases: 62, amount: 1800000, overdue: 140000 },
  { month: '5月', cases: 58, amount: 1650000, overdue: 110000 },
  { month: '6月', cases: 65, amount: 1950000, overdue: 130000 },
];

// 案件状态分布
const caseStatusData = [
  { name: '待分配', value: 15, color: 'hsl(38 92% 50%)' },
  { name: '待外访', value: 28, color: 'hsl(210 100% 55%)' },
  { name: '跟进中', value: 42, color: 'hsl(210 100% 45%)' },
  { name: '已结案', value: 65, color: 'hsl(142 71% 45%)' },
];

// 用户绩效数据
const userPerformance = [
  { name: '张三', cases: 28, amount: 840000, closed: 25 },
  { name: '李四', cases: 25, amount: 720000, closed: 22 },
  { name: '王五', cases: 32, amount: 960000, closed: 28 },
  { name: '赵六', cases: 22, amount: 660000, closed: 19 },
  { name: '钱七', cases: 30, amount: 900000, closed: 26 },
];

// 最近活动数据
const recentActivities = [
  { id: 1, type: 'create', user: '张三', action: '创建案件', target: 'TPJHK1079195', time: '2分钟前' },
  { id: 2, type: 'update', user: '李四', action: '更新跟进', target: 'WCTHK1081926', time: '5分钟前' },
  { id: 3, type: 'close', user: '王五', action: '完成结案', target: 'LAEAM1017710', time: '15分钟前' },
  { id: 4, type: 'assign', user: '管理员', action: '分配案件', target: 'LAEAM1017707', time: '23分钟前' },
  { id: 5, type: 'payment', user: '系统', action: '还款到账', target: 'MAXUP HOLDINGS', time: '1小时前', amount: '¥180,000' },
];

// 待处理任务
const pendingTasks = [
  { id: 1, title: 'TPJHK1079195 外访跟进', priority: 'high', due: '今天', user: '张三' },
  { id: 2, title: 'WCTHK1081926 风险评定', priority: 'medium', due: '明天', user: '李四' },
  { id: 3, title: 'LAEAM1017710 还款审核', priority: 'high', due: '今天', user: '王五' },
  { id: 4, title: 'LAEAM1017707 地址验证', priority: 'low', due: '3天后', user: '赵六' },
];

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [postLoanLoading, setPostLoanLoading] = useState(true);
  const [postLoanStats, setPostLoanStats] = useState<PostLoanStats | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      setStats({
        totalCases: 150,
        pendingAssign: 15,
        pendingVisit: 28,
        following: 42,
        closed: 65,
        closureRate: 76.5,
        totalOverdue: 675000,
        monthlyClosed: 32,
        avgClosureDays: 8.5,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const fetchPostLoanStats = useCallback(async () => {
    setPostLoanLoading(true);
    try {
      const res = await fetch(`/api/cases/statistics/post-loan-dashboard?range=${dateRange}`);
      const result = await res.json();
      if (result.success) {
        setPostLoanStats(result.data);
      }
    } catch (error) {
      toast.error('获取贷后统计数据失败');
    } finally {
      setPostLoanLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPostLoanStats();
  }, [fetchPostLoanStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 顶部快捷操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">欢迎回来！</h2>
          <p className="text-slate-500 mt-1">这是您的贷后案件管理概览</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            筛选视图
          </Button>
          <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="w-4 h-4" />
            新建案件
          </Button>
        </div>
      </div>

      {/* 菜单导航栏卡片 */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-800">快速导航</CardTitle>
          <CardDescription>点击下方卡片快速访问各功能模块</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link href="/">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">仪表盘</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/cases">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">案件管理</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/my-cases">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">我的案件</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/assignment">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">案件分配</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/repayment-records">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">还款记录</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/case-import">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-400 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">案件导入</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/hsbc-panel">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">汇丰管理</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/users">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">用户管理</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/recycle-bin">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-gray-400 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">回收站</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/data-export">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-400 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">数据导出</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/followup-import">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">跟进导入</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 贷后催收统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* 目前总逾期在贷余额(逾期) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">目前总逾期在贷余额(逾期)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ¥6,750,000
            </div>
          </CardContent>
        </Card>

        {/* 目前总逾期在贷余额(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">目前总逾期在贷余额(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ¥5,200,000
            </div>
          </CardContent>
        </Card>

        {/* 本月催回金额(逾期) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本月催回金额(逾期)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ¥850,000
            </div>
          </CardContent>
        </Card>

        {/* 本月催回金额(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本月催回金额(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-teal-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              ¥620,000
            </div>
          </CardContent>
        </Card>

        {/* 本月催回率(逾期) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本月催回率(逾期)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              12.59%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第二行贷后催收统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* 本月催回率(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本月催回率(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              11.92%
            </div>
          </CardContent>
        </Card>

        {/* 本周预估催回金额(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本周预估催回金额(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-cyan-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              ¥180,000
            </div>
          </CardContent>
        </Card>

        {/* 本周实际催回(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本周实际催回(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ¥155,000
            </div>
          </CardContent>
        </Card>

        {/* 下周预估催回金额(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">下周预估催回金额(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ¥220,000
            </div>
          </CardContent>
        </Card>

        {/* 本月整体预估催回金额(贷后) */}
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">本月整体预估催回金额(贷后)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-pink-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              ¥750,000
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总案件数"
          value={stats.totalCases}
          icon={<FileText className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
          color="primary"
        />
        <StatCard
          title="待外访"
          value={stats.pendingVisit}
          icon={<Clock className="w-5 h-5" />}
          trend="3个超期"
          trendUp={false}
          color="warning"
        />
        <StatCard
          title="本月结案"
          value={stats.monthlyClosed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          trend="+8%"
          trendUp={true}
          color="success"
        />
        <StatCard
          title="逾期总额"
          value={formatCurrency(stats.totalOverdue)}
          icon={<AlertCircle className="w-5 h-5" />}
          trend="-5%"
          trendUp={true}
          color="danger"
        />
      </div>

      {/* 第二行统计 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">结案率</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.closureRate}%
            </div>
            <Progress value={stats.closureRate} className="h-2" />
            <p className="text-sm text-slate-500 mt-2">目标: 80%</p>
          </CardContent>
        </Card>

        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">平均结案天数</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.avgClosureDays} <span className="text-lg font-normal text-slate-500">天</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowDownRight className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">-1.2天</span>
              <span className="text-slate-500">vs 上月</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover overflow-hidden border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">案件状态分布</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={caseStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={35}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {caseStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {caseStatusData.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 月度趋势图 */}
        <Card className="card-hover border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">月度趋势</CardTitle>
                <CardDescription>近6个月案件及金额变化</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={dateRange === range ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDateRange(range)}
                  >
                    {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210 100% 55%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(210 100% 55%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="month" stroke="hsl(220 9% 46%)" />
                  <YAxis stroke="hsl(220 9% 46%)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid hsl(220 13% 91%)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Area type="monotone" dataKey="cases" stroke="hsl(210 100% 55%)" fillOpacity={1} fill="url(#colorCases)" name="案件数" />
                  <Area type="monotone" dataKey="amount" stroke="hsl(142 71% 45%)" fillOpacity={1} fill="url(#colorAmount)" name="金额" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 用户绩效排行 */}
        <Card className="card-hover border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">用户绩效排行</CardTitle>
            <CardDescription>本月结案数和金额</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(220 9% 46%)" />
                  <YAxis dataKey="name" type="category" stroke="hsl(220 9% 46%)" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid hsl(220 13% 91%)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Bar dataKey="cases" fill="hsl(210 100% 55%)" radius={[0, 4, 4, 0]} name="结案数" />
                  <Bar dataKey="closed" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} name="金额" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动和待处理任务 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 最近活动 */}
        <Card className="card-hover border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">最近活动</CardTitle>
                <CardDescription>系统最新动态</CardDescription>
              </div>
              <Button variant="ghost" size="sm">查看全部</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'create' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'update' ? 'bg-orange-100 text-orange-600' :
                    activity.type === 'close' ? 'bg-green-100 text-green-600' :
                    activity.type === 'assign' ? 'bg-purple-100 text-purple-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {activity.type === 'create' && <Plus className="w-4 h-4" />}
                    {activity.type === 'update' && <RefreshCw className="w-4 h-4" />}
                    {activity.type === 'close' && <CheckCircle2 className="w-4 h-4" />}
                    {activity.type === 'assign' && <Users className="w-4 h-4" />}
                    {activity.type === 'payment' && <DollarSign className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-slate-500 mx-1">{activity.action}</span>
                      <span className="font-medium text-slate-700">{activity.target}</span>
                      {activity.amount && (
                        <span className="font-semibold text-emerald-600 ml-2">{activity.amount}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 待处理任务 */}
        <Card className="card-hover border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">待处理任务</CardTitle>
                <CardDescription>您的待办事项</CardDescription>
              </div>
              <Badge variant="secondary">{pendingTasks.length}项</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {task.due} · {task.user}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">处理</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend?: string; 
  trendUp?: boolean; 
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-orange-50 text-orange-600',
    danger: 'bg-red-50 text-red-600',
  };

  return (
    <Card className="card-hover overflow-hidden border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
          <div className={`w-8 h-8 rounded-lg ${colorClasses[color || 'primary']} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800 mb-1">
          {value}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 骨架屏组件
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
