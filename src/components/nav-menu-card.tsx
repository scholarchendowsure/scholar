'use client';

import React from 'react';
import Link from 'next/link';
import {
  Home,
  FileText,
  Briefcase,
  Users,
  TrendingUp,
  Download,
  PieChartIcon,
  Calendar,
  Trash2,
  CreditCard,
  Plus,
  Upload,
  Database,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const navItems: NavItem[] = [
  { href: '/', label: '仪表盘', icon: Home, gradient: 'from-blue-500 to-blue-400' },
  { href: '/cases', label: '案件管理', icon: FileText, gradient: 'from-emerald-500 to-teal-400' },
  { href: '/my-cases', label: '我的案件', icon: Briefcase, gradient: 'from-amber-500 to-orange-400' },
  { href: '/assignment', label: '案件分配', icon: Users, gradient: 'from-pink-500 to-rose-400' },
  { href: '/cases/closed', label: '结清案件', icon: Calendar, gradient: 'from-cyan-500 to-sky-400' },
  { href: '/repayment-records', label: '还款记录', icon: CreditCard, gradient: 'from-violet-500 to-purple-400' },
  { href: '/data-export', label: '数据导出', icon: Download, gradient: 'from-green-500 to-emerald-400' },
  { href: '/case-import', label: '案件导入', icon: Upload, gradient: 'from-yellow-500 to-amber-400' },
  { href: '/users', label: '用户管理', icon: Users, gradient: 'from-purple-500 to-violet-400' },
  { href: '/hsbc-panel', label: '汇丰仪表盘', icon: TrendingUp, gradient: 'from-red-500 to-rose-400' },
  { href: '/mcp-warehouse', label: 'MCP数据仓库', icon: Database, gradient: 'from-teal-500 to-cyan-400' },
  { href: '/recycle-bin', label: '回收站', icon: Trash2, gradient: 'from-orange-500 to-red-400' },
];

export function NavMenuCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-card-foreground">快速导航</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground text-center">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
