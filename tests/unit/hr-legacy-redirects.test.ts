import { describe, it, expect } from 'vitest';
import { rewriteLegacyHrPath } from '@/middleware';

describe('rewriteLegacyHrPath — redirect مسیرهای قدیمی HR', () => {
  it('/employees → /hr/people', () => {
    expect(rewriteLegacyHrPath('/employees')).toEqual({ path: '/hr/people' });
  });

  it('/payroll → /hr/payroll', () => {
    expect(rewriteLegacyHrPath('/payroll')).toEqual({ path: '/hr/payroll' });
  });

  it('/recruitment → /hr/recruitment (زیرمسیر هم حفظ می‌شود)', () => {
    expect(rewriteLegacyHrPath('/recruitment')).toEqual({ path: '/hr/recruitment' });
    expect(rewriteLegacyHrPath('/recruitment/form-builder')).toEqual({ path: '/hr/recruitment/form-builder' });
  });

  it('/shift-schedule → /hr/time با tab=schedule', () => {
    expect(rewriteLegacyHrPath('/shift-schedule')).toEqual({ path: '/hr/time', extraParams: { tab: 'schedule' } });
  });

  it('/attendance → /hr/time با tab=attendance', () => {
    expect(rewriteLegacyHrPath('/attendance')).toEqual({ path: '/hr/time', extraParams: { tab: 'attendance' } });
  });

  it('مسیرهای جدید /hr/* اصلاً rewrite نمی‌شوند', () => {
    expect(rewriteLegacyHrPath('/hr')).toBeNull();
    expect(rewriteLegacyHrPath('/hr/people')).toBeNull();
    expect(rewriteLegacyHrPath('/hr/time')).toBeNull();
  });

  it('مسیرهای بی‌ربط rewrite نمی‌شوند', () => {
    expect(rewriteLegacyHrPath('/dashboard')).toBeNull();
    expect(rewriteLegacyHrPath('/employeesFoo')).toBeNull();
  });
});
