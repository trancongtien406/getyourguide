'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { referenceDataApi, type Currency as ApiCurrency, type Language as ApiLanguage } from './api';

/* ─── display types ─── */
export interface LocaleOption {
  code: string;
  label: string;
  flag: string;
}

export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

/* ─── flag map (best-effort) ─── */
const FLAG_MAP: Record<string, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  es: '🇪🇸',
  it: '🇮🇹',
  pt: '🇧🇷',
  ru: '🇷🇺',
  th: '🇹🇭',
};

const DEFAULT_LOCALE = 'vi';
const DEFAULT_CURRENCY = 'VND';
const DEFAULT_INTL_LOCALE = 'en-US';

/* ─── hardcoded fallbacks (used before API responds) ─── */
const FALLBACK_LOCALES: LocaleOption[] = [
  { code: DEFAULT_LOCALE, label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: DEFAULT_CURRENCY, label: 'Vietnamese Dong', symbol: '₫' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
];

/* ─── locale → Intl locale map ─── */
const INTL_LOCALE_MAP: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-BR',
  ru: 'ru-RU',
  th: 'th-TH',
};

function resolveIntlLocale(locale: string): string {
  const normalized = locale.replace('_', '-').trim();
  if (!normalized) return DEFAULT_INTL_LOCALE;

  const lang = normalized.split('-')[0]?.toLowerCase() ?? normalized.toLowerCase();
  const mapped = INTL_LOCALE_MAP[normalized] ?? INTL_LOCALE_MAP[lang];
  if (mapped) return mapped;

  try {
    new Intl.DateTimeFormat(normalized);
    return normalized;
  } catch {
    try {
      new Intl.DateTimeFormat(lang);
      return lang;
    } catch {
      return DEFAULT_INTL_LOCALE;
    }
  }
}

/* ─── cookie helpers ─── */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

/* ─── localStorage cache helpers ─── */
function getCachedList<T>(key: string): T[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

function setCachedList<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch { /* quota exceeded — ignore */ }
}

function getInitialLocales(): LocaleOption[] {
  return getCachedList<LocaleOption>('cachedLocales') ?? FALLBACK_LOCALES;
}

function getInitialCurrencies(): CurrencyOption[] {
  return getCachedList<CurrencyOption>('cachedCurrencies') ?? FALLBACK_CURRENCIES;
}

function getInitialCurrencyValue(): string {
  return getCookie('currency') ?? DEFAULT_CURRENCY;
}

/* ─── context ─── */
interface LocaleCurrencyContextType {
  locale: string;
  currency: string;
  intlLocale: string;
  locales: LocaleOption[];
  currencies: CurrencyOption[];
  switchLocale: (locale: string) => void;
  switchCurrency: (currency: string) => void;
  formatPrice: (amount: number, currencyOverride?: string) => string;
  formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (dateStr: string) => string;
}

const LocaleCurrencyContext = createContext<LocaleCurrencyContextType | null>(null);

/* ─── provider ─── */
export function LocaleCurrencyProvider({ children }: { children: ReactNode }) {
  const nextIntlLocale = useLocale();
  const router = useRouter();

  /* Dynamic lists — start with hardcoded fallbacks for SSR-safe hydration,
     then restore from cache in useEffect to avoid mismatch. */
  const [locales, setLocales] = useState<LocaleOption[]>(() => getInitialLocales());
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(() => getInitialCurrencies());
  const [currency, setCurrencyState] = useState<string>(getInitialCurrencyValue);

  const locale = nextIntlLocale;
  const intlLocale = resolveIntlLocale(locale);

  /* Fetch languages & currencies from CMS */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [langRes, curRes] = await Promise.all([
          referenceDataApi.listLanguages({ pageSize: '100' }),
          referenceDataApi.listCurrencies({ pageSize: '100' }),
        ]);

        if (cancelled) return;

        const langs: ApiLanguage[] = Array.isArray(langRes) ? langRes : (langRes as { data: ApiLanguage[] }).data ?? [];
        const curs: ApiCurrency[] = Array.isArray(curRes) ? curRes : (curRes as { data: ApiCurrency[] }).data ?? [];

        if (langs.length > 0) {
          const mapped: LocaleOption[] = langs.map((l) => ({
            code: l.code,
            label: l.name,
            flag: FLAG_MAP[l.code] ?? '🌐',
          }));
          setLocales(mapped);
          setCachedList('cachedLocales', mapped);
        }

        if (curs.length > 0) {
          const mapped: CurrencyOption[] = curs.map((c) => ({
            code: c.code,
            label: c.name,
            symbol: c.symbol ?? c.code,
          }));
          setCurrencies(mapped);
          setCachedList('cachedCurrencies', mapped);
          setCurrencyState((current) =>
            mapped.some((item) => item.code === current) ? current : mapped[0]?.code ?? DEFAULT_CURRENCY,
          );
        }
      } catch {
        /* keep fallbacks on error */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* sync currency cookie */
  useEffect(() => {
    setCookie('currency', currency);
  }, [currency]);

  const switchLocale = useCallback(
    (newLocale: string) => {
      if (newLocale === locale) return;
      setCookie('locale', newLocale);
      router.refresh();
    },
    [locale, router],
  );

  const switchCurrency = useCallback((newCurrency: string) => {
    if (newCurrency === currency) return;
    setCurrencyState(newCurrency);
    setCookie('currency', newCurrency);
    router.refresh();
  }, [currency, router]);

  const formatPrice = useCallback(
    (amount: number, currencyOverride?: string) => {
      const cur = currencyOverride || currency;
      try {
        return new Intl.NumberFormat(intlLocale, {
          style: 'currency',
          currency: cur,
          maximumFractionDigits: cur === 'VND' ? 0 : 2,
        }).format(amount);
      } catch {
        return `${amount.toLocaleString()} ${cur}`;
      }
    },
    [intlLocale, currency],
  );

  const formatDate = useCallback(
    (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
      return new Date(dateStr).toLocaleDateString(intlLocale, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      });
    },
    [intlLocale],
  );

  const formatTime = useCallback(
    (dateStr: string) => {
      return new Date(dateStr).toLocaleTimeString(intlLocale, {
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [intlLocale],
  );

  const value = useMemo(() => ({
    locale,
    currency,
    intlLocale,
    locales,
    currencies,
    switchLocale,
    switchCurrency,
    formatPrice,
    formatDate,
    formatTime,
  }), [locale, currency, intlLocale, locales, currencies, switchLocale, switchCurrency, formatPrice, formatDate, formatTime]);

  return (
    <LocaleCurrencyContext.Provider value={value}>
      {children}
    </LocaleCurrencyContext.Provider>
  );
}

/* ─── hook ─── */
export function useLocaleCurrency() {
  const ctx = useContext(LocaleCurrencyContext);
  if (!ctx) {
    throw new Error('useLocaleCurrency must be used within <LocaleCurrencyProvider>');
  }
  return ctx;
}
