'use client';

import { LeftSidebar } from '@/components/left-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果未登录且不在加载中，重定向到登录页
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 如果还在加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 如果未认证，不显示内容（会重定向）
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30">
      {/* 左侧边栏 */}
      <LeftSidebar />
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6">
          {children}
        </div>
        
        <Toaster />
      </div>
    </div>
  );
}
