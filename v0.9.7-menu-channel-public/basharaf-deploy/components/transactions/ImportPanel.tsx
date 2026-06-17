'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';
import { useAppStore } from '@/store';

export function ImportPanel({ onDone }: { onDone?: () => void }) {
  const showToast = useAppStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate() {
    try {
      const res = await fetch('/api/transactions/import/template', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'basharaf-transactions-template.xlsx';
      a.click(); URL.revokeObjectURL(url);
    } catch { showToast('خطا در دانلود تمپلیت', 'danger'); }
  }

  async function doImport() {
    if (!file) { showToast('فایل اکسل را انتخاب کنید', 'danger'); return; }
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/transactions/import', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({ imported: data.imported, errors: [] });
        showToast(`${data.imported} تراکنش وارد شد`, 'success');
        setFile(null); if (inputRef.current) inputRef.current.value = '';
        onDone?.();
      } else {
        setResult({ imported: 0, errors: data.errors ?? (data.error ? [data.error] : ['خطای نامشخص']) });
      }
    } catch { showToast('خطا در ورود فایل', 'danger'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <Button variant="default" size="sm" icon={FileSpreadsheet} onClick={() => setOpen(v => !v)}>
        ورود دسته‌ای
      </Button>

      {open && (
        <Card className="mt-3">
          <div className="px-4 pt-4 flex items-center justify-between">
            <span className="text-[14px] font-medium">ورود دسته‌ای تراکنش‌ها از اکسل</span>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700"><X size={16} /></button>
          </div>
          <CardBody>
            <div className="space-y-4">
              <div className="text-[12px] text-stone-500 leading-relaxed">
                ۱. اول تمپلیت را دانلود کنید و پر کنید. <br />
                ۲. نام شعبه، صندوق، دسته و طرف‌حساب باید <b>دقیقاً</b> مثل سیستم باشد (اگر پیدا نشود، آن ردیف خطا می‌گیرد و هیچ تراکنشی وارد نمی‌شود).
              </div>

              <Button variant="default" size="sm" icon={Download} onClick={downloadTemplate}>دانلود تمپلیت اکسل</Button>

              <label className="flex items-center gap-2 border border-dashed border-stone-300 rounded-lg p-3 cursor-pointer hover:border-stone-400">
                <Upload size={16} className="text-stone-400" />
                <span className="text-[12.5px] text-stone-600 flex-1 truncate">{file ? file.name : 'فایل اکسل پرشده را انتخاب کنید'}</span>
                <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
              </label>

              <Button variant="primary" onClick={doImport} loading={busy} icon={busy ? undefined : FileSpreadsheet} disabled={!file}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : null} ورود به سیستم
              </Button>

              {result && result.imported > 0 && (
                <div className="flex items-center gap-2 text-[13px] text-emerald-700 bg-emerald-50 rounded-lg p-3">
                  <CheckCircle2 size={16} /> {result.imported} تراکنش با موفقیت وارد شد.
                </div>
              )}
              {result && result.errors.length > 0 && (
                <div className="bg-rose-50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[12.5px] text-rose-700 font-medium">
                    <AlertTriangle size={15} /> هیچ تراکنشی وارد نشد — این ردیف‌ها را اصلاح کنید:
                  </div>
                  <ul className="text-[11.5px] text-rose-600 space-y-0.5 mt-1 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
