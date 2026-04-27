'use client';

import { Sidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-[260px]">
        <div className="max-w-[1400px] mx-auto p-6">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
