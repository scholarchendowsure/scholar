'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  Building2,
  PieChart,
  Trash2,
  ChevronUp,
  ChevronDown,
  LogOut,
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle,
  Menu
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  {
    section: '核心功能',
    items: [
      { name: '仪表盘', href: '/', icon: LayoutDashboard },
      { 
        name: '案件管理', 
        href: '/cases', 
        icon: FileText,
        subItems: [
          { name: '全部案件', href: '/cases' },
          { name: '我的案件', href: '/my-cases' },
          { name: '结清案件', href: '/cases/closed' },
        ]
      },
    ]
  },
  {
    section: '数据管理',
    items: [
      { name: '案件分配', href: '/assignment', icon: Users },
      { name: '还款记录', href: '/repayment-records', icon: DollarSign },
      { name: '案件导入', href: '/case-import', icon: Upload },
      { name: '跟进导入', href: '/followup-import', icon: FileSpreadsheet },
      { name: '数据导出', href: '/data-export', icon: Database },
    ]
  },
  {
    section: '专项管理',
    items: [
      { name: '汇丰管理', href: '/hsbc-panel', icon: Building2 },
    ]
  },
  {
    section: '统计分析',
    items: [
      { name: '贷后统计', href: '/post-loan-stats', icon: PieChart },
    ]
  },
  {
    section: '系统管理',
    items: [
      { name: '用户管理', href: '/users', icon: Users },
      { name: '回收站', href: '/recycle-bin', icon: Trash2 },
    ]
  }
];

export function Sidebar({ onClose, onToggle, isExpanded }: { onClose?: () => void; onToggle?: () => void; isExpanded?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [internalExpanded, setInternalExpanded] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['案件管理']);

  const expanded = isExpanded ?? internalExpanded;
  const toggleExpanded = onToggle ?? (() => setInternalExpanded(!expanded));

  const toggleItem = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm">
      {/* 顶部导航栏 */}
      <div className="h-14 px-4 flex items-center justify-between">
        {/* 左侧 Logo 和展开按钮 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-200">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-lg tracking-tight">贷后管理系统</span>
          </div>
          
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200 flex items-center gap-2"
          >
            <Menu className="w-4 h-4" />
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 用户区域 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-medium">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800">
                {user?.name || '用户'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '经理' : '外访员'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 展开的导航菜单 */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {navItems.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mr-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">
                    {section.section}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {section.items.map((item, itemIdx) => {
                      const isItemActive = isActive(item.href);
                      
                      if (item.subItems) {
                        return (
                          <div key={itemIdx} className="relative group">
                            <button
                              onClick={() => toggleItem(item.name)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                                isItemActive
                                  ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <item.icon className={cn(
                                  "w-4 h-4 transition-colors",
                                  isItemActive ? "text-blue-600" : "text-gray-400"
                                )} />
                                <span>{item.name}</span>
                              </div>
                              <ChevronDown 
                                className={cn(
                                  "w-4 h-4 transition-transform duration-200",
                                  expandedItems.includes(item.name) && "rotate-180"
                                )}
                              />
                            </button>
                            
                            {expandedItems.includes(item.name) && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                {item.subItems.map((subItem, subIdx) => {
                                  const isSubActive = pathname === subItem.href;
                                  return (
                                    <Link
                                      key={subIdx}
                                      href={subItem.href}
                                      onClick={onClose}
                                      className={cn(
                                        "flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200",
                                        isSubActive
                                          ? "bg-blue-600 text-white"
                                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                      )}
                                    >
                                      {isSubActive ? (
                                        <CheckCircle className="w-4 h-4" />
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                      )}
                                      <span>{subItem.name}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={itemIdx}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isItemActive
                              ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <item.icon className={cn(
                            "w-4 h-4 transition-colors",
                            isItemActive ? "text-blue-600" : "text-gray-400"
                          )} />
                          <span>{item.name}</span>
                          {isItemActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}