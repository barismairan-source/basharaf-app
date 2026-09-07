'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { UtensilsCrossed, Briefcase, Instagram, Phone, Link2, MapPin, Navigation } from 'lucide-react';
import type { HubItem, HubItemKind, HubSettings } from '@/types';

const KIND_ICON: Record<HubItemKind, typeof Link2> = {
  menu: UtensilsCrossed, apply: Briefcase, instagram: Instagram, phone: Phone, custom: Link2,
};

/** لینک‌های داخلی (منو/استخدام) و tel: در همان تب باز می‌شوند؛ بقیه در تب جدید. */
function isExternal(item: HubItem): boolean {
  return item.kind === 'instagram' || (item.kind === 'custom' && /^https?:\/\//.test(item.url));
}

export default function SafasityHubPage() {
  const [items, setItems] = useState<HubItem[]>([]);
  const [settings, setSettings] = useState<HubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    let cancelled = false;
    fetch('/api/hub', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setItems(d.items ?? []); setSettings(d.settings ?? null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!settings?.showQr || !origin || !qrRef.current) return;
    QRCode.toCanvas(qrRef.current, `${origin}/safasity/menu`, {
      width: 168, margin: 1, color: { dark: '#1c1917', light: '#ffffff' },
    }).catch(() => {});
  }, [settings?.showQr, origin]);

  const mapEmbedSrc = settings?.addressFa
    ? `https://www.google.com/maps?q=${encodeURIComponent(settings.mapUrl || settings.addressFa)}&output=embed`
    : null;
  const mapLinkHref = settings?.mapUrl
    || (settings?.addressFa ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.addressFa)}` : null);

  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-16 sm:pt-20">
      <header className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-sm">
          <Image src="/logo.jpg" alt="صفاسیتی" width={80} height={80} className="h-full w-full object-cover" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{settings?.title || 'صفاسیتی'}</h1>
        {settings?.bio && <p className="mt-1.5 text-sm text-muted-foreground">{settings.bio}</p>}
      </header>

      <div className="mt-9 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        )}
        {!loading && items.map(item => {
          const Icon = KIND_ICON[item.kind];
          const external = isExternal(item);
          return (
            <a
              key={item.id}
              href={item.url}
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <Icon size={17} strokeWidth={1.5} />
              </span>
              <span className="flex-1 text-[15px] font-medium text-foreground">{item.label}</span>
            </a>
          );
        })}
      </div>

      {!loading && settings?.showQr && (
        <div className="mt-9 flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <canvas ref={qrRef} className="rounded-lg" />
          <p className="mt-3 text-xs text-muted-foreground">برای دیدن منو اسکن کنید</p>
        </div>
      )}

      {!loading && settings?.addressFa && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {mapEmbedSrc && (
            <iframe
              src={mapEmbedSrc}
              width="100%"
              height="180"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="موقعیت روی نقشه"
            />
          )}
          <div className="flex items-start gap-2.5 p-4">
            <MapPin size={16} strokeWidth={1.5} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
            <p className="flex-1 text-[13px] leading-relaxed text-foreground">{settings.addressFa}</p>
          </div>
          {mapLinkHref && (
            <a href={mapLinkHref} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 border-t border-border py-3 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted">
              <Navigation size={13} strokeWidth={1.5} /> مسیریابی در گوگل‌مپ
            </a>
          )}
        </div>
      )}
    </div>
  );
}
