import type { TransactionStatus } from '@/types';

export const COLORS = {
  income: '#16a34a',
  expense: '#e11d48',
  transfer: '#78716c',
  success: '#16a34a',
  danger: '#e11d48',
  warning: '#d97706',
  neutral: '#78716c',
  stone500: '#78716c',
} as const;

export const STATUS_COLORS: Record<TransactionStatus, { bg: string; text: string; border: string }> = {
  approved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  pending:  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  rejected: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  proforma: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
};
