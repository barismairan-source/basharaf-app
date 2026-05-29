'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

/**
 * BranchPicker — انتخابگر شعبه فعلی در داشبورد.
 *
 * فقط برای SuperAdmin نمایش داده می‌شود.
 * BranchUser شعبه‌اش ثابت است و این کامپوننت رندر نمی‌شود.
 *
 * گزینه «همه شعب» معادل `branchFilter === null` است.
 * انتخاب یک شعبه خاص → `branchFilter = branch.id`.
 *
 * uiSlice مسئول state این انتخاب است.
 */
export function BranchPicker() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const branchFilter = useAppStore((s) => s.branchFilter);
  const setBranchFilter = useAppStore((s) => s.setBranchFilter);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // فقط برای SuperAdmin
  if (!user || user.role !== 'SuperAdmin') return null;

  const currentBranchName = branchFilter
    ? branches.find((b) => b.id === branchFilter)?.name ?? 'نامشخص'
    : 'همه شعب';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-stone-200 bg-white text-[12.5px] text-stone-700 hover:bg-stone-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 size={13} strokeWidth={1.5} aria-hidden="true" />
        <span>{currentBranchName}</span>
        <ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute start-0 top-11 w-56 bg-white border border-stone-200 rounded-md shadow-dropdown z-40 animate-fade-in overflow-hidden"
        >
          {/* همه شعب */}
          <button
            type="button"
            role="option"
            aria-selected={branchFilter === null}
            onClick={() => {
              setBranchFilter(null);
              setOpen(false);
            }}
            className={cn(
              'w-full px-3 py-2 flex items-center justify-between text-right text-[12.5px] transition-colors hover:bg-stone-50',
              branchFilter === null && 'bg-stone-50'
            )}
          >
            <span className="text-stone-800">همه شعب</span>
            {branchFilter === null && (
              <Check
                size={13}
                strokeWidth={1.5}
                className="text-stone-900"
                aria-hidden="true"
              />
            )}
          </button>

          <div className="h-px bg-stone-100" />

          {/* فهرست شعب */}
          {branches.map((b) => {
            const selected = branchFilter === b.id;
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setBranchFilter(b.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 flex items-center justify-between text-right text-[12.5px] transition-colors hover:bg-stone-50',
                  selected && 'bg-stone-50'
                )}
              >
                <span className="text-stone-800">{b.name}</span>
                {selected && (
                  <Check
                    size={13}
                    strokeWidth={1.5}
                    className="text-stone-900"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
