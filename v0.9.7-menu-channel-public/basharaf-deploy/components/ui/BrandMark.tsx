import { cn } from '@/lib/utils';

export interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * BrandMark — لوگوی «با شرف».
 *
 * یک مربع تیره با آیکن صندوق پول داخلش — همان طراحی پروتوتایپ.
 * آیکن inline SVG است نه lucide، چون این علامت تجاری ماست و
 * نباید با import lucide تصادفاً تغییر کند.
 *
 * استفاده:
 *   <BrandMark size={36} />          // پیش‌فرض، در auth header
 *   <BrandMark size={28} />          // در sidebar
 *   <BrandMark size={26} />          // در sidebar فشرده
 */
export function BrandMark({ size = 36, className }: BrandMarkProps) {
  const innerSize = size * 0.55;

  return (
    <div
      className={cn(
        'rounded-lg bg-stone-900 flex items-center justify-center flex-shrink-0',
        className
      )}
      style={{ width: size, height: size }}
      aria-label="با شرف"
      role="img"
    >
      <svg
        width={innerSize}
        height={innerSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 7.5C5 6.4 5.9 5.5 7 5.5h10c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-9Z"
          stroke="white"
          strokeWidth="1.5"
        />
        <circle cx="15.5" cy="12" r="1.25" fill="white" />
        <path d="M5 9.5h14" stroke="white" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
