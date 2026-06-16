import type { Config } from 'tailwindcss';
import rtlPlugin from 'tailwindcss-rtl';
import { colors as dt, fontSize as dtFs } from './lib/design/tokens';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Vazirmatn is loaded via next/font in app/layout.tsx and exposed as --font-vazir
        sans: ['var(--font-vazir)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ─── CSS-var-backed tokens (dark-mode-ready, defined in globals.css)
        border:     'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        success: {
          DEFAULT:    'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          subtle:     'hsl(var(--success-subtle))',
        },
        danger: {
          DEFAULT:    'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
          subtle:     'hsl(var(--danger-subtle))',
        },
        warning: {
          DEFAULT:    'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          subtle:     'hsl(var(--warning-subtle))',
        },

        // ─── lib/design/tokens.ts — semantic tokens (single source of truth)
        // کامپوننت‌ها از این کلاس‌ها استفاده کنند: bg-bg, bg-surface, text-text,
        // text-muted, bg-accent, text-accent, text-ok, text-warn, text-danger و غیره.
        bg:              dt.bg,
        surface:         dt.surface,
        text:            dt.text,
        accent:          dt.accent,
        'accent-subtle': dt['accent-subtle'],
        ok:              dt.ok,
        'ok-subtle':     dt['ok-subtle'],
        warn:            dt.warn,
        'warn-subtle':   dt['warn-subtle'],
        'danger-subtle': dt['danger-subtle'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontSize: {
        // گام‌های جدید که در مقیاس پیش‌فرض Tailwind وجود ندارند
        '2xs': dtFs['2xs'],   // 10px — کوچک‌ترین برچسب
        md:    dtFs.md,        // 13px — بین xs(12px) و sm(14px) Tailwind
      },
      keyframes: {
        // Mirrored 1:1 from the prototype's <style> block
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideForward: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideBack: {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        // For RTL, slide-left should visually mean "slide from inline-start"
        // The prototype slides the detail panel from translateX(-24px) → 0
        slideLeft: {
          from: { transform: 'translateX(-24px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 220ms ease-out',
        'slide-left': 'slideLeft 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slide-up': 'slideUp 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'auth-forward': 'slideForward 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'auth-back': 'slideBack 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      boxShadow: {
        // Soft Notion-style elevations from the prototype
        dropdown: '0 8px 24px -8px rgba(0,0,0,0.12)',
        popover: '0 12px 32px -8px rgba(0,0,0,0.14)',
        modal: '0 24px 48px -16px rgba(0,0,0,0.18)',
        panel: '-12px 0 32px -16px rgba(0,0,0,0.12)',
        toast: '0 12px 32px -8px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [rtlPlugin],
};

export default config;
