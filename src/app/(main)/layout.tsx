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
  User,
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
      <Sidebar />
      
      {/* 主内容区域 */}
      <main className="lg:pl-0 transition-all duration-300">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="h-16 px-4 lg:px-6 flex items-center justify-between">
            {/* 左侧 - 面包屑和标题 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="hidden lg:block">
                  <nav className="flex items-center space-x-1 text-sm">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-700">
                      <Home className="w-4 h-4" />
                    </Button>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-700 font-medium">{pageTitle}</span>
                  </nav>
                </div>
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
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 font-mono" suppressHydrationWarning>
                  {currentTime ? `${currentTime.toLocaleDateString('zh-CN')} ${currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              </div>

              {/* 快捷操作按钮 */}
              <div className="flex items-center gap-1">
                {/* 刷新按钮 */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 hover:bg-slate-100"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 text-slate-500", isLoading && "animate-spin")} />
                </Button>

                {/* 全屏按钮 */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 hover:bg-slate-100 hidden sm:flex"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </Button>

                {/* 通知按钮 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 hover:bg-slate-100 relative"
                    >
                      <Bell className="w-4 h-4 text-slate-500" />
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-xs">3</Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>通知中心</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-80 overflow-y-auto">
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-default">
                        <div className="flex items-center gap-2 w-full">
                          <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                          <span className="font-medium text-sm">新案件提醒</span>
                          <span className="text-xs text-slate-400 ml-auto">5分钟前</span>
                        </div>
                        <p className="text-xs text-slate-500">收到 3 笔新案件待分配</p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-default">
                        <div className="flex items-center gap-2 w-full">
                          <Badge variant="default" className="h-2 w-2 p-0 rounded-full bg-blue-500" />
                          <span className="font-medium text-sm">跟进提醒</span>
                          <span className="text-xs text-slate-400 ml-auto">30分钟前</span>
                        </div>
                        <p className="text-xs text-slate-500">张三要跟进的案件 CASE2024001 即将逾期</p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-default">
                        <div className="flex items-center gap-2 w-full">
                          <Badge variant="default" className="h-2 w-2 p-0 rounded-full bg-green-500" />
                          <span className="font-medium text-sm">还款到账</span>
                          <span className="text-xs text-slate-400 ml-auto">1小时前</span>
                        </div>
                        <p className="text-xs text-slate-500">案件 CASE2024002 还款 ¥50,000</p>
                      </DropdownMenuItem>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="justify-center text-blue-600 font-medium cursor-pointer">
                      查看全部通知
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 用户菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 gap-2 hover:bg-slate-100">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-slate-700">
                        {user?.name || '用户'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-medium">{user?.name}</span>
                        <span className="text-xs text-slate-500">{user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '经理' : '外访员'}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      个人设置
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      系统设置
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      帮助中心
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-red-600" onClick={logout}>
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}