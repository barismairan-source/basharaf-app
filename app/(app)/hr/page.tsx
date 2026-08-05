'use client';

import { Card, CardBody } from '@/components/ui';

/**
 * نمای کلی منابع انسانی — مرکز عملیات روزانه (کارت‌های «نیازمند اقدام»،
 * شاخص‌ها). ساخت کامل در فاز ۴ یکپارچه‌سازی HR انجام می‌شود؛ این نسخه‌ی
 * فعلی فقط جای‌گیر است تا مسیر `/hr` و آیتم «نمای کلی» در ناوبری بی‌مقصد نمانند.
 */
export default function HrOverviewPage() {
  return (
    <div className="p-4 lg:p-6 pt-2">
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardBody>
            <div className="text-[13px] text-stone-600">
              نمای کلی منابع انسانی (مرکز عملیات روزانه) در فاز بعدی تکمیل می‌شود.
              فعلاً از تب‌های بالا برای دسترسی به استخدام، افراد، زمان و حضور، و حقوق استفاده کنید.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
