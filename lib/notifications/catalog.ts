/**
 * Notification rule catalog — single typed source of truth.
 *
 * Every rule key that can produce an admin-facing notification is listed
 * here with its Persian metadata, so the SuperAdmin UI never has to guess
 * a label/category/threshold-unit from a raw DB row.
 *
 * `audienceConfigurable: false` marks rules that are NOT broadcast alerts —
 * e.g. `pending_approval` only ever notifies the exact creator of the
 * transaction being approved (a single targeted user chosen by the event
 * itself, via lib/notify.ts's `notify()`), never a SuperAdmin audience.
 * These must never get a "گیرندگان" (recipients) button in the UI and
 * must never be resolved through the audience system.
 */

import type { SectionKey, CapabilityKey } from '@/lib/auth/permissions';
import type { OutboxChannel } from './types';

export type RuleCategory =
  | 'مالی و تراکنش‌ها'
  | 'انبار و خرید'
  | 'چک‌ها'
  | 'استخدام'
  | 'دستیار مالی'
  | 'سیستم';

export type ThresholdType = 'amount' | 'days' | 'percent' | 'count' | null;

export interface RuleCatalogEntry {
  key: string;
  title: string;
  description: string;
  category: RuleCategory;
  /** Short Persian explanation of what fires this rule. */
  trigger: string;
  /** Channels this rule is technically capable of using (UI-level; DB row still gates each). */
  channels: readonly OutboxChannel[];
  /** In-app is always implicitly supported; listed separately since it isn't an OutboxChannel. */
  supportsInApp: boolean;
  thresholdType: ThresholdType;
  thresholdUnit: string | null;
  /** Section a recipient must have access to before receiving this rule's details. null = no gate (matches current behavior). */
  requiredSection: SectionKey | null;
  /** Additional capability gate beyond section access, if any. */
  requiredCapability: CapabilityKey | null;
  /** True when the underlying event belongs to a specific branch (enables "event_branch" targeting). */
  branchAware: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  /**
   * False for personal/single-recipient workflow notifications that reuse
   * a rule key only for the enabled/disabled gate — never audience-resolved,
   * never shown with a recipients editor.
   */
  audienceConfigurable: boolean;
  /** Hidden from the grouped SuperAdmin rule list (internal/test utility rules). */
  hiddenFromUi?: boolean;
}

