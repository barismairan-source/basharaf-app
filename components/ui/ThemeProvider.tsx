'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store';
import type { AccentColor } from '@/types';

export const ACCENT_PRESETS: Record<AccentColor, { accent: string; accentSubtle: string; accentHover: string; label: string }> = {
  blue:    { accent: '#2563eb', accentSubtle: '#eff6ff', accentHover: '#1d4ed8', label: 'آبی'       },
  violet:  { accent: '#7c3aed', accentSubtle: '#f5f3ff', accentHover: '#6d28d9', label: 'بنفش'      },
  emerald: { accent: '#059669', accentSubtle: '#ecfdf5', accentHover: '#047857', label: 'سبز'        },
  orange:  { accent: '#ea580c', accentSubtle: '#fff7ed', accentHover: '#c2410c', label: 'نارنجی'     },
  pink:    { accent: '#db2777', accentSubtle: '#fdf2f8', accentHover: '#be185d', label: 'صورتی'      },
  teal:    { accent: '#0d9488', accentSubtle: '#f0fdfa', accentHover: '#0f766e', label: 'فیروزه‌ای'  },
};

export function ThemeProvider() {
  const accentColor = useAppStore((s) => s.preferences.accentColor);

  useEffect(() => {
    const preset = ACCENT_PRESETS[accentColor] ?? ACCENT_PRESETS.blue;
    const root = document.documentElement;
    root.style.setProperty('--accent',        preset.accent);
    root.style.setProperty('--accent-subtle', preset.accentSubtle);
    root.style.setProperty('--accent-hover',  preset.accentHover);
  }, [accentColor]);

  return null;
}
