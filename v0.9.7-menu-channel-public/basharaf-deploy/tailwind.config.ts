import type { Config } from 'tailwindcss';
import rtlPlugin from 'tailwindcss-rtl';

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
        // ─── Semantic tokens (single source of truth — change here, propagates everywhere)
        // These resolve to specific stone/emerald/rose/amber shades that match the prototype.
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Status tokens — these mirror the prototype's exact use of rose/emerald/amber
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          subtle: 'hsl(var(--success-subtle))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
          subtle: 'hsl(var(--danger-subtle))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          subtle: 'hsl(var(--warning-subtle))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