export const RULE_CATALOG: readonly RuleCatalogEntry[] = [
  {
    key: 'pending_approval',
    title: 'تأیید تراکنش (شخصی)',
    description: 'وقتی تراکنش یک کاربر تأیید می‌شود، فقط همان کاربر مطلع می‌شود.',
    category: 'مالی و تراکنش‌ها',
    trigger: 'تأیید یک تراکنش توسط ادمین — به ثبت‌کننده‌ی همان تراکنش اطلاع داده می‌شود.',
    channels: [],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: null,
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'low',
    audienceConfigurable: false,
  },
  {
    key: 'high_value_tx',
    title: 'تراکنش با مبلغ بالا',
    description: 'اعلان وقتی تراکنشی با مبلغ بالاتر از آستانه تأیید می‌شود.',
    category: 'مالی و تراکنش‌ها',
    trigger: 'تأیید تراکنشی با مبلغ ≥ آستانه‌ی تعیین‌شده.',
    channels: ['sms', 'email'],
    supportsInApp: true,
    thresholdType: 'amount',
    thresholdUnit: 'تومان',
    requiredSection: 'transactions',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'high',
    audienceConfigurable: true,
  },
  {
    key: 'low_stock',
    title: 'موجودی ناکافی هنگام فروش منو',
    description: 'اعلان وقتی کسر خودکار انبار برای فروش منو با کمبود موجودی مواجه می‌شود.',
    category: 'انبار و خرید',
    trigger: 'فروش یک آیتم منو با موجودی ناکافی مواد اولیه.',
    channels: ['sms', 'email'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: 'inventory',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'voucher_pending',
    title: 'برگه انبار در انتظار تأیید',
    description: 'اعلان به تأییدکننده‌های انبار وقتی برگه‌ی جدیدی نیاز به تأیید دارد.',
    category: 'انبار و خرید',
    trigger: 'ثبت یا درون‌ریزی دسته‌ای یک برگه‌ی انبار با وضعیت در انتظار.',
    channels: ['sms', 'email'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: 'inventory',
    requiredCapability: 'inventory.approve',
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'inventory_clamp',
    title: 'کسری موجودی هنگام کسر انبار',
    description: 'اعلان وقتی کسر مقدار درخواستی به‌خاطر نبود موجودی کافی محدود (clamp) می‌شود.',
    category: 'انبار و خرید',
    trigger: 'کسر انبار با مقدار درخواستی بیشتر از موجودی واقعی.',
    channels: ['email'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: 'inventory',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'po_received',
    title: 'مغایرت دریافت سفارش خرید',
    description: 'اعلان وقتی مقدار/مبلغ دریافت‌شده‌ی یک سفارش خرید با سفارش ثبت‌شده مغایرت دارد.',
    category: 'انبار و خرید',
    trigger: 'ثبت رسید سفارش خرید با مغایرت نسبت به سفارش اصلی.',
    channels: ['sms', 'email'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: 'inventory',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'cheque.dueSoon',
    title: 'چک نزدیک به سررسید',
    description: 'اعلان وقتی سررسید یک چک ثبت‌شده نزدیک است.',
    category: 'چک‌ها',
    trigger: 'ثبت یک چک با سررسید در بازه‌ی آستانه‌ی روزهای مانده.',
    channels: ['sms', 'email'],
    supportsInApp: true,
    thresholdType: 'days',
    thresholdUnit: 'روز',
    requiredSection: null,
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'recruitment.new_application',
    title: 'درخواست استخدام جدید',
    description: 'اعلان به SuperAdminها هنگام ثبت فرم استخدام توسط متقاضی.',
    category: 'استخدام',
    trigger: 'ثبت یک درخواست جدید در فرم /apply.',
    channels: ['sms', 'email'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: 'recruitment',
    requiredCapability: null,
    branchAware: false,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'waste_spike',
    title: 'جهش ضایعات',
    description: 'اعلان وقتی ثبت ضایعات یک قلم به‌طور غیرعادی بالا می‌رود.',
    category: 'دستیار مالی',
    trigger: 'ثبت ضایعات با انحراف بالا از میانگین.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: 'percent',
    thresholdUnit: 'درصد',
    requiredSection: 'anomaly',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'below_approval_limit',
    title: 'الگوی تقسیم زیر سقف تأیید',
    description: 'اعلان وقتی الگوی تراکنش‌ها نشان‌دهنده‌ی تلاش برای دور زدن سقف تأیید است.',
    category: 'دستیار مالی',
    trigger: 'چند تراکنش نزدیک به هم و زیر آستانه‌ی تأیید.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: 'count',
    thresholdUnit: 'تراکنش',
    requiredSection: 'anomaly',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'high',
    audienceConfigurable: true,
  },
  {
    key: 'consumption_spike',
    title: 'جهش مصرف انبار',
    description: 'اعلان وقتی مصرف روزانه‌ی یک قلم انبار به‌طور غیرعادی بالا می‌رود.',
    category: 'دستیار مالی',
    trigger: 'مصرف روزانه به‌طور محسوس بالاتر از میانگین هفتگی.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: 'percent',
    thresholdUnit: 'درصد',
    requiredSection: 'anomaly',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'rejection_pattern',
    title: 'الگوی رد مکرر',
    description: 'اعلان وقتی تراکنش‌های یک کاربر به‌طور مکرر رد می‌شوند.',
    category: 'دستیار مالی',
    trigger: 'چند رد پیاپی تراکنش از یک ثبت‌کننده.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: 'count',
    thresholdUnit: 'مورد',
    requiredSection: 'anomaly',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'price_jump',
    title: 'جهش قیمت خرید',
    description: 'اعلان وقتی قیمت خرید یک قلم نسبت به خرید قبلی جهش زیادی دارد.',
    category: 'دستیار مالی',
    trigger: 'ثبت خرید با قیمت واحد به‌طور محسوس بالاتر از خرید قبلی.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: 'percent',
    thresholdUnit: 'درصد',
    requiredSection: 'anomaly',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'off_hours_activity',
    title: 'فعالیت خارج از ساعت کاری',
    description: 'اعلان وقتی رویدادی مالی/انبار خارج از ساعت‌های معمول کاری ثبت می‌شود.',
    category: 'دستیار مالی',
    trigger: 'ثبت رویداد خارج از بازه‌ی ساعت کاری تعریف‌شده.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: 'anomaly',
    requiredCapability: null,
    branchAware: true,
    sensitivity: 'medium',
    audienceConfigurable: true,
  },
  {
    key: 'sms.test_notify',
    title: 'تست پیامک (سیستمی)',
    description: 'قانون داخلی برای تست مسیر کامل ارسال — فقط از تنظیمات SMS قابل اجراست.',
    category: 'سیستم',
    trigger: 'دکمه‌ی «تست از مسیر واقعی» در تنظیمات پیامک.',
    channels: ['sms'],
    supportsInApp: true,
    thresholdType: null,
    thresholdUnit: null,
    requiredSection: null,
    requiredCapability: null,
    branchAware: false,
    sensitivity: 'low',
    audienceConfigurable: true,
    hiddenFromUi: true,
  },
] as const;

export function getCatalogEntry(ruleKey: string): RuleCatalogEntry | undefined {
  return RULE_CATALOG.find((r) => r.key === ruleKey);
}

export function isAudienceConfigurable(ruleKey: string): boolean {
  return getCatalogEntry(ruleKey)?.audienceConfigurable ?? true;
}

export const RULE_CATEGORIES: readonly RuleCategory[] = [
  'مالی و تراکنش‌ها',
  'انبار و خرید',
  'چک‌ها',
  'استخدام',
  'دستیار مالی',
  'سیستم',
];
