'use client';

import { useEffect, useState } from 'react';
import { LanguageToggle } from '@/components/menu/LanguageToggle';
import { MenuSection } from '@/components/menu/MenuSection';
import { useLanguage } from '@/lib/menu/i18n';
import { DEFAULT_FA_FONT } from '@/lib/menu/fonts';
import type { MenuSection as MenuSectionType, MenuSettings } from '@/types';

export default function PublicMenuPage() {
  const { pick, mounted } = useLanguage();
  const [sections, setSections] = useState<MenuSectionType[]>([]);
  const [settings, setSettings] = useState<MenuSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/menu', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setSections(d.sections ?? []);
        setSettings(d.settings ?? null);
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const font = settings?.faFont || DEFAULT_FA_FONT;
    document.documentElement.setAttribute('data-fa-font', font);
  }, [settings]);

  const footerLine = pick('All prices in Toman. Allergens on request.', 'قیمت‌ها به تومان است. اطلاعات حساسیت غذایی را از پرسنل بپرسید.');
  const loadingLabel = pick('Loading menu…', 'در حال بارگذاری منو…');
  const address = pick(settings?.addressEn, settings?.addressFa);

  return (
    <div className={['menu-root', mounted ? 'animate-fade-in' : ''].join(' ')}>
      <LanguageToggle />
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 sm:px-8 sm:pt-28">
        {/* عنوان hard-code حذف شد؛ بعداً جای لوگو اینجاست */}

        <div className="mt-4">
          {loading && <p className="py-20 text-center text-muted-foreground">{loadingLabel}</p>}
          {error && <p className="py-20 text-center text-sm" style={{ color: 'hsl(350 89% 41%)' }}>{pick('Error: ', 'خطا: ')}{error}</p>}
          {!loading && !error && sections.map(section => <MenuSection key={section.id} section={section} />)}
          {!loading && !error && sections.every(s => s.items.every(i => !i.isAvailable)) && (
            <p className="py-20 text-center text-muted-foreground">{pick('The menu is being updated.', 'منو در حال به‌روزرسانی است.')}</p>
          )}
        </div>

        <footer className="mt-24 border-t border-border pt-8 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">{footerLine}</p>
          {(settings?.phone || address || settings?.instagram) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {settings?.phone && <a href={`tel:${settings.phone}`} dir="ltr" className="underline-offset-2 hover:text-foreground hover:underline">{settings.phone}</a>}
              {address && <span>{address}</span>}
              {settings?.instagram && <a href={`https://instagram.com/${settings.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" dir="ltr" className="underline-offset-2 hover:text-foreground hover:underline">@{settings.instagram.replace(/^@/, '')}</a>}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
