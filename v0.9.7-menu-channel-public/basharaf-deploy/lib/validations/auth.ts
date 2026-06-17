import { z } from 'zod';

/**
 * ─────────────────────────────────────────────────────────────────
 * Auth validation schemas.
 *
 * این schema‌ها هم در client (RHF resolver) و هم در فاز ۱۰ در سرور
 * (API route validation) استفاده می‌شوند — تک منبع حقیقت برای shape داده.
 *
 * پیام‌های خطا فارسی و user-friendly هستند.
 * ───────────────────────────────────────────────────────────────── */

const emailSchema = z
  .string({ required_error: 'ایمیل الزامی است' })
  .min(1, 'ایمیل الزامی است')
  .email('ایمیل معتبر وارد کنید')
  .max(254, 'ایمیل بیش از حد طولانی است')
  .transform((v) => v.trim().toLowerCase());

const passwordSchema = z
  .string({ required_error: 'رمز عبور الزامی است' })
  .min(1, 'رمز عبور الزامی است');

// برای signup سخت‌گیرتر — حداقل ۸ کاراکتر
const strongPasswordSchema = z
  .string({ required_error: 'رمز عبور الزامی است' })
  .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
  .max(128, 'رمز عبور بیش از حد طولانی است');

const nameSchema = z
  .string({ required_error: 'نام الزامی است' })
  .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
  .max(80, 'نام بیش از حد طولانی است')
  .transform((v) => v.trim());

// ─────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  remember: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─────────────────────────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: strongPasswordSchema,
    passwordConfirm: z
      .string({ required_error: 'تکرار رمز عبور الزامی است' })
      .min(1, 'تکرار رمز عبور الزامی است'),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, 'پذیرش قوانین الزامی است'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'رمز عبور و تکرار آن مطابقت ندارند',
    path: ['passwordConfirm'], // خطا به فیلد passwordConfirm متصل می‌شود
  });

export type SignupInput = z.infer<typeof signupSchema>;

// ─────────────────────────────────────────────────────────────────
// Forgot password
// ─────────────────────────────────────────────────────────────────

export const forgotSchema = z.object({
  email: emailSchema,
});

export type ForgotInput = z.infer<typeof forgotSchema>;
