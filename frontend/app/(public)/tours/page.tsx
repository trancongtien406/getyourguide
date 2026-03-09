'use client';

import { TourCard } from '@/components/public/tour-card';
import { catalogApi, favoritesApi, referenceDataApi, type Category, type City, type Tour } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    HiOutlineAdjustments,
    HiOutlineSortDescending,
    HiOutlineX
} from 'react-icons/hi';

export default function ToursListingPage() {
  const t = useTranslations('public');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const query = searchParams.get('q') || '';
  const cityId = searchParams.get('city') || '';
  const categoryId = searchParams.get('category') || '';

  const [tours, setTours] = useState<Tour[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(categoryId);
  const [selectedCity, setSelectedCity] = useState(cityId);
  const [sortBy, setSortBy] = useState('recommended');

  const PAGE_SIZE = 12;

  // Fetch user favorites
  useEffect(() => {
    if (!isAuthenticated) { setFavoriteIds(new Set()); return; }
    favoritesApi.listMyFavorites({ pageSize: '200' })
      .then(res => {
        const ids = new Set((res.data || []).map((f: any) => f.tourId));
        setFavoriteIds(ids);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const { addToast } = useToast();

  const handleToggleFavorite = async (tourId: string) => {
    if (!isAuthenticated) {
      addToast('info', 'Please log in to save favorites');
      return;
    }
    try {
      if (favoriteIds.has(tourId)) {
        await favoritesApi.removeFavorite(tourId);
        setFavoriteIds(prev => { const next = new Set(prev); next.delete(tourId); return next; });
        addToast('success', 'Removed from favorites');
      } else {
        await favoritesApi.addFavorite(tourId);
        setFavoriteIds(prev => new Set(prev).add(tourId));
        addToast('success', 'Added to favorites');
      }
    } catch {
      addToast('error', 'Failed to update favorites');
    }
  };

  // Fetch reference data
  useEffect(() => {
    async function fetchRefData() {
      const [catsRes, citiesRes] = await Promise.all([
        catalogApi.listCategories({ pageSize: '50', isActive: 'true' }).catch(() => null),
        referenceDataApi.listCities({ pageSize: '50' }).catch(() => null),
      ]);
      if (catsRes?.data) setCategories(catsRes.data);
      if (citiesRes?.data) setCities(citiesRes.data);
    }
    fetchRefData();
  }, []);

  // Fetch tours
  const fetchTours = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params: Record<string, string> = {
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
        status: 'PUBLISHED',
      };
      if (selectedCity) params.cityId = selectedCity;
      if (sortBy && sortBy !== 'recommended') params.sortBy = sortBy;

      let result;
      if (query) {
        params.q = query;
        result = await catalogApi.searchTours(params);
        if (result) {
          const items = result.items || [];
          if (append) {
            setTours((prev) => [...prev, ...items]);
          } else {
            setTours(items);
          }
          setTotalResults(result.total ?? items.length);
          setHasMore(pageNum < (result.totalPages ?? 1));
        }
      } else {
        if (selectedCategory) params.categoryId = selectedCategory;
        result = await catalogApi.listTours(params);
        if (result) {
          const items = result.data || [];
          if (append) {
            setTours((prev) => [...prev, ...items]);
          } else {
            setTours(items);
          }
          setTotalResults(result.meta?.total ?? items.length);
          setHasMore(pageNum < (result.meta?.totalPages ?? 1));
        }
      }
    } catch {
      if (!append) setTours([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, selectedCategory, selectedCity, sortBy]);

  useEffect(() => {
    setPage(1);
    fetchTours(1, false);
  }, [fetchTours]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTours(nextPage, true);
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/tours?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedCity('');
    router.push('/tours');
  };

  const activeFilterCount = [selectedCategory, selectedCity, query].filter(Boolean).length;

  // Category chips from HTML template
  const quickFilters = categories.slice(0, 8);

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      {/* Filter Chips Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 py-3 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-full text-sm font-medium flex items-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white shrink-0 transition-colors"
          >
            <HiOutlineAdjustments className="w-4 h-4 mr-1.5" />
            {t('filters')}
            {activeFilterCount > 0 && (
              <span className="ml-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-primary-800 mx-1 shrink-0" />

          {quickFilters.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                const newVal = selectedCategory === cat.id ? '' : cat.id;
                setSelectedCategory(newVal);
                updateFilters('category', newVal);
              }}
              className={`px-4 py-2 border rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                  : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('filterCity')}</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    updateFilters('city', e.target.value);
                  }}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">{t('allCities')}</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('filterCategory')}</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    updateFilters('category', e.target.value);
                  }}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">{t('allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('sortBy')}</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  <option value="recommended">{t('sortRecommended')}</option>
                  <option value="price_asc">{t('sortPriceLow')}</option>
                  <option value="price_desc">{t('sortPriceHigh')}</option>
                  <option value="rating_desc">{t('sortRating')}</option>
                  <option value="latest">{t('sortNewest')}</option>
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="mt-4 text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                <HiOutlineX className="w-4 h-4" /> {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-sm text-slate-600 dark:text-slate-400">
            {loading ? (
              <span className="animate-pulse">{t('loadingResults')}</span>
            ) : (
              <>
                {totalResults} {t('results')}
                {query && (
                  <>: <span className="font-bold text-slate-900 dark:text-white">{query}</span></>
                )}
              </>
            )}
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm font-medium text-slate-900 dark:text-white cursor-pointer hover:text-primary transition-colors"
          >
            <HiOutlineSortDescending className="w-5 h-5 mr-1.5" />
            {t('sortBy')}: <span className="text-primary ml-1">{t('sortRecommended')}</span>
          </button>
        </div>

        {/* Tour Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-800/40 mb-3" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800/40 rounded mb-2" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800/40 rounded mb-2" />
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800/40 rounded" />
              </div>
            ))}
          </div>
        ) : tours.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tours.map((tour) => {
                const minPrice = tour.options?.reduce((min: number, opt: any) => {
                  const baseRules = opt.pricingRules?.filter((r: any) => r.componentType === 'BASE') ?? [];
                  const optMin = baseRules.reduce((m: number, r: any) => Math.min(m, Number(r.amount)), Infinity);
                  return Math.min(min, optMin);
                }, Infinity) ?? null;
                const currency = tour.options?.[0]?.pricingRules?.find((r: any) => r.componentType === 'BASE')?.currencyCode ?? 'VND';
                const coverMedia = tour.media?.find((m: any) => m.isCover) || tour.media?.[0];
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
                    coverImage={coverMedia?.url}
                    categoryName={categories.find(c => c.id === tour.categories?.[0]?.categoryId)?.name}
                    duration={durationText}
                    rating={tour.ratingAvg ? Number(tour.ratingAvg) : undefined}
                    ratingCount={tour.ratingCount}
                    price={minPrice && minPrice !== Infinity ? minPrice : undefined}
                    currency={currency}
                    badge={tour.badgeText || undefined}
                    badgeColor="blue"
                    isFavorited={favoriteIds.has(tour.id)}
                    onFavorite={handleToggleFavorite}
                  />
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 border border-primary/30 dark:border-primary-800 rounded-full text-sm font-bold hover:bg-primary-50 dark:hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                >
                  {loadingMore ? t('loading') : t('showMore')}
                </button>
              </div>
            )}
          </>
        ) : (
          /* No Results */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('noResults')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('noResultsDesc')}</p>
            <button
              onClick={clearAllFilters}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              {t('clearFilters')}
            </button>
          </div>
        )}

        {/* Newsletter Banner */}
        <section className="mt-16 bg-primary-100 dark:bg-primary/20 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            {t('newsletterTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto">
            {t('newsletterDesc')}
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              className="flex-1 px-4 py-3 border-none rounded-lg focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="Email"
            />
            <button
              type="submit"
              className="bg-primary text-white font-bold px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors"
            >
              {t('subscribe')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
