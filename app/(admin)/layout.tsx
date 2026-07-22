import { redirect } from 'next/navigation';
import { getRealAdminSession } from '@/lib/auth/session';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

export const metadata = { title: 'مدیریت کل' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getRealAdminSession();
  if (!session || session.role !== 'SuperAdmin') redirect('/login');

  return (
    <ConfirmProvider theme="dark">
      <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-stone-950 text-stone-100">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Super Admin banner */}
          <div className="shrink-0 bg-indigo-700 text-white text-xs text-center py-1 font-medium tracking-wide">
            ⚡ حالت Super Admin — تغییرات در این پنل بلافاصله اعمال می‌شوند
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
