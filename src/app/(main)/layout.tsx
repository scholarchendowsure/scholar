'use client';

import { Sidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/components/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Bell, 
  Search, 
  Settings, 
  Calendar, 
  HelpCircle,
  Home,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      window.location.reload();
    }, 500);
  };

  const pageTitle = {
    '/': '仪表盘',
    '/cases': '案件管理',
    '/my-cases': '我的案件',
    '/cases/closed': '结清案件',
    '/assignment': '案件分配',
    '/repayment-records': '还款记录',
    '/case-import': '案件导入',
    '/followup-import': '跟进导入',
    '/data-export': '数据导出',
    '/hsbc-panel': '汇丰管理',
    '/hsbc-panel/upload': '汇丰导入',
    '/hsbc-panel/loans': '汇丰案件',
    '/post-loan-stats': '贷后统计',
    '/users': '用户管理',
    '/recycle-bin': '回收站',
  }[pathname] || '贷后案件管理系统';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30">
      {/* 顶部侧边栏 */}
      <Sidebar onClose={() => setSidebarExpanded(false)} />
      
      {/* 主内容区域 */}
      <main className="min-h-screen">
        {/* 功能导航栏 */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="h-14 px-4 flex items-center justify-between">
            {/* 左侧 - 面包屑和标题 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <nav className="flex items-center space-x-1 text-sm">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-700">
                    <Home className="w-4 h-4" />
                  </Button>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-700 font-medium">{pageTitle}</span>
                </nav>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  {pageTitle}
                </h1>
              </div>
            </div>

            {/* 右侧 - 操作区 */}
            <div className="flex items-center gap-3">
              {/* 搜索框 */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="全局搜索..."
                    className="w-64 pl-10 pr-4 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* 时间显示 - 客户端安全渲染 */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span suppressHydrationWarning className="text-sm text-slate-600 font-mono">
                  {currentTime && (
                    <>
                      {currentTime.toLocaleDateString('zh-CN')}
                      <span className="mx-2 text-slate-300">|</span>
                      {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </>
                  )}
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-9 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 通知中心 */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative"
                    >
                      <Bell className="w-4 h-4" />
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-xs flex items-center justify-center">
                        3
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="font-semibold text-slate-800">通知中心</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-80 overflow-auto">
                      {[
                        { type: 'new_case', title: '新案件分配', desc: '您有 5 个新案件待处理', time: '2分钟前' },
                        { type: 'followup', title: '跟进提醒', desc: '案件 LAEHK1000001 即将到期', time: '15分钟前' },
                        { type: 'repayment', title: '还款到账', desc: '案件 LAEHK1000003 已回款 50,000 元', time: '1小时前' },
                      ].map((item, i) => (
                        <DropdownMenuItem key={i} className="p-3 cursor-pointer hover:bg-slate-50">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{item.title}</span>
                            </div>
                            <p className="text-xs text-slate-500">{item.desc}</p>
                            <p className="text-xs text-slate-400">{item.time}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      
      <Toaster />
    </div>
  );
}