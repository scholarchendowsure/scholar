'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [isExpanded, setIsExpanded] = useState(true);

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
        {isExpanded && (
          <div className="text-xs text-slate-500 text-center">
            贷后案件管理系统 v1.0
          </div>
        )}
      </div>
    </div>
  );
}
