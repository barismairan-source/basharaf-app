/**
 * منبع واحد سوال‌های غربال‌گری و تایپ سمت کلاینت برای استخدام.
 * این فایل drizzle import نمی‌کند تا هم در فرم عمومی و هم در پنل قابل استفاده باشد.
 *
 * ۴ سوال طوری نوشته شده که برای هر دو بخش (سالن و آشپزخانه) جواب بدهد.
 */

export interface ScreeningQuestion {
  id: string;
  title: string;
  prompt: string;
}

export const SCREENING_QUESTIONS: ReadonlyArray<ScreeningQuestion> = [
  {
    id: 'experience',
    title: 'تجربه کاری',
    prompt: 'آخرین جایی که کار کردی کجا بود و دقیقاً چه مسئولیتی داشتی؟',
  },
  {
    id: 'pressure',
    title: 'کار در فشار',
    prompt:
      'یک شیفت شلوغ را تصور کن که چند کار هم‌زمان روی هم تلنبار شده و عقب افتاده‌اید. در آن لحظه چطور اولویت‌بندی می‌کنی و چه کاری انجام می‌دهی؟',
  },
  {
    id: 'style',
    title: 'سبک کاری',
    prompt:
      'بیشتر به کارهای تکراری و طبق استاندارد علاقه داری یا کارهای متنوع و متغیر؟ چرا؟',
  },
  {
    id: 'planning',
    title: 'نظم و برنامه‌ریزی',
    prompt: 'تا چه حد برای کارهای روزانه‌ات برنامه‌ریزی می‌کنی و چقدر به برنامه پایبندی؟',
  },
];

export const QUESTION_IDS = SCREENING_QUESTIONS.map((q) => q.id);

export type ApplicationArea = 'hall' | 'kitchen';
export type ApplicationStatus = 'new' | 'shortlist' | 'accepted' | 'rejected';
export type ApplicantGender = 'male' | 'female';

export const AREA_LABELS: Record<ApplicationArea, string> = {
  hall: 'سالن',
  kitchen: 'آشپزخانه',
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'جدید',
  shortlist: 'لیست کوتاه',
  accepted: 'قبول',
  rejected: 'رد',
};

export const GENDER_LABELS: Record<ApplicantGender, string> = {
  male: 'آقا',
  female: 'خانم',
};

export type ShiftSlot = 'morning' | 'evening' | 'night' | 'weekend';
export type StartAvailability = 'immediate' | 'within_week' | 'after_week';
export type ReferralSource = 'instagram' | 'divar' | 'friend' | 'customer' | 'other';

export const SHIFT_LABELS: Record<ShiftSlot, string> = {
  morning: 'صبح',
  evening: 'عصر',
  night:   'شب',
  weekend: 'آخر هفته و تعطیلات',
};

export const START_LABELS: Record<StartAvailability, string> = {
  immediate:   'فوری',
  within_week: 'تا یک هفته',
  after_week:  'بیشتر از یک هفته',
};

export const REFERRAL_LABELS: Record<ReferralSource, string> = {
  instagram: 'اینستاگرام',
  divar:     'دیوار',
  friend:    'معرفی دوست یا همکار',
  customer:  'مشتری رستوران هستم',
  other:     'سایر',
};

export interface JobApplication {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  age: number | null;
  gender: ApplicantGender | null;
  city: string | null;
  hasResume: boolean;
  resumePath: string | null;
  manualInfo: string | null;
  answers: Record<string, string>;
  area: ApplicationArea | null;
  shiftAvailability: string[] | null;
  startAvailability: string | null;
  referralSource: string | null;
  status: ApplicationStatus;
  score: number | null;
  reviewerNote: string | null;
  customFields: Record<string, unknown>;
  fieldSnapshot: Array<{ key: string; label: string; type: string }>;
  createdAt: string;
  updatedAt: string;
}
