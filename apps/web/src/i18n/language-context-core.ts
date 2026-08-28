import { createContext, useContext } from 'react';
import { bg } from './bg';
import { en } from './en';
import type { Language, Translations } from './types';

export const STORAGE_KEY = 'booking-language';
export const DICTIONARIES: Record<Language, Translations> = { bg, en };

export function readStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'bg';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'bg';
}

export interface LanguageContextValue {
  language: Language;
  t: Translations;
  toggle: () => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Split out of `LanguageContext.tsx` so that file can export only the
 * `LanguageProvider` component, which is what keeps Vite's fast refresh happy.
 */
export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  return context;
}
