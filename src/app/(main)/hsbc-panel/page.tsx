'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HSBCPanelPage() {
  const router = useRouter();

  useEffect(() => {
    // 默认重定向到仪表盘
    router.replace('/hsbc-panel/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">加载中...</p>
      </div>
    </div>
  );
}
