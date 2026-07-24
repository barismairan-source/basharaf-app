import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** خط جداکننده‌ی بالای بخش — برای دومین/سومین بخش پشت‌سرهم در یک فرم */
  divider?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormSection — گروه‌بندی فیلدهای فرم زیر یک عنوان اختیاری.
 *
 * الگویی که یک‌جا می‌کند: `<div className="space-y-3"><h3>...</h3>...</div>`
 * که در مودال‌های ویرایش (پرسنل، حقوق) و ویزاردهای چندبخشی دستی تکرار
 * می‌شد — گاهی با `border-t pt-3` جداکننده، گاهی بدون آن.
 *
 * استفاده:
 *   <FormSection title="اطلاعات پایه">
 *     <Field label="نام"><Input ... /></Field>
 *   </FormSection>
 *   <FormSection title="اطلاعات بانکی" divider>
 *     <Field label="شماره شبا"><Input ... /></Field>
 *   </FormSection>
 */
export function FormSection({ title, description, divider, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-3', divider && 'border-t border-border pt-4', className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && <h3 className="text-[13px] font-medium text-text">{title}</h3>}
          {description && <p className="text-[11.5px] text-muted">{description}</p>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
