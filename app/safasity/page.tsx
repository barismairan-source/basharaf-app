'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { UtensilsCrossed, Briefcase, Instagram, Phone, Link2, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HubItem, HubItemKind, HubSettings } from '@/types';

const KIND_STYLE: Record<HubItemKind, { icon: typeof Link2; badge: string }> = {
  menu:      { icon: UtensilsCrossed, badge: 'bg-amber-100 text-amber-700' },
  apply:     { icon: Briefcase,       badge: 'bg-sky-100 text-sky-700' },
  instagram: { icon: Instagram,       badge: 'bg-gradient-to-br from-fuchsia-500 to-amber-400 text-white' },
  phone:     { icon: Phone,           badge: 'bg-emerald-100 text-emerald-700' },
  custom:    { icon: Link2,           badge: 'bg-stone-100 text-stone-600' },
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

  const [hero, ...rest] = items;

  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-14 sm:pt-16">
      <header className="text-center">
        <div className="relative mx-auto mb-1 h-[68px] w-[204px]">
          <Image src="/safasity-wordmark.png" alt={settings?.title || 'صفاسیتی'} fill className="object-contain" priority />
        </div>
        {settings?.bio && <p className="mt-1 text-sm text-muted-foreground">{settings.bio}</p>}
      </header>

      {loading && (
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="col-span-2 h-16 animate-pulse rounded-2xl bg-muted" />
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-8 grid animate-fade-in grid-cols-2 gap-3">
          {hero && <HubTile item={hero} featured />}
          {rest.map((item, i) => (
            <HubTile key={item.id} item={item} featured={i === rest.length - 1 && rest.length % 2 === 1} />
          ))}
        </div>
      )}

      {!loading && settings?.showQr && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <canvas ref={qrRef} className="rounded-lg" />
          <p className="mt-3 text-xs text-muted-foreground">برای دیدن منو اسکن کنید</p>
        </div>
      )}

      {!loading && settings?.addressFa && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
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
              className="flex items-center justify-center gap-1.5 border-t border-border py-3 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <Navigation size={13} strokeWidth={1.5} /> مسیریابی در گوگل‌مپ
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function HubTile({ item, featured }: { item: HubItem; featured?: boolean }) {
  const { icon: Icon, badge } = KIND_STYLE[item.kind];
  const external = isExternal(item);
  return (
    <a
      href={item.url}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        featured ? 'col-span-2 px-5 py-4' : 'col-span-1 flex-col justify-center gap-2.5 px-4 py-6 text-center',
      )}
    >
      <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', badge)}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <span className={cn('font-medium text-foreground', featured ? 'flex-1 text-[15px]' : 'text-[13px] leading-snug')}>
        {item.label}
      </span>
    </a>
  );
}
