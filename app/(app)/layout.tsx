import { Header, Sidebar, ToastContainer, BottomTabBar } from '@/components/layout';
import { BootstrapGuard } from '@/components/auth/BootstrapGuard';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

/**
 * App Shell — fixed-height viewport container.
 * h-screen overflow-hidden ensures the sidebar and content scroll independently;
 * the page itself never scrolls (no document-level scroll).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider theme="light">
      <div className="h-screen flex flex-col overflow-hidden bg-bg">
        <ImpersonationBanner />
        <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {/* Content column: Header pinned at top, main scrolls below */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <Header />
          {/* BottomTabBar واقعاً h-16 (4rem) است؛ به‌جای عدد ثابت، دقیقاً همون
              ارتفاع + safe-area واقعی دستگاه رو رزرو می‌کنیم — نه یک تخمین. */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            <BootstrapGuard>
              {children}
            </BootstrapGuard>
          </main>
        </div>
        <BottomTabBar />
        <ToastContainer />
        </div>
      </div>
    </ConfirmProvider>
  );
}
