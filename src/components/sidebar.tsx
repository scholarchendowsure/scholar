'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Briefcase, 
  FileSpreadsheet, 
  Database, 
  Trash2, 
  LogOut,
  Home,
  User,
  Building2,
  Upload,
  PieChart,
  Calendar,
  DollarSign,
  Bell,
  Search,
  Settings,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  ArrowRight,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  {
    section: '核心功能',
    items: [
      { name: '仪表盘', href: '/', icon: LayoutDashboard, description: '数据概览与统计' },
      { name: '案件管理', href: '/cases', icon: FileText, description: '外访案件全生命周期管理' },
      { name: '我的案件', href: '/my-cases', icon: Briefcase, description: '个人负责的案件' },
    ]
  },
  {
    section: '数据管理',
    items: [
      { name: '案件分配', href: '/assignment', icon: Users, description: '批量案件分配' },
      { name: '还款记录', href: '/repayment-records', icon: DollarSign, description: '还款记录与审核' },
      { name: '案件导入', href: '/case-import', icon: Upload, description: '批量导入案件' },
      { name: '跟进导入', href: '/followup-import', icon: FileSpreadsheet, description: '批量导入跟进记录' },
      { name: '数据导出', href: '/data-export', icon: Database, description: '数据导出与报表' },
    ]
  },
  {
    section: '专项管理',
    items: [
      { name: '汇丰管理', href: '/hsbc-panel', icon: Building2, description: '汇丰贷款专项管理' },
    ]
  },
  {
    section: '统计分析',
    items: [
      { name: '贷后统计', href: '/post-loan-stats', icon: PieChart, description: '贷后数据统计分析' },
    ]
  },
  {
    section: '系统管理',
    items: [
      { name: '用户管理', href: '/users', icon: Users, description: '用户与角色管理' },
      { name: '回收站', href: '/recycle-bin', icon: Trash2, description: '已删除案件恢复' },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['核心功能', '专项管理']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const SidebarContent = () => (
    <div className={cn(
      "h-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* 顶部区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50 bg-slate-900/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">贷后系统</span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? '展开侧边栏' : '收起侧边栏'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 导航区域 */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((section) => (
          <div key={section.section} className="mb-4">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.section}
                </span>
                <button
                  onClick={() => toggleSection(section.section)}
                  className="text-slate-600 hover:text-slate-400"
                >
                  {expandedSections.includes(section.section) ? (
                    <ChevronRight className="w-3 h-3 rotate-90" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
            
            {(isCollapsed || expandedSections.includes(section.section)) && (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/' && pathname.startsWith(item.href));
                  
                  return (
                    <TooltipProvider key={item.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 group relative overflow-hidden",
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-r-full" />
                            )}
                            <item.icon className={cn(
                              "w-5 h-5 flex-shrink-0 transition-colors",
                              isActive
                                ? "text-white"
                                : "text-slate-500 group-hover:text-white"
                            )} />
                            {!isCollapsed && (
                              <span className="text-sm font-medium truncate">
                                {item.name}
                              </span>
                            )}
                            {isActive && !isCollapsed && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                            )}
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right" className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-slate-400">{item.description}</span>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 底部用户区域 */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-900/30">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/50 transition-colors">
            <Avatar className="h-9 w-9 ring-2 ring-blue-500/30">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || '用户'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.role === 'admin' ? '系统管理员' : 
                 user?.role === 'manager' ? '客户经理' : '外访员'}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg hover:bg-slate-700/70 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>退出登录</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-blue-500/30">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg hover:bg-slate-700/70 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>退出登录</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 移动端侧边栏开关 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center px-4">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">贷后系统</span>
        </div>
      </div>

      {/* 移动端遮罩 */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      {isMobileOpen && (
        <div className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50">
          <SidebarContent />
        </div>
      )}

      {/* 桌面端侧边栏 */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-40">
        <SidebarContent />
      </div>

      {/* 内容区域左边距 */}
      <div className={cn(
        "hidden lg:block transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )} />
    </>
  );
}
