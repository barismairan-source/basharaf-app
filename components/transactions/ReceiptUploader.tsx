'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * ReceiptUploader — Drag & Drop آپلود رسید.
 *
 * ویژگی‌ها:
 * - Drag & Drop یا کلیک برای انتخاب فایل
 * - Preview تصویر (JPG/PNG/WebP)
 * - نمایش نام فایل برای PDF
 * - Progress نمایش
 * - حذف رسید موجود
 *
 * فرمت‌های مجاز: JPG، PNG، WebP، PDF (حداکثر ۵ مگابایت)
 */

interface ReceiptUploaderProps {
  txId: string;
  existingUrl?: string | null;
  onUploadSuccess?: (url: string) => void;
  onDeleteSuccess?: () => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_MB = 5;

export function ReceiptUploader({
  txId,
  existingUrl,
  onUploadSuccess,
  onDeleteSuccess,
  disabled,
}: ReceiptUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(existingUrl ?? null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // validation client-side
      if (!ALLOWED.includes(file.type)) {
        setError('فرمت نامعتبر. فقط JPG، PNG، WebP و PDF مجاز است.');
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`حجم فایل نباید بیش از ${MAX_MB} مگابایت باشد.`);
        return;
      }

      // preview برای تصاویر
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null); // PDF — فقط اسم نمایش داده می‌شود
      }

      setState('uploading');
      setProgress(0);

      // simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85));
      }, 200);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('txId', txId);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(progressInterval);
        setProgress(100);

        const json = (await res.json()) as { url?: string; error?: string };

        if (!res.ok || !json.url) {
          throw new Error(json.error ?? 'خطا در آپلود');
        }

        setCurrentUrl(json.url);
        if (file.type.startsWith('image/')) {
          setPreview(json.url);
        }

        setState('success');
        onUploadSuccess?.(json.url);

        // بعد از ۲ ثانیه به idle برگرد
        setTimeout(() => {
          setState('idle');
          setProgress(0);
        }, 2000);
      } catch (e) {
        clearInterval(progressInterval);
        setState('error');
        setError(e instanceof Error ? e.message : 'خطا در آپلود');
        setPreview(existingUrl ?? null);
        setProgress(0);
      }
    },
    [txId, existingUrl, onUploadSuccess]
  );

  async function handleDelete() {
    if (!currentUrl) return;
    setState('uploading');
    try {
      const res = await fetch(`/api/upload?txId=${txId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا در حذف');
      setCurrentUrl(null);
      setPreview(null);
      setState('idle');
      onDeleteSuccess?.();
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : 'خطا در حذف');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // reset برای آپلود مجدد همان فایل
  }

  const isUploading = state === 'uploading';

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!currentUrl && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-stone-500 bg-stone-50'
              : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50/50',
            (disabled || isUploading) && 'cursor-not-allowed opacity-60',
            state === 'error' && 'border-rose-300'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled || isUploading}
          />

          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 size={24} className="text-muted animate-spin" />
            ) : state === 'success' ? (
              <CheckCircle2 size={24} className="text-emerald-600" />
            ) : (
              <Upload size={24} className="text-muted" />
            )}

            <div className="text-[13px] text-stone-700">
              {isUploading
                ? 'در حال آپلود...'
                : state === 'success'
                  ? 'آپلود موفق!'
                  : 'فایل را اینجا بکشید یا کلیک کنید'}
            </div>

            {!isUploading && state !== 'success' && (
              <div className="text-[11px] text-muted">
                JPG، PNG، WebP، PDF — حداکثر {MAX_MB} مگابایت
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-100 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-stone-800 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
          <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
          <span className="text-[12px]">{error}</span>
        </div>
      )}

      {/* رسید موجود */}
      {currentUrl && (
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          {/* اگر تصویر است، preview نشان بده */}
          {preview && !preview.includes('.pdf') && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="رسید"
                className="w-full max-h-64 object-contain bg-stone-50"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white border-t border-stone-100">
            <div className="flex items-center gap-2 min-w-0">
              {preview && !preview.includes('.pdf') ? (
                <ImageIcon size={14} strokeWidth={1.5} className="text-muted flex-shrink-0" />
              ) : (
                <FileText size={14} strokeWidth={1.5} className="text-muted flex-shrink-0" />
              )}
              <span className="text-[12px] text-stone-600 truncate">رسید آپلود شده</span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-50 transition-colors"
              >
                <Eye size={12} strokeWidth={1.5} />
                مشاهده
              </a>

              {/* تغییر فایل */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-50 transition-colors disabled:opacity-40"
              >
                <Upload size={12} strokeWidth={1.5} />
                تغییر
              </button>

              {/* حذف */}
              {!disabled && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-40"
                >
                  <X size={12} strokeWidth={1.5} />
                  حذف
                </button>
              )}
            </div>

            {/* Hidden input برای تغییر فایل */}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || isUploading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
