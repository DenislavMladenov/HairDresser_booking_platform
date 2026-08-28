import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { setActiveLocale } from '../lib/format';
import {
  DICTIONARIES,
  LanguageContext,
  readStoredLanguage,
  STORAGE_KEY,
  type LanguageContextValue,
} from './language-context-core';
import type { Language } from './types';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  // Applied synchronously during render (not in an effect) so that
  // formatters called by children during this same render pass already
  // see the new locale, instead of lagging one render behind.
  setActiveLocale(language);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      t: DICTIONARIES[language],
      toggle: () => setLanguage((current) => (current === 'bg' ? 'en' : 'bg')),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
