'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';

// ── پیش‌فرض‌های نام‌دار (برای backwards compat با localStorage قدیمی) ──
const LEGACY_NAMES: Record<string, string> = {
  blue:    '#2563eb',
  violet:  '#7c3aed',
  emerald: '#059669',
  orange:  '#ea580c',
  pink:    '#db2777',
  teal:    '#0d9488',
};

// پیش‌فرض‌های نمایشی برای picker در تنظیمات
export const ACCENT_PRESETS: Array<{ hex: string; label: string }> = [
  { hex: '#000000', label: 'مشکی'        },
  { hex: '#374151', label: 'خاکستری تیره' },
  { hex: '#1e3a5f', label: 'سرمه‌ای'     },
  { hex: '#2563eb', label: 'آبی'          },
  { hex: '#7c3aed', label: 'بنفش'         },
  { hex: '#0d9488', label: 'فیروزه‌ای'    },
  { hex: '#059669', label: 'سبز'          },
  { hex: '#d97706', label: 'طلایی'        },
  { hex: '#ea580c', label: 'نارنجی'       },
  { hex: '#db2777', label: 'صورتی'        },
];

// ── ابزار محاسبه‌ی رنگ ──────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

function computeTheme(hex: string): { accent: string; accentSubtle: string; accentHover: string } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { accent: '#2563eb', accentSubtle: '#eff6ff', accentHover: '#1d4ed8' };
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // رنگ‌های خیلی تیره (مشکی، خاکستری تیره) → hover کمی روشن‌تر
  // بقیه → hover کمی تیره‌تر
  const hover: [number, number, number] = luminance < 0.18
    ? [r + 40, g + 40, b + 40]
    : [r * 0.82, g * 0.82, b * 0.82];

  // subtle: ۹۲٪ سفید + ۸٪ رنگ
  const subtle: [number, number, number] = [
    r * 0.08 + 255 * 0.92,
    g * 0.08 + 255 * 0.92,
    b * 0.08 + 255 * 0.92,
  ];

  return {
    accent:        hex.startsWith('#') ? hex : `#${hex}`,
    accentSubtle:  toHex(...subtle),
    accentHover:   toHex(...hover),
  };
}

// ── Component ────────────────────────────────────────────────────────────
export function ThemeProvider() {
  const accentColor = useAppStore((s) => s.preferences.accentColor);
  const lastApplied = useRef<string>('');

  useEffect(() => {
    // backwards compat: اگر مقدار ذخیره‌شده نام قدیمی است (مثل 'blue')، به hex تبدیل کن
    const hex = LEGACY_NAMES[accentColor] ?? accentColor;
    if (hex === lastApplied.current) return;
    lastApplied.current = hex;

    const theme = computeTheme(hex);
    const root  = document.documentElement;
    root.style.setProperty('--accent',        theme.accent);
    root.style.setProperty('--accent-subtle', theme.accentSubtle);
    root.style.setProperty('--accent-hover',  theme.accentHover);
  }, [accentColor]);

  return null;
}
