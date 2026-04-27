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
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果用户未登录，重定向到登录页
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

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
