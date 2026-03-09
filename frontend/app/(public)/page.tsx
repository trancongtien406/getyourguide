'use client';

import { CitySearchDropdown } from '@/components/public/city-search-dropdown';
import { TourCard } from '@/components/public/tour-card';
import {
    catalogApi,
    favoritesApi,
    referenceDataApi,
    reviewsApi,
    type Category,
    type City,
    type Review,
    type Tour,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiStar } from 'react-icons/hi';

/* Gradient palettes for city cards (no images in API) */
const CITY_GRADIENTS = [
  'from-primary-400 to-primary-600',
  'from-sky-400 to-indigo-500',
  'from-teal-400 to-cyan-600',
  'from-violet-400 to-purple-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-green-600',
  'from-fuchsia-400 to-pink-500',
];

export default function HomePage() {
  const t = useTranslations('public');
  const { isAuthenticated } = useAuth();

  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentReviews, setRecentReviews] = useState<(Review & { tourTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    async function fetchData() {
      try {
        const [toursRes, citiesRes, catsRes] = await Promise.all([
          catalogApi.listTours({ pageSize: '8', status: 'PUBLISHED' }).catch(() => null),
          referenceDataApi.listCities({ pageSize: '8' }).catch(() => null),
          catalogApi.listCategories({ pageSize: '10', isActive: 'true' }).catch(() => null),
        ]);
        const tours = toursRes?.data ?? [];
        if (tours.length) setFeaturedTours(tours);
        if (citiesRes?.data) setCities(citiesRes.data);
        if (catsRes?.data) setCategories(catsRes.data);

        // Fetch real reviews from up to 3 featured tours
        if (tours.length) {
          const reviewPromises = tours.slice(0, 3).map((tour) =>
            reviewsApi
              .listTourReviews(tour.id, { pageSize: '1', status: 'PUBLISHED' })
              .then((res) =>
                (res.data ?? []).map((r: Review) => ({ ...r, tourTitle: tour.title })),
              )
              .catch(() => [] as (Review & { tourTitle?: string })[]),
          );
          const reviewArrays = await Promise.all(reviewPromises);
          setRecentReviews(reviewArrays.flat().slice(0, 3));
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[480px] w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&h=960&fit=crop"
          alt="Travel destinations"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-950/60 to-black/50 flex flex-col items-center justify-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white text-center mb-8 drop-shadow-lg">
            {t('heroTitle')}
          </h1>
          {/* Hero Search – City Dropdown */}
          <CitySearchDropdown variant="hero" />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16 space-y-16">

        {/* Destinations Section */}
        {loading ? (
          <section>
            <h2 className="text-2xl font-extrabold mb-8 text-slate-900 dark:text-white">
              {t('destinationsTitle')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-800/40 mb-3" />
                  <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800/40 rounded" />
                </div>
              ))}
            </div>
          </section>
        ) : cities.length > 0 ? (
          <section>
            <h2 className="text-2xl font-extrabold mb-8 text-slate-900 dark:text-white">
              {t('destinationsTitle')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {cities.slice(0, 8).map((city, i) => (
                <Link
                  key={city.id}
                  href={`/tours?city=${city.id}`}
                  className="group cursor-pointer"
                >
                  <div className={`aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-gradient-to-br ${CITY_GRADIENTS[i % CITY_GRADIENTS.length]} flex items-end p-4 shadow-sm group-hover:shadow-md transition-shadow`}>
                    <span className="text-white font-bold text-lg drop-shadow-md">{city.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Attractions / Categories Section */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-2xl font-extrabold mb-8 text-slate-900 dark:text-white">
              {t('attractionsTitle')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/tours?category=${cat.id}`}
                  className="cursor-pointer group"
                >
                  <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-primary-50 dark:bg-slate-800/40 flex items-center justify-center border border-primary-100 dark:border-slate-700">
                    <span className="text-4xl">🏛️</span>
                  </div>
                  <h3 className="font-bold text-base leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">{cat.name}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Reviews / Trust Section – Real data only */}
        {recentReviews.length > 0 && (
          <section className="bg-primary-50 dark:bg-slate-800/30 rounded-3xl p-8 md:p-12 border border-primary-100 dark:border-slate-700">
            <h2 className="text-slate-900 dark:text-white text-2xl font-extrabold mb-10 text-center md:text-left">
              {t('trustTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentReviews.map((review) => {
                const displayName =
                  review.user?.firstName ?? review.user?.lastName ?? 'Guest';
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <div
                    key={review.id}
                    className="bg-white dark:bg-slate-800/60 p-6 rounded-2xl shadow-sm border border-primary-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                  >
                    {review.tourTitle && (
                      <span className="text-primary font-bold mb-2 block text-sm line-clamp-1">
                        {review.tourTitle}
                      </span>
                    )}
                    <div className="flex text-amber-400 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <HiStar
                          key={j}
                          className={`w-4 h-4 ${j < review.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {initial}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{displayName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                          {review.verifiedBooking && (
                            <span className="text-primary font-medium ml-1">• Verified</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {(review.title || review.body) && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4">
                        {review.title ? <strong>{review.title} – </strong> : null}
                        {review.body}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Featured Tours Section */}
        {loading ? (
          <section>
            <h2 className="text-2xl font-extrabold mb-8 text-slate-900 dark:text-white">
              {t('featuredToursTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-800/40 mb-3" />
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800/40 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800/40 rounded" />
                </div>
              ))}
            </div>
          </section>
        ) : featuredTours.length > 0 ? (
          <section>
            <h2 className="text-2xl font-extrabold mb-8 text-slate-900 dark:text-white">
              {t('featuredToursTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredTours.slice(0, 8).map((tour) => {
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
                    badge={tour.badgeText || (tour.isFeatured ? t('badgeFeatured') : undefined)}
                    badgeColor={tour.badgeText ? 'blue' : 'amber'}
                    isFavorited={favoriteIds.has(tour.id)}
                    onFavorite={handleToggleFavorite}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Tabbed Links Section */}
        {categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 mb-8 overflow-x-auto no-scrollbar">
              <div className="flex gap-8">
                {[t('tabTopAttractions'), t('tabTopDestinations'), t('tabTopCountries'), t('tabTopCategories')].map((tab, i) => (
                  <button
                    key={i}
                    className={`pb-4 whitespace-nowrap font-medium transition-colors ${
                      i === 0
                        ? 'border-b-2 border-primary text-primary font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pb-4 shrink-0 ml-4">
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <HiOutlineChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <HiOutlineChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-8">
              {categories.slice(0, 10).map((cat) => (
                <Link key={cat.id} href={`/tours?category=${cat.id}`} className="block group">
                  <p className="font-medium group-hover:text-primary transition-colors text-slate-900 dark:text-white">
                    {cat.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('toursAndActivities')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Newsletter Section */}
        <section className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary/20 dark:to-primary/10 rounded-3xl p-8 md:p-12 text-center border border-primary-100 dark:border-primary-900/30">
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
          <p className="text-[11px] text-slate-500 mt-6 leading-relaxed max-w-md mx-auto">
            {t('newsletterDisclaimer')}
          </p>
        </section>
      </div>
    </>
  );
}
