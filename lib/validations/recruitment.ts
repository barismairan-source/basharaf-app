import { z } from 'zod';

/**
 * یک منبع validation مشترک بین فرم عمومی (RHF) و API.
 * شماره موبایل ایران ساده: 09 + ۹ رقم.
 */

const phoneRe = /^09\d{9}$/;

export const applicationCreateSchema = z.object({
  firstName: z.string().min(2, 'نام را وارد کنید').max(60).transform((v) => v.trim()),
  lastName: z.string().min(2, 'نام خانوادگی را وارد کنید').max(60).transform((v) => v.trim()),
  phone: z
    .string()
    .transform((v) => v.replace(/[^0-9]/g, ''))
    .refine((v) => phoneRe.test(v), 'شماره موبایل معتبر نیست (مثل 09123456789)'),
  age: z.coerce.number().int().min(14, 'سن معتبر نیست').max(80),
  gender: z.enum(['male', 'female'], { required_error: 'جنسیت را انتخاب کنید' }),
  city: z.string().min(2, 'محل سکونت را وارد کنید').max(80).transform((v) => v.trim()),
  hasResume: z.boolean().default(false),
  resumeUrl: z.string().max(8_000_000).optional().nullable(), // base64 data URI — تا ۶MB فایل
  resumePath: z.string().max(300).optional().nullable(),
  manualInfo: z.string().max(2000).optional().nullable(),
  answers: z.record(z.string(), z.string().max(2000)).default({}),
  area: z.enum(['hall', 'kitchen'], { required_error: 'بخش را انتخاب کنید' }),
  shiftAvailability: z.array(z.string()).min(1, 'حداقل یک شیفت انتخاب کنید').optional().nullable(),
  startAvailability: z.enum(['immediate', 'within_week', 'after_week']).optional().nullable(),
  referralSource: z.string().max(50).optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).default({}),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;

export const applicationReviewSchema = z.object({
  status: z.enum(['new', 'shortlist', 'accepted', 'rejected']).optional(),
  score: z.number().int().min(1).max(5).nullable().optional(),
  area: z.enum(['hall', 'kitchen']).nullable().optional(),
  reviewerNote: z.string().max(1000).nullable().optional(),
});

export type ApplicationReviewInput = z.infer<typeof applicationReviewSchema>;
