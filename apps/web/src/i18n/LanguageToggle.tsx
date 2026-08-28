import { useTranslation } from './language-context-core';

/** Simplified Union Jack, shown when the site is in Bulgarian to offer English. */
function UnionJackFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden="true">
      <rect width="30" height="20" fill="#00247d" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#cf142b" strokeWidth="1.6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6.5" />
      <path d="M15,0 V20 M0,10 H30" stroke="#cf142b" strokeWidth="4" />
    </svg>
  );
}

/** Simple Bulgarian tricolour, shown when the site is in English to offer Bulgarian. */
function BulgarianFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden="true">
      <rect width="30" height="6.67" y="0" fill="#fff" />
      <rect width="30" height="6.67" y="6.67" fill="#00966e" />
      <rect width="30" height="6.67" y="13.33" fill="#d62612" />
    </svg>
  );
}

const VARIANT_CLASSES = {
  /** For the dark brand-coloured headers on the booking page and admin layout. */
  dark: 'text-white/90 ring-1 ring-white/30 hover:bg-white/10',
  /** For plain white backgrounds, such as the login page. */
  light: 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
};

interface LanguageToggleProps {
  variant?: keyof typeof VARIANT_CLASSES;
}

export function LanguageToggle({ variant = 'dark' }: LanguageToggleProps) {
  const { language, toggle, t } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.language.toggleAriaLabel}
      title={t.language.toggleAriaLabel}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${VARIANT_CLASSES[variant]}`}
    >
      {language === 'bg' ? <UnionJackFlag /> : <BulgarianFlag />}
      <span className="hidden sm:inline">{language === 'bg' ? 'EN' : 'BG'}</span>
    </button>
  );
}
