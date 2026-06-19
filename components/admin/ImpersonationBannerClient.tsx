'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  targetName: string;
  targetRole: string;
}

export function ImpersonationBannerClient({ targetName, targetRole }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function endImpersonation() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/impersonate/end', { method: 'POST' });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white flex items-center justify-between px-4 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>
          حالت جعل هویت فعال — در حال مشاهده به‌عنوان <strong>{targetName}</strong>
          <span className="mr-1 opacity-80">({targetRole})</span>
        </span>
      </div>
      <button
        onClick={endImpersonation}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-60"
      >
        <X size={12} />
        {loading ? '...' : 'پایان جعل هویت'}
      </button>
    </div>
  );
}
