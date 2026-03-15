'use client';

import { TourCard } from '@/components/public/tour-card';
import { ToursFilters, type ToursFiltersState } from '@/components/public/tours-filters';
import { catalogApi, favoritesApi, newsletterApi, referenceDataApi, type Category, type City, type Tag, type Tour } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pagination } from '@/components/ui/table';
import {
  HiOutlineAdjustments,
  HiOutlineSortDescending,
  HiOutlineX,
} from 'react-icons/hi';

const DEFAULT_FILTER_STATE: ToursFiltersState = {
  cityId: '',
  categoryId: '',
  tagId: '',
  sortBy: 'recommended',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  maxDurationMinutes: '',
  dateFrom: '',
  dateTo: '',
};

function getFilterStateFromParams(params: URLSearchParams): ToursFiltersState {
  return {
    cityId: params.get('city') ?? '',
    categoryId: params.get('category') ?? '',
    tagId: params.get('tag') ?? '',
    sortBy: params.get('sortBy') ?? 'recommended',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    minRating: params.get('minRating') ?? '',
    maxDurationMinutes: params.get('maxDuration') ?? '',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
  };
}

function countActiveFilters(state: ToursFiltersState, query: string): number {
  let n = 0;
  if (state.cityId) n++;
  if (state.categoryId) n++;
  if (state.tagId) n++;
  if (state.minPrice || state.maxPrice) n++;
  if (state.minRating) n++;
  if (state.maxDurationMinutes) n++;
  if (state.dateFrom || state.dateTo) n++;
  if (state.sortBy && state.sortBy !== 'recommended') n++;
  if (query.trim()) n++;
  return n;
}

