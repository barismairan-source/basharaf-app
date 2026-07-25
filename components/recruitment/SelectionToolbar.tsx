'use client';

import { GitCompareArrows, Download, X } from 'lucide-react';
import { Button } from '@/components/ui';

export interface SelectionToolbarProps {
  count: number;
  onCompare: () => void;
  compareDisabledReason: string | null;
  onDownloadResumes: () => void;
  downloadDisabledReason: string | null;
  downloading: boolean;
  onClearSelection: () => void;
  onExit: () => void;
}

/**
 * SelectionToolbar — نوار انتخاب یکپارچه‌ی مقایسه/دانلود رزومه.
 *
 * قبلاً دو حالت جدا (compareMode با compareIds، resumeSelectMode با
 * selectedResumeIds) با دو نوار تقریباً یکسان وجود داشت — این‌جا یک
 * انتخاب واحد (`selectedIds`) هر دو اقدام را همزمان در دسترس می‌گذارد؛
 * اقدام نامعتبر (کمتر از ۲ برای مقایسه، بدون رزومه برای دانلود) به‌جای
 * پنهان شدن، غیرفعال می‌شود و دلیلش را نشان می‌دهد.
 */
export function SelectionToolbar({
  count,
  onCompare,
  compareDisabledReason,
  onDownloadResumes,
  downloadDisabledReason,
  downloading,
  onClearSelection,
  onExit,
}: SelectionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-bg px-4 py-2.5">
      <span className="text-[12px] text-text font-medium tabular-nums">
        {count === 0 ? 'روی کارت‌ها کلیک کنید تا داوطلبان را انتخاب کنید' : `${count} داوطلب انتخاب شده`}
      </span>

      <div className="flex-1" />

      <div className="flex flex-col items-end gap-0.5">
        <Button
          variant="default" size="sm" icon={GitCompareArrows}
          onClick={onCompare}
          disabled={!!compareDisabledReason}
          title={compareDisabledReason ?? undefined}
        >
          مقایسه
        </Button>
        {compareDisabledReason && count > 0 && (
          <span className="text-[10.5px] text-muted">{compareDisabledReason}</span>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <Button
          variant="default" size="sm" icon={Download}
          onClick={onDownloadResumes}
          disabled={!!downloadDisabledReason || downloading}
          loading={downloading}
          title={downloadDisabledReason ?? undefined}
        >
          دانلود رزومه‌ها
        </Button>
        {downloadDisabledReason && count > 0 && (
          <span className="text-[10.5px] text-muted">{downloadDisabledReason}</span>
        )}
      </div>

      {count > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearSelection}>پاک کردن انتخاب</Button>
      )}
      <Button variant="ghost" size="sm" icon={X} onClick={onExit}>خروج</Button>
    </div>
  );
}
