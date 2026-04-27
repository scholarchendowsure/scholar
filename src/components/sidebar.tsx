'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  Database,
  FileText,
  Banknote,
  ArrowLeftRight,
  LogOut,
  ChevronDown,
  Building2,
  PieChart,
  Trash2,
  Upload,
  Download,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: '仪表盘',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '案件管理',
    href: '/cases',
    icon: Briefcase,
    children: [
      { title: '案件列表', href: '/cases', icon: Briefcase },
      { title: '我的案件', href: '/my-cases', icon: ClipboardList },
      { title: '案件分配', href: '/assignment', icon: Users },
      { title: '案件导入', href: '/case-import', icon: Upload },
    ],
  },
  {
    title: '还款记录',
    href: '/repayment-records',
    icon: Banknote,
  },
  {
    title: '跟进记录导入',
    href: '/followup-import',
    icon: ArrowLeftRight,
  },
  {
    title: '贷后统计',
    href: '/post-loan-stats',
    icon: PieChart,
  },
  {
    title: '回收站',
    href: '/recycle-bin',
    icon: Trash2,
  },
  {
    title: '数据导出',
    href: '/data-export',
    icon: Download,
  },
  {
    title: '汇丰贷款',
    href: '/hsbc-panel',
    icon: Building2,
    children: [
      { title: '汇丰仪表盘', href: '/hsbc-panel/dashboard', icon: LayoutDashboard },
      { title: '汇丰案件列表', href: '/hsbc-panel/cases', icon: FileText },
    ],
  },
  {
    title: '用户管理',
    href: '/users',
    icon: Users,
  },
  {
    title: 'MCP数据仓库',
    href: '/mcp-warehouse',
    icon: Database,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = isActive(item.href);

    return (
      <div key={item.title}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(item.title)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded transition-colors',
              active
                ? 'bg-[hsl(210,95%,40%)] text-white'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              level > 0 && 'ml-4'
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.title}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded transition-colors',
              active
                ? 'bg-[hsl(210,95%,40%)] text-white'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              level > 0 && 'ml-4'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Link>
        )}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r fixed left-0 top-0 z-40',
        className
      )}
      style={{ width: 260 }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[hsl(210,95%,40%)] rounded flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-[hsl(210,95%,40%)]">
            贷后系统
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => renderNavItem(item))}
      </nav>

      {/* User */}
      <div className="p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-2"
            >
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">管理员</p>
                <p className="text-xs text-muted-foreground">admin</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/users" className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                用户管理
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                系统设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' });
                window.location.href = '/login';
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
