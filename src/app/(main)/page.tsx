'use client';

import { useEffect, useState } from 'react';
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
  PieChart,
  Trash2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

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

            <Link href="/post-loan-stats">
              <Card className="cursor-pointer hover:bg-slate-50 transition-all duration-200 border-slate-200 hover:border-blue-300">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">贷后统计</span>
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
                <CardDescription className="text-slate-500">案件数量与逾期金额</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">案件数</Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">逾期金额</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210 100% 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(210 100% 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 14% 91%)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215 16% 47%)', fontSize: 12 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215 16% 47%)', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215 16% 47%)', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(220 14% 91%)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="cases" stroke="hsl(210 100% 45%)" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
                  <Area yAxisId="right" type="monotone" dataKey="overdue" stroke="hsl(0 84% 60%)" strokeWidth={3} fillOpacity={1} fill="url(#colorOverdue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 用户绩效排名 */}
        <Card className="card-hover border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">外访员绩效</CardTitle>
                <CardDescription className="text-slate-500">本月结案数量排名</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-sm">
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPerformance.map((user, index) => (
                <div key={user.name} className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                    index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                    index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                    index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{user.name}</span>
                      <span className="text-sm font-semibold text-slate-800">{user.closed} 件</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${(user.closed / 32) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{formatCurrency(user.amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部区域 - 活动和任务 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 最近活动 */}
        <Card className="card-hover border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">最近活动</CardTitle>
                <CardDescription className="text-slate-500">团队操作记录</CardDescription>
              </div>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                    activity.type === 'create' && "bg-blue-50 text-blue-600",
                    activity.type === 'update' && "bg-purple-50 text-purple-600",
                    activity.type === 'close' && "bg-green-50 text-green-600",
                    activity.type === 'assign' && "bg-amber-50 text-amber-600",
                    activity.type === 'payment' && "bg-emerald-50 text-emerald-600",
                  )}>
                    {activity.type === 'create' && <FileText className="w-4 h-4" />}
                    {activity.type === 'update' && <Activity className="w-4 h-4" />}
                    {activity.type === 'close' && <CheckCircle2 className="w-4 h-4" />}
                    {activity.type === 'assign' && <Users className="w-4 h-4" />}
                    {activity.type === 'payment' && <DollarSign className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium text-slate-700">{activity.user}</span>
                        <span className="text-slate-500 mx-1">{activity.action}</span>
                        <span className="font-mono text-slate-700">{activity.target}</span>
                        {activity.amount && (
                          <span className="ml-2 text-emerald-600 font-semibold">{activity.amount}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{activity.time}</span>
                    </div>
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
                <CardDescription className="text-slate-500">需要您关注的事项</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                {pendingTasks.length} 项
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-slate-700">{task.title}</span>
                    <Badge className={cn(
                      task.priority === 'high' ? "bg-red-100 text-red-700" :
                      task.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {task.priority === 'high' ? '紧急' : task.priority === 'medium' ? '重要' : '普通'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4" />
                      <span>{task.user}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className={task.due === '今天' ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {task.due}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
  trend: string; 
  trendUp: boolean; 
  color: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    primary: 'from-blue-500 to-indigo-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-amber-500 to-yellow-600',
    danger: 'from-red-500 to-rose-600',
  };

  const bgClasses = {
    primary: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
  };

  return (
    <Card className="card-hover overflow-hidden border-slate-200 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg shadow-slate-200/50 group-hover:shadow-xl transition-shadow", colorClasses[color])}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trendUp ? "text-emerald-600" : "text-red-600"
          )}>
            {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend}
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
