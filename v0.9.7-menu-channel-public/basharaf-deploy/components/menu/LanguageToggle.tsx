'use client';

import { useLanguage } from '@/lib/menu/i18n';

export function LanguageToggle() {
  const { language, setLanguage, mounted } = useLanguage();

  return (
    <div
      className="lang-toggle fixed top-4 end-4 z-50"
      style={{ opacity: mounted ? 1 : 0, transition: 'opacity 180ms ease-out' }}
      aria-hidden={!mounted}
    >
      <div
        role="group"
        aria-label="Language"
        className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/80 p-0.5 shadow-dropdown backdrop-blur-md"
      >
        <ToggleButton
          active={language === 'en'}
          onClick={() => setLanguage('en')}
          label="EN"
          ariaLabel="Switch to English"
        />
        <ToggleButton
          active={language === 'fa'}
          onClick={() => setLanguage('fa')}
          label="FA"
          ariaLabel="تغییر به فارسی"
        />
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={[
        'min-w-[2.5rem] rounded-full px-3 py-1.5 text-xs font-medium tracking-wider',
        'transition-colors duration-200 ease-out',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
