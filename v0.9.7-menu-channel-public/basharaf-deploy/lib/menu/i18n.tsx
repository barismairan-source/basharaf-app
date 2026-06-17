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
const STORAGE_KEY = 'safasiti.menu.lang';

export function LanguageProvider({
  children,
  initial = 'fa',
}: {
  children: ReactNode;
  initial?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'fa') setLanguageState(stored);
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.lang = language;
    html.dir = language === 'fa' ? 'rtl' : 'ltr';
    html.setAttribute('data-lang', language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
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
