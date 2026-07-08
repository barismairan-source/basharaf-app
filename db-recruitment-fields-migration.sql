-- Migration: فیلدهای جدید ماژول استخدام
-- اجرا در pgAdmin — additive, هیچ رکوردی نمی‌شکند
-- 2026-07-08

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS shift_availability jsonb,
  ADD COLUMN IF NOT EXISTS start_availability text,
  ADD COLUMN IF NOT EXISTS referral_source     text;
