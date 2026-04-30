'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  User,
  Users,
  CheckCircle2,
  DollarSign,
  Download,
  Upload,
  UserCog,
  Building2,
  Database,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquare,
  KeyRound,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    title: '仪表盘',
    href: '/',
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    title: '案件管理',
    href: '/cases',
    icon: <Briefcase className="h-5 w-5" />
  },
  {
    title: '我的案件',
    href: '/my-cases',
    icon: <User className="h-5 w-5" />
  },
  {
    title: '案件分配',
    href: '/assignment',
    icon: <Users className="h-5 w-5" />
  },
  {
    title: '结清案件',
    href: '/cases/closed',
    icon: <CheckCircle2 className="h-5 w-5" />
  },
  {
    title: '还款记录',
    href: '/repayment-records',
    icon: <DollarSign className="h-5 w-5" />
  },
  {
    title: '数据导出',
    href: '/data-export',
    icon: <Download className="h-5 w-5" />
  },
  {
    title: '案件导入',
    href: '/case-import',
    icon: <Upload className="h-5 w-5" />
  },
  {
    title: '用户管理',
    href: '/users',
    icon: <UserCog className="h-5 w-5" />
  },
  {
    title: '汇丰仪表盘',
    href: '/hsbc-panel',
    icon: <Building2 className="h-5 w-5" />
  },
  {
    title: '商户销售管理',
    href: '/hsbc-panel/merchant-sales',
    icon: <UserCog className="h-5 w-5" />
  },
  {
    title: '飞书配置',
    href: '/hsbc-panel/feishu-config',
    icon: <MessageSquare className="h-5 w-5" />
  },
  {
    title: 'MCP数据仓库',
    href: '/mcp-warehouse',
    icon: <Database className="h-5 w-5" />
  },
  {
    title: '回收站',
    href: '/recycle-bin',
    icon: <Trash2 className="h-5 w-5" />
  }
];

export function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        logout();
        toast.success('已安全退出');
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={cn(
      "relative flex flex-col bg-white border-r border-slate-200 h-screen transition-all duration-300",
      isExpanded ? "w-64" : "w-16"
    )}>
      {/* Logo区域 */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
        {isExpanded && (
          <h1 className="text-lg font-bold text-slate-900">贷后管理系统</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 h-8 w-8"
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-slate-100",
                    isActive 
                      ? "bg-blue-50 text-blue-700 font-medium" 
                      : "text-slate-700"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0",
                    isActive ? "text-blue-600" : "text-slate-500"
                  )}>
                    {item.icon}
                  </span>
                  {isExpanded && (
                    <span className="truncate">{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 底部区域 */}
      <div className="border-t border-slate-200 p-4">
        {/* 用户信息 */}
        {isExpanded && user && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-sm font-medium text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500">{user.department || ''}</div>
            <div className="text-xs text-slate-400 mt-1">
              {user.role === 'admin' ? '管理员' : user.role === 'manager' ? '经理' : '外访员'}
            </div>
          </div>
        )}
        
        {/* 功能按钮 */}
        <div className="space-y-2">
          {/* 修改密码 */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => router.push('/change-password')}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {isExpanded && <span>修改密码</span>}
          </Button>
          
          {/* 注销登录 */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isExpanded && <span>{isLoggingOut ? '退出中...' : '注销登录'}</span>}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 text-center">
            贷后案件管理系统 v1.0
          </div>
        )}
      </div>
    </div>
  );
}
