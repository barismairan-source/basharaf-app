'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

export interface AdminColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface Props<T extends { id: string }> {
  rows: T[];
  columns: AdminColumn<T>[];
  searchKeys?: (keyof T)[];
  onRowClick?: (row: T) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  emptyText?: string;
}

export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys = [],
  onRowClick,
  selectedIds,
  onSelect,
  emptyText = 'موردی یافت نشد',
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || searchKeys.length === 0) return rows;
    return rows.filter(r =>
      searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(q))
    );
  }, [rows, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? '');
      const bv = String((b as Record<string, unknown>)[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv, 'fa') : bv.localeCompare(av, 'fa');
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      {searchKeys.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="جستجو..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full text-sm text-right">
          <thead className="bg-stone-800 text-stone-400 text-xs">
            <tr>
              {onSelect && <th className="w-10 px-3 py-2.5" />}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`px-3 py-2.5 font-medium ${col.sortable ? 'cursor-pointer select-none hover:text-stone-200' : ''} ${col.className ?? ''}`}
                  onClick={() => col.sortable && toggleSort(String(col.key))}
                >
                  <span className="flex items-center gap-1 justify-end">
                    {col.label}
                    {col.sortable && sortKey === String(col.key) && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelect ? 1 : 0)} className="px-3 py-8 text-center text-stone-500">
                  {emptyText}
                </td>
              </tr>
            ) : paged.map(row => (
              <tr
                key={row.id}
                className={`bg-stone-900 text-stone-200 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-stone-800' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {onSelect && (
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(row.id) ?? false}
                      onChange={e => onSelect(row.id, e.target.checked)}
                      className="accent-indigo-500"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={String(col.key)} className={`px-3 py-2.5 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>{sorted.length} مورد</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded bg-stone-800 disabled:opacity-40"
            >قبلی</button>
            <span className="px-2 py-1">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded bg-stone-800 disabled:opacity-40"
            >بعدی</button>
          </div>
        </div>
      )}
    </div>
  );
}
