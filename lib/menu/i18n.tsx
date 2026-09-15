'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'en' | 'fa';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggle: () => void;
  pick: <T,>(en: T, fa: T) => T;
  formatPrice: (price: number) => string;
  mounted: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initial = 'fa',
}: {
  children: ReactNode;
  initial?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initial);
  const [mounted, setMounted] = useState(false);

  // هر بازدید (هر بار اسکن QR یا باز کردن لینک) باید با فارسی شروع شود —
  // زبان قبلاً در مرورگر ذخیره می‌شد که باعث می‌شد یک مشتری که یک‌بار EN
  // را زده بود، هر بار بعدی هم منو را انگلیسی ببیند.
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.lang = language;
    html.dir = language === 'fa' ? 'rtl' : 'ltr';
    html.setAttribute('data-lang', language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggle = useCallback(
    () => setLanguage(language === 'fa' ? 'en' : 'fa'),
    [language, setLanguage],
  );

  const pick = useCallback(
    <T,>(en: T, fa: T): T => (language === 'fa' ? fa : en),
    [language],
  );

  const formatPrice = useCallback(
    (price: number): string => {
      // User confirmed: price is in raw Toman, displayed as "300 تومان" (FA)
      // or "300 Toman" (EN). No currency math, no multiplication.
      if (language === 'fa') {
        return `${new Intl.NumberFormat('fa-IR').format(price)} تومان`;
      }
      return `${new Intl.NumberFormat('en-US').format(price)} Toman`;
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, toggle, pick, formatPrice, mounted }),
    [language, setLanguage, toggle, pick, formatPrice, mounted],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
