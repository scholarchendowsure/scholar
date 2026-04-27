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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['核心功能', '专项管理']);
  const [expandedItems, setExpandedItems] = useState<string[]>(['案件管理']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

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

  const SidebarContent = () => (
    <div className={cn(
      "h-full flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 bg-white">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-200">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-lg tracking-tight">贷后管理系统</span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-200">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 导航区域 */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-4">
            {/* 分组标题 */}
            {!isCollapsed && (
              <button
                onClick={() => toggleSection(section.section)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                <span>{section.section}</span>
                <ChevronDown 
                  className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    expandedSections.includes(section.section) && "rotate-180"
                  )}
                />
              </button>
            )}
            
            {/* 分组项目 */}
            {expandedSections.includes(section.section) && (
              <div className="mt-1 space-y-0.5">
                {section.items.map((item, itemIdx) => {
                  const isItemActive = isActive(item.href);
                  
                  return (
                    <div key={itemIdx}>
                      {item.subItems ? (
                        <>
                          {/* 有子菜单的项目 */}
                          <button
                            onClick={() => toggleItem(item.name)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                              isItemActive
                                ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                isItemActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                              )} />
                              {!isCollapsed && <span>{item.name}</span>}
                            </div>
                            {!isCollapsed && (
                              <ChevronDown 
                                className={cn(
                                  "w-4 h-4 transition-transform duration-200",
                                  expandedItems.includes(item.name) && "rotate-180"
                                )}
                              />
                            )}
                          </button>
                          
                          {/* 子菜单 */}
                          {expandedItems.includes(item.name) && !isCollapsed && (
                            <div className="ml-8 mt-1 space-y-0.5 border-l border-gray-100 pl-2">
                              {item.subItems.map((subItem, subIdx) => {
                                const isSubActive = pathname === subItem.href;
                                return (
                                  <Link
                                    key={subIdx}
                                    href={subItem.href}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                      isSubActive
                                        ? "bg-blue-600 text-white font-medium shadow-sm shadow-blue-200"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    )}
                                  >
                                    {isSubActive ? (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                    )}
                                    <span>{subItem.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        // 无子菜单的项目
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                            isItemActive
                              ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <item.icon className={cn(
                            "w-5 h-5 transition-colors",
                            isItemActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                          )} />
                          {!isCollapsed && <span>{item.name}</span>}
                          {isItemActive && !isCollapsed && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 用户区域 */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/50">
        <div className={cn(
          "flex items-center gap-3",
          isCollapsed ? "justify-center" : ""
        )}>
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-medium">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {user?.name || '用户'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '经理' : '外访员'}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <div className="hidden md:flex h-full">
        <SidebarContent />
      </div>
      
      {/* 移动端侧边栏 */}
      <div className="md:hidden fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </div>
    </>
  );
}