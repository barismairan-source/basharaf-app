import { z } from 'zod';

/**
 * Settings validation schemas.
 *
 * این schemaها برای فرم‌های CRUD در صفحات تنظیمات استفاده می‌شوند.
 * در فاز ۱۰ همین schemaها در API routes هم استفاده می‌شوند.
 */

// ─────────────────────────────────────────────────────────────────
// User (Team management)
// ─────────────────────────────────────────────────────────────────

export const userSchema = z
  .object({
    name: z
      .string({ required_error: 'نام الزامی است' })
      .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
      .max(80)
      .transform((v) => v.trim()),
    email: z
      .string({ required_error: 'ایمیل الزامی است' })
      .email('ایمیل معتبر وارد کنید')
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
    role: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef'], {
      required_error: 'نقش الزامی است',
    }),
    assignedBranch: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    // invariant: BranchUser باید شعبه داشته باشد
    if ((data.role === 'BranchUser' || data.role === 'Warehouse' || data.role === 'Chef') && !data.assignedBranch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'برای کاربر شعبه باید یک شعبه انتخاب کنید',
        path: ['assignedBranch'],
      });
    }
    // SuperAdmin نباید شعبه داشته باشد
    if (data.role === 'SuperAdmin' && data.assignedBranch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'مدیر کل نمی‌تواند به شعبه‌ی خاصی تخصیص یابد',
        path: ['assignedBranch'],
      });
    }
  });

export type UserFormInput = z.infer<typeof userSchema>;

// ─────────────────────────────────────────────────────────────────
// Branch
// ─────────────────────────────────────────────────────────────────

export const branchSchema = z.object({
  name: z
    .string({ required_error: 'نام شعبه الزامی است' })
    .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
    .max(60)
    .transform((v) => v.trim()),
  address: z
    .string({ required_error: 'آدرس الزامی است' })
    .min(5, 'آدرس باید کامل وارد شود')
    .max(200)
    .transform((v) => v.trim()),
  manager: z
    .string({ required_error: 'نام مدیر شعبه الزامی است' })
    .min(2)
    .max(80)
    .transform((v) => v.trim()),
  opened: z
    .string({ required_error: 'تاریخ افتتاح الزامی است' })
    .min(1, 'تاریخ افتتاح الزامی است'),
  openingDate: z.string().nullable().optional(),
});

export type BranchFormInput = z.infer<typeof branchSchema>;

// ─────────────────────────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z
    .string({ required_error: 'نام دسته الزامی است' })
    .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
    .max(40)
    .transform((v) => v.trim()),
});

export type CategoryFormInput = z.infer<typeof categorySchema>;

// ─────────────────────────────────────────────────────────────────
// Profile (self-edit)
// ─────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z
    .string({ required_error: 'نام الزامی است' })
    .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
    .max(80)
    .transform((v) => v.trim()),
  email: z
    .string({ required_error: 'ایمیل الزامی است' })
    .email('ایمیل معتبر وارد کنید')
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
});

export type ProfileFormInput = z.infer<typeof profileSchema>;