export default function ToursListingPage() {
  const t = useTranslations('public');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { locale, currency } = useLocaleCurrency();

  const query = searchParams.get('q') || '';
  const [filterState, setFilterState] = useState<ToursFiltersState>(() =>
    getFilterStateFromParams(searchParams),
  );
  const [searchInput, setSearchInput] = useState(query);

  const [tours, setTours] = useState<Tour[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 12;
  const activeFilterCount = countActiveFilters(filterState, query);

  // Sync filter state from URL when user navigates back/forward
  useEffect(() => {
    setFilterState(getFilterStateFromParams(searchParams));
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  // Fetch user favorites
  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    favoritesApi
      .listMyFavorites({ pageSize: '200' })
      .then((res) => {
        const ids = new Set((res.data || []).map((f: { tourId: string }) => f.tourId));
        setFavoriteIds(ids);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Fetch reference data (refetch when locale changes for localized names)
  useEffect(() => {
    async function fetchRefData() {
      const [catsRes, citiesRes, tagsRes] = await Promise.all([
        catalogApi.listCategories({ pageSize: '100' }).catch(() => null),
        referenceDataApi.listCities({ pageSize: '100' }).catch(() => null),
        catalogApi.listTags({ pageSize: '100' }).catch(() => null),
      ]);
      if (catsRes?.data) setCategories(catsRes.data);
      if (citiesRes?.data) setCities(citiesRes.data);
      if (tagsRes?.data) setTags(tagsRes.data);
    }
    fetchRefData();
  }, [locale]);

  const { addToast } = useToast();

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!('page' in updates)) params.delete('page');
      router.push(`/tours?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleFilterChange = useCallback(
    (key: keyof ToursFiltersState, value: string) => {
      const paramMap: Record<keyof ToursFiltersState, string> = {
        cityId: 'city',
        categoryId: 'category',
        tagId: 'tag',
        sortBy: 'sortBy',
        minPrice: 'minPrice',
        maxPrice: 'maxPrice',
        minRating: 'minRating',
        maxDurationMinutes: 'maxDuration',
        dateFrom: 'dateFrom',
        dateTo: 'dateTo',
      };
      setFilterState((prev) => ({ ...prev, [key]: value }));
      updateUrl({ [paramMap[key]]: value });
    },
    [updateUrl],
  );

  const handlePriceCommit = useCallback(
    (min: string, max: string) => {
      setFilterState((prev) => ({ ...prev, minPrice: min, maxPrice: max }));
      const updates: Record<string, string> = {};
      if (min) updates.minPrice = min;
      else updates.minPrice = '';
      if (max) updates.maxPrice = max;
      else updates.maxPrice = '';
      updateUrl(updates);
    },
    [updateUrl],
  );

  const clearAllFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
    setSearchInput('');
    router.push('/tours');
  }, [router]);

  const removeFilterTag = useCallback(
    (key: string, value: string) => {
      const paramMap: Record<string, keyof ToursFiltersState> = {
        city: 'cityId',
        category: 'categoryId',
        tag: 'tagId',
        sortBy: 'sortBy',
        minPrice: 'minPrice',
        maxPrice: 'maxPrice',
        minRating: 'minRating',
        maxDuration: 'maxDurationMinutes',
        dateFrom: 'dateFrom',
        dateTo: 'dateTo',
      };
      const stateKey = paramMap[key];
      if (stateKey) {
        setFilterState((prev) => ({ ...prev, [stateKey]: '' }));
      }
      const params = new URLSearchParams(searchParams.toString());
      if (key === 'q') params.delete('q');
      else params.delete(key);
      params.delete('page');
      router.push(`/tours?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Fetch tours using search API (supports all filters)
  const fetchTours = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const params: Record<string, string> = {
          page: String(pageNum),
          pageSize: String(PAGE_SIZE),
          status: 'PUBLISHED',
        };
        if (query.trim()) params.q = query.trim();
        if (filterState.cityId) params.cityId = filterState.cityId;
        if (filterState.categoryId) params.categoryId = filterState.categoryId;
        if (filterState.tagId) params.tagId = filterState.tagId;
        if (filterState.sortBy && filterState.sortBy !== 'recommended') params.sortBy = filterState.sortBy;
        if (filterState.minPrice) params.minPrice = filterState.minPrice;
        if (filterState.maxPrice) params.maxPrice = filterState.maxPrice;
        if (filterState.minRating) params.minRating = filterState.minRating;
        if (filterState.maxDurationMinutes) params.maxDurationMinutes = filterState.maxDurationMinutes;
        if (filterState.dateFrom) params.dateFrom = filterState.dateFrom;
        if (filterState.dateTo) params.dateTo = filterState.dateTo;

        const result = await catalogApi.searchTours(params);
        const items = Array.isArray(result) ? result : (result as { data?: Tour[] }).data ?? [];
        const meta = (result as { meta?: { total: number; totalPages: number } })?.meta;
        const total = meta?.total ?? items.length;
        const totalPages = meta?.totalPages ?? 1;

        if (append) {
          setTours((prev) => [...prev, ...items]);
        } else {
          setTours(items);
        }
        setTotalResults(total);
        setHasMore(pageNum < totalPages);
      } catch {
        if (!append) setTours([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      query,
      filterState.cityId,
      filterState.categoryId,
      filterState.tagId,
      filterState.sortBy,
      filterState.minPrice,
      filterState.maxPrice,
      filterState.minRating,
      filterState.maxDurationMinutes,
      filterState.dateFrom,
      filterState.dateTo,
    ],
  );

  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DEBOUNCE_MS = 300;

  // Refetch tours when params, locale or currency change (API uses Accept-Language + X-Currency from cookies)
  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      fetchDebounceRef.current = null;
      fetchTours(pageFromUrl, false);
    }, DEBOUNCE_MS);
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [fetchTours, pageFromUrl, locale, currency]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1) return;
      updateUrl({ page: newPage <= 1 ? '' : String(newPage) });
      document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
    },
    [updateUrl],
  );

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchInput.trim() });
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) return;
    setNewsletterLoading(true);
    try {
      await newsletterApi.subscribe(email);
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      addToast('success', t('newsletterSuccess'));
    } catch {
      addToast('error', t('newsletterError'));
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleToggleFavorite = async (tourId: string) => {
    if (!isAuthenticated) {
      addToast('info', t('loginToSaveFavorites'));
      return;
    }
    try {
      if (favoriteIds.has(tourId)) {
        await favoritesApi.removeFavorite(tourId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(tourId);
          return next;
        });
        addToast('success', t('removedFromFavorites'));
      } else {
        await favoritesApi.addFavorite(tourId);
        setFavoriteIds((prev) => new Set(prev).add(tourId));
        addToast('success', t('addedToFavorites'));
      }
    } catch {
      addToast('error', t('failedToUpdateFavorites'));
    }
  };

  const sortByLabel: Record<string, string> = {
    recommended: t('sortRecommended'),
    price_asc: t('sortPriceLow'),
    price_desc: t('sortPriceHigh'),
    rating_desc: t('sortRating'),
    latest: t('sortNewest'),
  };
  const currentSortLabel = sortByLabel[filterState.sortBy] ?? t('sortRecommended');

  const quickCategories = categories.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top bar: search + filter toggle (mobile) */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              ref={searchInputRef}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 px-4 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowFiltersMobile(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <HiOutlineAdjustments className="w-5 h-5" />
              {t('filters')}
              {activeFilterCount > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              {t('search')}
            </button>
          </form>

          {/* Quick category chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            {quickCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleFilterChange('categoryId', filterState.categoryId === cat.id ? '' : cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterState.categoryId === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Sidebar filters — desktop only */}
          <div className="hidden lg:block w-64 shrink-0">
            <ToursFilters
              variant="sidebar"
              state={filterState}
              onChange={handleFilterChange}
              onClear={clearAllFilters}
              onPriceCommit={handlePriceCommit}
              categories={categories}
              cities={cities}
              tags={tags}
              activeCount={activeFilterCount}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Results header + sort */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {loading ? (
                  <span className="animate-pulse">{t('loadingResults')}</span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalResults}</span> {t('results')}
                    {query && (
                      <>
                        {' '}
                        <span className="text-slate-500">“{query}”</span>
                      </>
                    )}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">{t('sortBy')}:</span>
                <select
                  value={filterState.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/30 outline-none"
                >
                  <option value="recommended">{t('sortRecommended')}</option>
                  <option value="latest">{t('sortNewest')}</option>
                  <option value="price_asc">{t('sortPriceLow')}</option>
                  <option value="price_desc">{t('sortPriceHigh')}</option>
                  <option value="rating_desc">{t('sortRating')}</option>
                </select>
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {query && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    “{query}”
                    <button
                      type="button"
                      onClick={() => removeFilterTag('q', '')}
                      className="p-0.5 rounded-full hover:bg-primary/20"
                      aria-label="Remove search"
                    >
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {filterState.cityId && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                    {cities.find((c) => c.id === filterState.cityId)?.name}
                    <button type="button" onClick={() => removeFilterTag('city', '')} className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {filterState.categoryId && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                    {categories.find((c) => c.id === filterState.categoryId)?.name}
                    <button type="button" onClick={() => removeFilterTag('category', '')} className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {(filterState.minPrice || filterState.maxPrice) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                    {filterState.minPrice || '0'} – {filterState.maxPrice || '∞'}
                    <button type="button" onClick={() => updateUrl({ minPrice: '', maxPrice: '' })} className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {filterState.minRating && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                    {filterState.minRating === '4' ? t('rating4Plus') : t('rating3Plus')}
                    <button type="button" onClick={() => removeFilterTag('minRating', '')} className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('clearFilters')}
                </button>
              </div>
            )}

            {/* Tour grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <div className="aspect-[4/3] bg-slate-300 dark:bg-slate-700" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-slate-300 dark:bg-slate-700" />
                      <div className="h-3 w-1/2 rounded bg-slate-300 dark:bg-slate-700" />
                      <div className="h-3 w-1/3 rounded bg-slate-300 dark:bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tours.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {tours.map((tour) => {
                    const tourAny = tour as unknown as Record<string, unknown>;
                    const minPriceFromOptions =
                      tour.options?.reduce((min: number, opt: { pricingRules?: { componentType: string; amount: number }[] }) => {
                        const baseRules = opt.pricingRules?.filter((r) => r.componentType === 'BASE') ?? [];
                        const optMin = baseRules.reduce((m, r) => Math.min(m, Number(r.amount)), Infinity);
                        return Math.min(min, optMin);
                      }, Infinity) ?? null;
                    const minPrice =
                      minPriceFromOptions !== null && minPriceFromOptions !== Infinity
                        ? minPriceFromOptions
                        : typeof tourAny.min_price === 'number'
                          ? tourAny.min_price
                          : null;
                    const currency =
                      tour.options?.[0]?.pricingRules?.find((r: { componentType: string }) => r.componentType === 'BASE')?.currencyCode ?? 'VND';
                    const coverMedia = tour.media?.find((m: { isCover: boolean }) => m.isCover) || tour.media?.[0];
                    const coverImageUrl =
                      coverMedia?.url ?? (typeof tourAny.coverImageUrl === 'string' ? tourAny.coverImageUrl : undefined);
                    const durationText = tour.durationMinutes
                      ? tour.durationMinutes >= 60
                        ? `${Math.floor(tour.durationMinutes / 60)}h${tour.durationMinutes % 60 > 0 ? ` ${tour.durationMinutes % 60}m` : ''}`
                        : `${tour.durationMinutes}m`
                      : undefined;

                    return (
                      <TourCard
                        key={tour.id}
                        id={tour.id}
                        slug={tour.slug}
                        title={tour.title}
                        coverImage={coverImageUrl}
                        categoryName={categories.find((c) => c.id === tour.categories?.[0]?.categoryId)?.name}
                        duration={durationText}
                        rating={tour.ratingAvg ? Number(tour.ratingAvg) : undefined}
                        ratingCount={tour.ratingCount}
                        price={minPrice !== null ? minPrice : undefined}
                        currency={currency}
                        badge={tour.badgeText || undefined}
                        badgeColor="blue"
                        isFavorited={favoriteIds.has(tour.id)}
                        onFavorite={handleToggleFavorite}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center">
                    <Pagination
                      currentPage={pageFromUrl}
                      totalPages={totalPages}
                      totalItems={totalResults}
                      itemsPerPage={PAGE_SIZE}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('noResults')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('noResultsDesc')}</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-xl bg-primary text-white px-6 py-3 font-semibold hover:bg-primary-dark transition-colors"
                >
                  {t('clearFilters')}
                </button>
              </div>
            )}

            {/* Newsletter */}
            <section className="mt-16 rounded-3xl bg-primary-100 dark:bg-primary/20 p-8 md:p-12 text-center border border-primary-200/50 dark:border-primary-800/30">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('newsletterTitle')}</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-xl mx-auto text-sm">{t('newsletterDesc')}</p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  disabled={newsletterSuccess}
                  placeholder="Email"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 disabled:opacity-70"
                />
                <button
                  type="submit"
                  disabled={newsletterLoading || newsletterSuccess}
                  className="py-2.5 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors disabled:opacity-70"
                >
                  {newsletterSuccess ? t('newsletterSubscribed') : newsletterLoading ? t('loading') : t('subscribe')}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* Mobile filters sheet */}
      {showFiltersMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setShowFiltersMobile(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-xl lg:hidden flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('filters')}</h3>
              <button
                type="button"
                onClick={() => setShowFiltersMobile(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ToursFilters
                variant="sheet"
                state={filterState}
                onChange={handleFilterChange}
                onClear={clearAllFilters}
                onPriceCommit={handlePriceCommit}
                onApply={() => setShowFiltersMobile(false)}
                categories={categories}
                cities={cities}
                tags={tags}
                activeCount={activeFilterCount}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
