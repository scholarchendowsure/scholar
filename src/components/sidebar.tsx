'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  User,
  Building2,
  Receipt,
  Users,
  Download,
  Trash2,
  BarChart3,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Upload,
} from 'lucide-react';

const navItems = [
  { label: '仪表盘', href: '/', icon: LayoutDashboard },
  { label: '案件列表', href: '/cases', icon: FileText },
  { label: '我的案件', href: '/my-cases', icon: User },
  { label: '汇丰管理', href: '/hsbc-panel', icon: Building2 },
  { label: '汇丰导入', href: '/hsbc-panel/import', icon: Upload },
  { label: '还款记录', href: '/repayment-records', icon: Receipt },
  { label: '案件分配', href: '/assignment', icon: Users },
  { label: '数据导出', href: '/data-export', icon: Download },
  { label: '回收站', href: '/recycle-bin', icon: Trash2 },
  { label: '贷后统计', href: '/post-loan-stats', icon: BarChart3 },
  { label: '用户管理', href: '/users', icon: Settings },
  { label: 'MCP数据仓库', href: '/mcp-warehouse', icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 z-40 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50">
        {!collapsed && (
          <span className="font-bold text-white text-lg">贷后系统</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 导航 */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 底部用户信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50">
        <div className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50',
          collapsed && 'justify-center px-0'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            A
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">管理员</p>
              <p className="text-xs text-slate-400 truncate">admin</p>
            </div>
          )}
          {!collapsed && (
            <button className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
