'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { toFa } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { StatementDay } from '@/lib/staff-panel/statements';

/** رنگ‌های برند صفاسیتی (Safasity assets — Oct 14) */
export const SF = { navy: '#3A4454', ink: '#1A1F2A', cream: '#F5F1E8', card: '#FBF9F4', gold: '#B38B59', goldText: '#7F6139', burgundy: '#6C1E1F', line: '#D9D0BF' } as const;

export type DoodleName = 'notebook' | 'table' | 'chair' | 'sieve' | 'cutlery' | 'cutleryCream' | 'cat' | 'plate';
const DOODLES: Record<DoodleName, { src: string; w: number; h: number }> = {
  notebook: { src: '/safasity/me-notebook.png', w: 217, h: 220 },
  table: { src: '/safasity/me-table.png', w: 206, h: 220 },
  chair: { src: '/safasity/me-chair.png', w: 205, h: 220 },
  sieve: { src: '/safasity/me-sieve.png', w: 161, h: 220 },
  cutlery: { src: '/safasity/me-cutlery.png', w: 105, h: 220 },
  cutleryCream: { src: '/safasity/me-cutlery-cream.png', w: 105, h: 220 },
  cat: { src: '/safasity/cat.png', w: 420, h: 286 },
  plate: { src: '/safasity/doodle-plate.png', w: 400, h: 200 },
};

export function Doodle({ name, size = 40, className, faint = false }: { name: DoodleName; size?: number; className?: string; faint?: boolean }) {
  const d = DOODLES[name];
  return (
    <Image src={d.src} alt="" aria-hidden width={d.w} height={d.h} unoptimized
      className={cn('select-none', faint && 'opacity-30', className)} style={{ width: size, height: 'auto' }} />
  );
}

/** کارت کرم با حاشیه‌ی نازک مثل کارت‌های صفحه‌ی صفاسیتی. */
export function SfCard({ children, className, tone = 'card' }: { children: ReactNode; className?: string; tone?: 'card' | 'navy' | 'gold' }) {
  return (
    <section
      className={cn('rounded-2xl p-4', tone === 'navy' ? 'text-[#F5F1E8]' : 'sf-card', className)}
      style={tone === 'navy' ? { background: SF.navy } : tone === 'gold' ? { background: '#F3EADB', border: '1px solid #E6D6B8' } : undefined}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1">
      <h2 className="sf-hand text-[17px]" style={{ color: SF.navy }}>{children}</h2>
      {aside}
    </div>
  );
}

export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div className="text-center">
      <div className="text-[18px] font-semibold" style={{ color: SF.ink }}>{value}</div>
      <div className="text-[11.5px]" style={{ color: '#5E6676' }}>{label}</div>
      {hint && <div className="text-[10.5px]" style={{ color: '#7A8090' }}>{hint}</div>}
    </div>
  );
}

export function EmptyDoodle({ doodle = 'cat', title, sub }: { doodle?: DoodleName; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Doodle name={doodle} size={doodle === 'cat' ? 120 : 64} faint />
      <p className="text-[14px]" style={{ color: SF.navy }}>{title}</p>
      {sub && <p className="max-w-[260px] text-[12px]" style={{ color: '#5E6676' }}>{sub}</p>}
    </div>
  );
}

export function HoursBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: '#E9E5DB' }} role="img" aria-label={`${toFa(String(value))} ساعت`}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SF.navy }} />
    </div>
  );
}

/** حرف اختصاری روزهای هفته مثل تقویم‌های فارسی؛ نام کامل برای صفحه‌خوان در aria-label می‌آید. */
const WEEKDAY_LETTER: Record<string, string> = { 'یکشنبه': 'ی', 'دوشنبه': 'د', 'سه‌شنبه': 'س', 'چهارشنبه': 'چ', 'پنجشنبه': 'پ', 'جمعه': 'ج' };

const CODE_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  'صبح': { bg: '#F3EADB', fg: SF.goldText, label: 'صبح' },
  'شب': { bg: '#E3E6EC', fg: SF.navy, label: 'شب' },
  'صبح+شب': { bg: SF.navy, fg: SF.cream, label: 'صبح و شب' },
  'کوتاه': { bg: '#EFDCDC', fg: SF.burgundy, label: 'کوتاه' },
  'آف': { bg: 'transparent', fg: '#8A8F9C', label: 'آف' },
};

export function codeStyle(code: string) {
  return CODE_STYLE[code] ?? { bg: '#EAE4D8', fg: SF.navy, label: code };
}

/** شش روز یک هفته (یکشنبه تا جمعه) با رنگ نوع شیفت. روز خارج از ماه کم‌رنگ و بدون عدد است. */
export function WeekDays({ days }: { days: StatementDay[] }) {
  return (
    <ol className="grid grid-cols-6 gap-1.5" aria-label="روزهای هفته">
      {days.map((d, i) => {
        const st = codeStyle(d.code);
        const outside = d.date === null;
        return (
          <li key={i} className="rounded-xl px-1 py-1.5 text-center" style={{ background: outside ? 'transparent' : st.bg, border: `1px solid ${outside ? 'transparent' : d.code === 'آف' ? SF.line : 'transparent'}`, opacity: outside ? 0.35 : 1 }}>
            <div className="text-[11px]" style={{ color: st.fg }} aria-label={d.weekday}>{WEEKDAY_LETTER[d.weekday] ?? d.weekday}</div>
            <div className="text-[13px] font-semibold" style={{ color: st.fg }}>{d.date === null ? '·' : toFa(String(d.date))}</div>
            <div className="text-[10px] leading-tight" style={{ color: st.fg }}>{d.code === 'آف' ? '—' : st.label}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function WeekLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: '#5E6676' }}>
      {(['صبح', 'شب', 'صبح+شب', 'کوتاه'] as const).map((c) => (
        <li key={c} className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: codeStyle(c).bg }} aria-hidden />
          {codeStyle(c).label}
          <span className="text-[10px]" style={{ color: '#7A8090' }}>
            ({c === 'کوتاه' ? '۵ ساعت' : c === 'صبح+شب' ? '۱۶ ساعت' : '۸ ساعت'})
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface NavItem<T extends string> { value: T; label: string; doodle: DoodleName }

/** نوار پایین شبیه اپ موبایل: چهار آیکن دودل برند. */
export function BottomNav<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: ReadonlyArray<NavItem<T>> }) {
  return (
    <nav aria-label="بخش‌های پنل من" className="fixed inset-x-0 bottom-0 z-20 border-t" style={{ background: 'rgba(251,249,244,0.96)', borderColor: SF.line, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const active = it.value === value;
          return (
            <li key={it.value}>
              <button type="button" onClick={() => onChange(it.value)} aria-current={active ? 'page' : undefined}
                className="flex w-full flex-col items-center gap-0.5 px-2 pb-2 pt-2.5" style={{ opacity: active ? 1 : 0.62 }}>
                <span className="flex h-9 items-end justify-center">
                  <Doodle name={it.doodle} size={it.doodle === 'sieve' ? 22 : 32} />
                </span>
                <span className="text-[11.5px]" style={{ color: SF.navy, fontWeight: active ? 700 : 400 }}>{it.label}</span>
                <span className="h-[3px] w-7 rounded-full" style={{ background: active ? SF.gold : 'transparent' }} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
