import { Header, Sidebar, ToastContainer, BottomTabBar } from '@/components/layout';
import { BootstrapGuard } from '@/components/auth/BootstrapGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header />
          {/* pb-20: فضا برای BottomTabBar (64px) + safe-area (≈16px) روی موبایل */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
            <BootstrapGuard>
              {children}
            </BootstrapGuard>
          </main>
        </div>
      </div>
      <BottomTabBar />
      <ToastContainer />
    </div>
  );
}
