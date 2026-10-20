'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabPanel } from '@/components/ui';
import { ShiftScheduleView } from '@/components/hr/ShiftScheduleView';
import { AttendanceView } from '@/components/hr/AttendanceView';
import { ApprovalsView } from '@/components/hr/ApprovalsView';
import { TimesheetView } from '@/components/hr/TimesheetView';
import { ClockView } from '@/components/hr/ClockView';

type TimeTab = 'schedule' | 'attendance' | 'clock' | 'approvals' | 'timesheet';
const VALID_TABS: TimeTab[] = ['schedule', 'attendance', 'clock', 'approvals', 'timesheet'];

/**
 * «زمان و حضور» — فضای کاری یکپارچه‌ی برنامه شیفت + ثبت حضور + تأییدها +
 * گزارش کارکرد. تب‌ها فقط ادغام رابط کاربری است؛ داده‌ی برنامه‌ریزی‌شده
 * (employee_shift_assignments) و حضور واقعی (attendance_entries) کاملاً جدا
 * باقی می‌مانند (طبق دستور صریح). مسیرهای قدیمی /shift-schedule و
 * /attendance به اینجا با tab مناسب redirect می‌شوند.
 */
export default function HrTimePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as TimeTab | null;
  const initialTab: TimeTab = requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : 'schedule';
  const [tab, setTab] = useState<TimeTab>(initialTab);

  function handleChange(next: TimeTab) {
    setTab(next);
    router.replace(`/hr/time?tab=${next}`, { scroll: false });
  }

  return (
    <div className="p-4 lg:p-6 pt-2">
      <div className="max-w-5xl mx-auto space-y-4">
        <Tabs value={tab} onChange={handleChange} aria-label="زمان و حضور"
          items={[
            { value: 'schedule', label: 'برنامه شیفت' },
            { value: 'attendance', label: 'ثبت حضور' },
            { value: 'clock', label: 'ورود با مودم' },
            { value: 'approvals', label: 'تأییدها' },
            { value: 'timesheet', label: 'گزارش کارکرد' },
          ]} />
        <TabPanel value="schedule" active={tab === 'schedule'}>
          <ShiftScheduleView />
        </TabPanel>
        <TabPanel value="attendance" active={tab === 'attendance'}>
          <AttendanceView />
        </TabPanel>
        <TabPanel value="clock" active={tab === 'clock'}>
          <ClockView />
        </TabPanel>
        <TabPanel value="approvals" active={tab === 'approvals'}>
          <ApprovalsView />
        </TabPanel>
        <TabPanel value="timesheet" active={tab === 'timesheet'}>
          <TimesheetView />
        </TabPanel>
      </div>
    </div>
  );
}
