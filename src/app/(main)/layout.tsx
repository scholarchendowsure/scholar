import { Sidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <main className="ml-56 transition-all duration-300">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
