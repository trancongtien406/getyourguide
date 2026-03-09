'use client';

import { referenceDataApi, type City } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HiOutlineLocationMarker, HiOutlineSearch } from 'react-icons/hi';

// ── Fuzzy matching helpers ──────────────────────────────────────────────
/** Normalise Vietnamese diacritics + lowercase for comparison */
function normalise(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Find the best-matching city (fuzzy) from a list */
function findClosestCity(query: string, cities: City[]): City | null {
  if (!query || cities.length === 0) return null;
  const q = normalise(query);
  let bestCity: City | null = null;
  let bestScore = Infinity;

  for (const city of cities) {
    const n = normalise(city.name);
    // Exact sub-string match → perfect
    if (n.includes(q) || q.includes(n)) return city;
    const dist = levenshtein(q, n);
    if (dist < bestScore) {
      bestScore = dist;
      bestCity = city;
    }
  }
  // Only accept if distance is reasonable (≤ 50 % of query length)
  return bestScore <= Math.max(3, Math.ceil(q.length * 0.5)) ? bestCity : null;
}

// ── Component ───────────────────────────────────────────────────────────

interface CitySearchDropdownProps {
  /** 'hero' = large (homepage hero), 'navbar' = compact (navbar), 'mobile' = mobile menu */
  variant: 'hero' | 'navbar' | 'mobile';
  /** Extra class names on the root wrapper */
  className?: string;
}

export function CitySearchDropdown({ variant, className = '' }: CitySearchDropdownProps) {
  const t = useTranslations('public');
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [loadingCities, setLoadingCities] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch cities once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCities(true);
      try {
        const res = await referenceDataApi.listCities({ pageSize: '50' });
        if (!cancelled && res?.data) setCities(res.data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingCities(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter cities by query (fuzzy-aware)
  const normalQ = normalise(query);
  const filtered = query.trim()
    ? cities.filter((c) => normalise(c.name).includes(normalQ))
    : cities;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Navigate to tour listing by city
  const selectCity = useCallback(
    (city: City) => {
      setQuery(city.name);
      setOpen(false);
      router.push(`/tours?city=${city.id}`);
    },
    [router],
  );

  // Handle form submission – find closest city even if typed wrong
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      // Exact or substring filter match first
      const exactMatch = cities.find((c) => normalise(c.name) === normalise(trimmed));
      if (exactMatch) { selectCity(exactMatch); return; }

      // Try fuzzy
      const closest = findClosestCity(trimmed, cities);
      if (closest) { selectCity(closest); return; }

      // Fallback: pass as free-text query
      router.push(`/tours?q=${encodeURIComponent(trimmed)}`);
      setOpen(false);
    },
    [query, cities, selectCity, router],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          selectCity(filtered[highlightIdx]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlightIdx(-1); }, [query]);

  // ── Variant-specific styles ──────────────────────────────────────────
  const isHero = variant === 'hero';
  const isNavbar = variant === 'navbar';

  const wrapperClass = isHero
    ? `w-full max-w-3xl ${className}`
    : isNavbar
      ? `hidden md:block flex-1 max-w-md ${className}`
      : `w-full ${className}`;

  const formClass = isHero
    ? 'bg-white dark:bg-slate-900 p-2 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row gap-2'
    : isNavbar
      ? 'relative group'
      : 'relative';

  const inputClass = isHero
    ? 'w-full border-none focus:ring-0 bg-transparent text-lg placeholder:text-slate-400 text-slate-900 dark:text-white'
    : 'w-full pl-10 pr-20 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-400';

  const mobileInputClass =
    'w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm text-slate-900 dark:text-white placeholder:text-slate-400';

  const dropdownTop = isHero ? 'top-full mt-2' : 'top-full mt-1';

  // Fuzzy suggestion when user typed something that doesn't exactly match
  const fuzzyHint =
    query.trim() && filtered.length === 0 ? findClosestCity(query, cities) : null;

  return (
    <div ref={wrapperRef} className={`relative ${wrapperClass}`}>
      <form onSubmit={handleSubmit} className={formClass}>
        {/* Hero layout */}
        {isHero && (
          <>
            <div className="flex-1 relative flex items-center px-4">
              <HiOutlineSearch className="text-slate-400 mr-2 w-5 h-5 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                className={inputClass}
                placeholder={t('heroSearchPlaceholder')}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white text-lg font-bold px-10 py-4 rounded-xl md:rounded-full transition-all"
            >
              {t('search')}
            </button>
          </>
        )}

        {/* Navbar layout */}
        {isNavbar && (
          <>
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5 z-10" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              className={inputClass}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors z-10"
            >
              {t('search')}
            </button>
          </>
        )}

        {/* Mobile layout */}
        {variant === 'mobile' && (
          <>
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              className={mobileInputClass}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
            />
          </>
        )}
      </form>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute ${dropdownTop} left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-72 overflow-y-auto`}
        >
          {loadingCities ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400 animate-pulse">
              {t('loading')}
            </div>
          ) : (
            <>
              {/* Section header */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {query.trim() ? t('searchResultsCities') : t('popularCities')}
                </p>
              </div>

              {filtered.length > 0 ? (
                filtered.map((city, idx) => (
                  <button
                    key={city.id}
                    type="button"
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      idx === highlightIdx
                        ? 'bg-primary-50 dark:bg-primary/10 text-primary'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => selectCity(city)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                  >
                    <HiOutlineLocationMarker className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium">{city.name}</span>
                  </button>
                ))
              ) : fuzzyHint ? (
                /* Fuzzy suggestion */
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-400 mb-2">{t('didYouMean')}</p>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-primary bg-primary-50 dark:bg-primary/10 rounded-lg hover:bg-primary-100 dark:hover:bg-primary/20 transition-colors"
                    onClick={() => selectCity(fuzzyHint)}
                  >
                    <HiOutlineLocationMarker className="w-4 h-4 shrink-0" />
                    {fuzzyHint.name}
                  </button>
                </div>
              ) : query.trim() ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  {t('noCitiesFound')}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
