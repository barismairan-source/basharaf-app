import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border bg-surface',
          'text-[13.5px] text-text placeholder:text-muted/60',
          'focus:outline-none focus:ring-2 resize-none leading-7 transition-colors',
          hasError
            ? 'border-danger focus:border-danger focus:ring-danger/40'
            : 'border-border focus:border-accent focus:ring-accent/40',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
