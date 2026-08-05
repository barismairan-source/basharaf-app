import { describe, it, expect } from 'vitest';
import {
  canAccessSection, canAccessHr, canDo, sectionForPath, SECTIONS, CAPABILITIES,
} from '@/lib/auth/permissions';

describe('sectionForPath — مسیرهای منابع انسانی', () => {
  it('/hr و زیرمسیرهایش به بخش hr نگاشت می‌شوند', () => {
    expect(sectionForPath('/hr')).toBe('hr');
    expect(sectionForPath('/hr/people')).toBe('hr');
    expect(sectionForPath('/hr/time')).toBe('hr');
    expect(sectionForPath('/hr/payroll')).toBe('hr');
  });

  it('مسیرهای قدیمی shift-schedule/attendance هم اکنون بخش hr دارند (قبلاً هیچ‌کدام section نداشتند)', () => {
    expect(sectionForPath('/shift-schedule')).toBe('hr');
    expect(sectionForPath('/attendance')).toBe('hr');
  });

  it('مسیرهای قدیمی employees/payroll/recruitment روی کلید قدیمی خودشان می‌مانند (سازگاری)', () => {
    expect(sectionForPath('/employees')).toBe('employees');
    expect(sectionForPath('/payroll')).toBe('payroll');
    expect(sectionForPath('/recruitment')).toBe('recruitment');
  });
});

describe('canAccessHr — پل سازگاری', () => {
  it('SuperAdmin همیشه دسترسی دارد', () => {
    expect(canAccessHr({ role: 'SuperAdmin' })).toBe(true);
  });

  it('BranchUser بدون permissions صریح، طبق پیش‌فرض بخش hr دسترسی دارد', () => {
    expect(canAccessHr({ role: 'BranchUser' })).toBe(true);
  });

  it('Warehouse بدون permissions صریح، دسترسی ندارد (نه در defaultRoles بخش hr)', () => {
    expect(canAccessHr({ role: 'Warehouse' })).toBe(false);
  });

  it('کاربری با permission قدیمی «employees» (نه hr) هم از پل سازگاری عبور می‌کند', () => {
    expect(canAccessHr({ role: 'BranchUser', permissions: ['employees'] })).toBe(true);
  });

  it('کاربری با permission قدیمی «payroll» هم عبور می‌کند', () => {
    expect(canAccessHr({ role: 'Warehouse', permissions: ['payroll'] })).toBe(true);
  });

  it('کاربری با permissions صریح که هیچ‌کدام از ۴ کلید را ندارد، دسترسی ندارد', () => {
    expect(canAccessHr({ role: 'BranchUser', permissions: ['inventory'] })).toBe(false);
  });
});

describe('hr.* capabilities — پیش‌فرض‌ها', () => {
  it('همه‌ی ۱۹ کلید hr.* در CAPABILITIES تعریف شده‌اند', () => {
    const hrCaps = CAPABILITIES.filter(c => c.key.startsWith('hr.'));
    expect(hrCaps.length).toBe(19);
  });

  it('عملیات حساس (تأیید حضور، تأیید/ثبت حقوق، مدیریت نرخ) فقط پیش‌فرض SuperAdmin دارند', () => {
    expect(canDo({ role: 'BranchUser' }, 'hr.attendance.approve')).toBe(false);
    expect(canDo({ role: 'BranchUser' }, 'hr.payroll.approve')).toBe(false);
    expect(canDo({ role: 'BranchUser' }, 'hr.payroll.post')).toBe(false);
    expect(canDo({ role: 'BranchUser' }, 'hr.compensation.manage')).toBe(false);
    expect(canDo({ role: 'SuperAdmin' }, 'hr.attendance.approve')).toBe(true);
  });

  it('عملیات روزمره‌ی شعبه (ثبت حضور/مدیریت شیفت) پیش‌فرض BranchUser هم دارد', () => {
    expect(canDo({ role: 'BranchUser' }, 'hr.attendance.record')).toBe(true);
    expect(canDo({ role: 'BranchUser' }, 'hr.schedule.manage')).toBe(true);
  });

  it('اعطای صریح یک capability به BranchUser کار می‌کند حتی اگر پیش‌فرض نقش نباشد', () => {
    expect(canDo({ role: 'BranchUser', permissions: ['cap:hr.payroll.approve'] }, 'hr.payroll.approve')).toBe(true);
  });
});

describe('SECTIONS — بخش hr ثبت شده', () => {
  it('section جدید hr در فهرست SECTIONS هست', () => {
    expect(SECTIONS.some(s => s.key === 'hr')).toBe(true);
  });

  it('canAccessSection مستقیم روی hr هم طبق پیش‌فرض کار می‌کند', () => {
    expect(canAccessSection({ role: 'BranchUser' }, 'hr')).toBe(true);
    expect(canAccessSection({ role: 'Warehouse' }, 'hr')).toBe(false);
  });
});
