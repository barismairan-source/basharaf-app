'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Link2, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HubItem, HubItemKind, HubSettings } from '@/types';

/** آیکون‌های دست‌کشیده‌ی برند (public/safasity) — نوع‌هایی که آیکون اختصاصی ندارند lucide به رنگ سرمه‌ای می‌گیرند. */
const KIND_ICON: Partial<Record<HubItemKind, string>> = {
  menu: '/safasity/icon-menu.png',
  reserve: '/safasity/icon-reserve.png',
  apply: '/safasity/icon-apply.png',
  instagram: '/safasity/icon-instagram.png',
  phone: '/safasity/icon-phone.png',
  order: '/safasity/icon-order.png',
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
      width: 168, margin: 1, color: { dark: '#3A4454', light: '#FBF9F4' },
    }).catch(() => {});
  }, [settings?.showQr, origin]);

  const mapEmbedSrc = settings?.addressFa
    ? `https://www.google.com/maps?q=${encodeURIComponent(settings.mapUrl || settings.addressFa)}&output=embed`
    : null;
  const mapLinkHref = settings?.mapUrl
    || (settings?.addressFa ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.addressFa)}` : null);

  const [hero, ...rest] = items;

  return (
    <div className="relative mx-auto max-w-md overflow-hidden px-6 pb-20 pt-14 sm:pt-16">
      <Image
        src="/safasity/brush.png" alt="" aria-hidden width={844} height={526} priority
        className="pointer-events-none absolute -left-6 top-[-34px] w-[380px] max-w-none opacity-[0.16] select-none"
      />

      <header className="relative text-center">
        <div className="relative mx-auto mb-1 h-[68px] w-[204px]">
          <Image src="/safasity/wordmark.png" alt={settings?.title || 'صفاسیتی'} fill sizes="204px" className="object-contain" priority />
        </div>
        {settings?.bio && <p className="mt-1 text-sm text-muted-foreground">{settings.bio}</p>}
      </header>

      {loading && (
        <div className="relative mt-8 grid grid-cols-2 gap-3">
          <div className="col-span-2 h-20 animate-pulse rounded-2xl bg-muted" />
          {[0, 1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="relative mt-8 grid animate-fade-in grid-cols-2 gap-3">
          {hero && <HubTile item={hero} featured />}
          {rest.map((item, i) => (
            <HubTile key={item.id} item={item} featured={i === rest.length - 1 && rest.length % 2 === 1} />
          ))}
        </div>
      )}

      {!loading && settings?.showQr && (
        <div className="sf-card relative mt-6 flex flex-col items-center rounded-2xl p-6 text-center">
          <canvas ref={qrRef} className="rounded-lg" />
          <p className="mt-3 text-xs text-muted-foreground">برای دیدن منو اسکن کنید</p>
        </div>
      )}

      {!loading && settings?.addressFa && (
        <div className="sf-card relative mt-4 overflow-hidden rounded-2xl">
          {mapEmbedSrc && (
            <iframe
              src={mapEmbedSrc}
              width="100%"
              height="180"
              style={{ border: 0, display: 'block', filter: 'sepia(0.25) saturate(0.85)' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="موقعیت روی نقشه"
            />
          )}
          <div className="flex items-start gap-2.5 p-4">
            <MapPin size={16} strokeWidth={1.75} className="sf-gold mt-0.5 flex-shrink-0" />
            <p className="flex-1 text-[13px] leading-relaxed text-foreground">{settings.addressFa}</p>
          </div>
          {mapLinkHref && (
            <a href={mapLinkHref} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 border-t border-border py-3 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <Navigation size={13} strokeWidth={1.75} /> مسیریابی در گوگل‌مپ
            </a>
          )}
        </div>
      )}

      {!loading && (
        <footer className="relative mt-10 flex flex-col items-center gap-2">
          <Image src="/safasity/cat.png" alt="" aria-hidden width={420} height={286} className="h-auto w-[132px] opacity-90" />
          <Image src="/safasity/logo-fa.png" alt="صفاسیتی" width={600} height={223} className="h-auto w-[88px] opacity-70" />
        </footer>
      )}
    </div>
  );
}

function HubIcon({ kind, size }: { kind: HubItemKind; size: number }) {
  const src = KIND_ICON[kind];
  if (src) {
    return <Image src={src} alt="" aria-hidden width={size} height={size} className="flex-shrink-0 object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex flex-shrink-0 items-center justify-center text-foreground" style={{ width: size, height: size }}>
      <Link2 size={Math.round(size * 0.55)} strokeWidth={1.75} />
    </span>
  );
}

function HubTile({ item, featured }: { item: HubItem; featured?: boolean }) {
  const external = isExternal(item);
  return (
    <a
      href={item.url}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn(
        'sf-card flex items-center gap-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-8px_rgba(58,68,84,0.35)] active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B38B59] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F1E8]',
        featured ? 'col-span-2 px-5 py-4' : 'col-span-1 flex-col justify-center gap-3 px-4 py-6 text-center',
      )}
    >
      <HubIcon kind={item.kind} size={featured ? 60 : 76} />
      <span className={cn('sf-hand text-foreground', featured ? 'flex-1 text-[19px]' : 'text-[17px] leading-snug')}>
        {item.label}
      </span>
    </a>
  );
}
