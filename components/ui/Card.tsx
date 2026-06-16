import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — wrapper استاندارد برای بخش‌های boxed در UI.
 *
 * در پروتوتایپ این الگو همه‌جا تکرار می‌شد:
 *   <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
 *     <div className="px-5 py-3.5 border-b border-stone-100">
 *       <div className="text-[13.5px] text-stone-800">{title}</div>
 *       {sub && <div className="text-[11.5px] text-stone-400 mt-0.5">{sub}</div>}
 *     </div>
 *     <div className="p-5">{children}</div>
 *   </div>
 *
 * این کامپوننت آن الگو را تک‌نقطه می‌کند.
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Card — container کوچک با حاشیه و گرد. بدون padding داخلی.
 * برای padding از CardBody استفاده کنید یا padding خود بگذارید.
 */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border border-border rounded-lg bg-surface overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * CardHeader — هدر استاندارد یک Card با title، sub، و action (مثل دکمه).
 *
 * استفاده:
 *   <Card>
 *     <CardHeader title="آخرین تراکنش‌ها" action={<Button>مشاهده همه</Button>} />
 *     <CardBody>...</CardBody>
 *   </Card>
 */
export function CardHeader({
  title,
  sub,
  action,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between px-5 py-3.5 border-b border-border',
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-stone-800">{title}</div>
        {sub && (
          <div className="text-[11.5px] text-stone-400 mt-0.5">{sub}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * CardBody — محتوای داخل Card با padding استاندارد.
 *
 * استفاده: <CardBody>...</CardBody>
 * یا با padding سفارشی: <CardBody className="p-0">...</CardBody>
 */
export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}
