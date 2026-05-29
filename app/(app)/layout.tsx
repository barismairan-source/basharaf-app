import { Header, Sidebar, ToastContainer } from '@/components/layout';
import { BootstrapGuard } from '@/components/auth/BootstrapGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <BootstrapGuard>
              {children}
            </BootstrapGuard>
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
