import { StaffOverview } from '@/components/hr/StaffOverview';

export const metadata = { title: 'پرسنل و حقوق' };

export default function Page() {
  return (
    <div className="p-4 lg:p-6 pt-2">
      <div className="max-w-5xl mx-auto"><StaffOverview /></div>
    </div>
  );
}
