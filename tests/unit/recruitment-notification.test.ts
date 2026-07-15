/**
 * تست‌های رگرسیون اعلان استخدام — فاز ۱
 *
 * سه خاصیت را ثابت می‌کند:
 *  ۱. notifyAdmins یک بار با entityId درخواست فراخوانی می‌شود
 *  ۲. خطای notification پاسخ 201 را تغییر نمی‌دهد (fire-and-forget)
 *  ۳. هیچ فیلد حساسی (شماره، رزومه، manualInfo، answers) به notifier نمی‌رسد
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks — باید قبل از هر import دیگری اعلان شوند ──────────────────────────
vi.mock('@/lib/notify', () => ({ notifyAdmins: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

// ── Imports after mocks ──────────────────────────────────────────────────────
import { notifyAdmins } from '@/lib/notify';
import { buildRecruitmentSub, fireRecruitmentNotification } from '@/lib/recruitment/notify';

const mockedNotify = vi.mocked(notifyAdmins);

beforeEach(() => {
  vi.clearAllMocks();
  mockedNotify.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// ۱. notifyAdmins یک بار با entityId درخواست فراخوانی می‌شود
// ─────────────────────────────────────────────────────────────────────────────
describe('fireRecruitmentNotification — فراخوانی notifyAdmins', () => {
  it('notifyAdmins را دقیقاً یک بار با entityId درخواست صدا می‌کند', async () => {
    fireRecruitmentNotification({
      id: 'app-uuid-abc',
      firstName: 'علی',
      lastName: 'احمدی',
      area: 'kitchen',
    });

    // اجازه می‌دهیم microtask queue تخلیه شود
    await Promise.resolve();

    expect(mockedNotify).toHaveBeenCalledOnce();
    const [params, , options] = mockedNotify.mock.calls[0]!;
    expect(params.entityId).toBe('app-uuid-abc');
    expect(params.ruleKey).toBe('recruitment.new_application');
    expect(params.type).toBe('info');
    expect(params.title).toBe('درخواست استخدام جدید');
    expect(params.actionUrl).toBe('/recruitment');
    expect(options).toEqual({ sms: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ۲. خطای notification پاسخ موفق را تغییر نمی‌دهد
// ─────────────────────────────────────────────────────────────────────────────
describe('fireRecruitmentNotification — fire-and-forget isolation', () => {
  it('وقتی notifyAdmins reject می‌کند، هیچ exception به بیرون نمی‌رسد', async () => {
    mockedNotify.mockRejectedValue(new Error('DB unavailable'));

    // این باید هیچ‌وقت throw نکند — درست مثل وقتی که route پاسخ 201 را برمی‌گرداند
    expect(() => {
      fireRecruitmentNotification({
        id: 'app-uuid-def',
        firstName: 'سارا',
        lastName: 'رضایی',
        area: 'hall',
      });
    }).not.toThrow();

    // تخلیه event loop تا rejection handler اجرا شود
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // notifyAdmins صدا خورد (تلاش انجام شد)
    expect(mockedNotify).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ۳. هیچ فیلد حساسی به notifier ارسال نمی‌شود
// ─────────────────────────────────────────────────────────────────────────────
describe('buildRecruitmentSub — بدون شماره، رزومه، یا فیلد حساس', () => {
  it('متن sub فقط شامل نام و برچسب فارسی بخش است', () => {
    expect(buildRecruitmentSub('علی', 'احمدی', 'kitchen')).toBe('علی احمدی — آشپزخانه');
    expect(buildRecruitmentSub('سارا', 'رضایی', 'hall')).toBe('سارا رضایی — تالار');
  });

  it('شماره تلفن، رزومه، یا base64 در متن sub نیست', () => {
    const sub = buildRecruitmentSub('علی', 'احمدی', 'kitchen');
    expect(sub).not.toMatch(/09\d{9}/);
    expect(sub).not.toContain('data:');
    expect(sub).not.toContain('base64');
    expect(sub).not.toContain('http');
  });

  it('برچسب انگلیسی hall/kitchen در متن sub نمایش داده نمی‌شود', () => {
    expect(buildRecruitmentSub('ت', 'ت', 'kitchen')).not.toContain('kitchen');
    expect(buildRecruitmentSub('ت', 'ت', 'hall')).not.toContain('hall');
  });

  it('پارامترهای notifyAdmins شامل phone/resumeUrl/manualInfo/answers نیستند', () => {
    fireRecruitmentNotification({ id: 'x', firstName: 'ت', lastName: 'ت', area: 'hall' });
    const [params] = mockedNotify.mock.calls[0]!;

    const SENSITIVE = ['phone', 'resumeUrl', 'resumePath', 'manualInfo', 'answers', 'customFields'];
    for (const field of SENSITIVE) {
      expect(Object.prototype.hasOwnProperty.call(params, field)).toBe(false);
    }
  });
});
