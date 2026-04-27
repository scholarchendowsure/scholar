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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
    '/assignment': '案件分配',
    '/repayment-records': '还款记录',
    '/case-import': '案件导入',
    '/followup-import': '跟进导入',
    '/data-export': '数据导出',
    '/hsbc-panel': '汇丰管理',
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

              {/* 时间显示 */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 font-mono">
                  {currentTime.toLocaleDateString('zh-CN')} {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
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
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>通知中心</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-80 overflow-auto">
                      <div className="p-3 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">新案件分配</p>
                            <p className="text-xs text-slate-500 mt-0.5">您有3个新案件待处理</p>
                            <p className="text-xs text-slate-400 mt-1">2分钟前</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">案件跟进提醒</p>
                            <p className="text-xs text-slate-500 mt-0.5">案件 TPJHK1079195 需要跟进</p>
                            <p className="text-xs text-slate-400 mt-1">15分钟前</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">还款到账提醒</p>
                            <p className="text-xs text-slate-500 mt-0.5">MAXUP HOLDINGS 还款 ¥180,000</p>
                            <p className="text-xs text-slate-400 mt-1">1小时前</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="justify-center text-blue-600 cursor-pointer">
                      查看全部通知
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 用户菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 gap-2 px-3 hover:bg-slate-100">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {user?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="hidden sm:flex flex-col items-start">
                        <span className="text-sm font-medium text-slate-700">
                          {user?.name || '用户'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {user?.role === 'admin' ? '系统管理员' : 
                           user?.role === 'manager' ? '客户经理' : '外访员'}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      个人资料
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      账户设置
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <HelpCircle className="w-4 h-4" />
                      帮助中心
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="gap-2 text-red-600 cursor-pointer"
                      onClick={() => { logout(); router.push('/login'); }}
                    >
                      <User className="w-4 h-4" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-4 lg:p-6 fade-in">
          {children}
        </div>
      </main>

      <Toaster />
    </div>
  );
}
