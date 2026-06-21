-- Migration: financial_periods table
-- Phase 2: Financial Period Close (قفل دوره مالی)
-- Run this once in pgAdmin on the production database.
-- Idempotent: all statements use IF NOT EXISTS / IF EXISTS guards.

CREATE TABLE IF NOT EXISTS financial_periods (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  jalali_year  INTEGER   NOT NULL,
  jalali_month INTEGER   NOT NULL CHECK (jalali_month BETWEEN 1 AND 12),
  closed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fp_year_month_uidx UNIQUE (jalali_year, jalali_month)
);

CREATE INDEX IF NOT EXISTS fp_year_idx ON financial_periods(jalali_year);
