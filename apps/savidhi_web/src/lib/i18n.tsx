'use client';

// Tiny custom i18n: no library, no routing changes. A `locale` cookie
// (default 'en') drives a React context that exposes `useT(key, vars?)`
// and `useLocale()`. Switching language re-renders the tree without a
// page reload.
//
// Why custom over next-intl: app is mostly `'use client'`, no plural/date
// formatting needs, and adding `/hi/...` URL routing would touch every
// internal Link. Cookie approach lets us ship the toggle today and
// upgrade to URL-based routing later if SEO calls for it.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import en from '@/messages/en.json';
import hi from '@/messages/hi.json';

export type Locale = 'en' | 'hi';
const COOKIE = 'locale';
const ONE_YEAR = 365 * 24 * 60 * 60;

type Messages = Record<string, string>;
const MESSAGES: Record<Locale, Messages> = { en: en as Messages, hi: hi as Messages };

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<LocaleCtx>({ locale: 'en', setLocale: () => {} });

function readCookie(): Locale {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)locale=(en|hi)/);
  return (m?.[1] as Locale) ?? 'en';
}

function writeCookie(l: Locale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE}=${l}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Server-side render: always 'en' (cookie is hydrated client-side).
  // Avoids hydration mismatch — the first paint is English regardless.
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = readCookie();
    if (stored !== locale) setLocaleState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = (l: Locale) => {
    writeCookie(l);
    setLocaleState(l);
  };

  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}

/**
 * Lookup a translation key. Falls back through:
 *   <locale>[key] → en[key] → key
 * so a missing Hindi translation degrades to English (not a blank).
 *
 * Supports {variable} interpolation: `t('greeting', { name: 'Smita' })`.
 */
export function useT() {
  const { locale } = useContext(Ctx);
  return (key: string, vars?: Record<string, string | number>): string => {
    const raw = MESSAGES[locale]?.[key] ?? MESSAGES.en[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  };
}

/** Read the current locale from a cookie at module scope (for axios interceptor). */
export function getLocaleFromCookie(): Locale {
  return readCookie();
}
