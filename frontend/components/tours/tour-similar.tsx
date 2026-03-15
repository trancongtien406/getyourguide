'use client';

import { catalogApi, favoritesApi, type Tour } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TourSimilarProps {
  currentTourId: string;
  cityId?: string;
}

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function TourSimilar({ currentTourId, cityId }: TourSimilarProps) {
  const t = useTranslations('tourPublic');
  const { isAuthenticated } = useAuth();
  const { formatPrice } = useLocaleCurrency();
  const [tours, setTours] = useState<Tour[]>([]);
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

  useEffect(() => {
    async function fetchSimilar() {
      try {
        const params: Record<string, string> = { pageSize: '5', status: 'PUBLISHED' };
        if (cityId) params.cityId = cityId;
        const result = await catalogApi.listTours(params);
        // The API wraps in { data, meta } — use .data
        const allTours = result?.data ?? [];
        const filtered = allTours.filter(
          (tour: Tour) => tour.id !== currentTourId
        );
        setTours(filtered.slice(0, 4));
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchSimilar();
  }, [currentTourId, cityId]);

  const { addToast } = useToast();

  const handleFavorite = async (e: React.MouseEvent, tourId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast('info', t('loginToSaveFavorites'));
      return;
    }
    try {
      if (favoriteIds.has(tourId)) {
        await favoritesApi.removeFavorite(tourId);
        setFavoriteIds(prev => { const next = new Set(prev); next.delete(tourId); return next; });
        addToast('success', t('removedFromFavorites'));
      } else {
        await favoritesApi.addFavorite(tourId);
        setFavoriteIds(prev => new Set(prev).add(tourId));
        addToast('success', t('addedToFavorites'));
      }
    } catch {
      addToast('error', t('failedToUpdateFavorites'));
    }
  };

  if (!loading && tours.length === 0) return null;

  if (loading) {
    return (
      <section className="mt-20">
        <h3 className="text-2xl font-bold mb-8 text-foreground">{t('similarTitle')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-800/40 mb-3" />
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800/40 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800/40 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-20">
      <h3 className="text-2xl font-bold mb-8 text-foreground">{t('similarTitle')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tours.map((tour) => {
          const mainImage = tour.media?.find(m => m.isCover)?.url ?? tour.media?.[0]?.url;
          const durationText = tour.durationMinutes
            ? tour.durationMinutes >= 60
              ? `${Math.floor(tour.durationMinutes / 60)}h${tour.durationMinutes % 60 > 0 ? ` ${tour.durationMinutes % 60}m` : ''}`
              : `${tour.durationMinutes}m`
            : null;
          const minPrice = tour.options?.reduce((min: number, opt) => {
            const baseRules = opt.pricingRules?.filter((r) => r.componentType === 'BASE') ?? [];
            const optMin = baseRules.reduce((m: number, r) => Math.min(m, Number(r.amount)), Infinity);
            return Math.min(min, optMin);
          }, Infinity) ?? null;

          return (
            <Link
              key={tour.id}
              href={`/tours/${tour.slug || tour.id}`}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                <Image
                  alt={tour.title}
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  src={mainImage || '/no_image.jpg'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {tour.badgeText && (
                  <span className="absolute top-3 left-3 bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-foreground">
                    {tour.badgeText}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleFavorite(e, tour.id)}
                  title={!isAuthenticated ? t('loginToSaveFavorites') : undefined}
                  aria-label={favoriteIds.has(tour.id) ? 'Remove from favorites' : 'Add to favorites'}
                  className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform ${
                    favoriteIds.has(tour.id)
                      ? 'bg-red-500/80 text-white'
                      : 'bg-white/90 dark:bg-black/70 text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4" fill={favoriteIds.has(tour.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <h4 className="font-bold mb-1 line-clamp-2 text-foreground">{tour.title}</h4>
              {durationText && (
                <p className="text-sm text-foreground/50 mb-2">{durationText}</p>
              )}
              {tour.ratingAvg && (
                <div className="flex items-center gap-1 mb-2">
                  <StarIcon />
                  <span className="text-xs font-bold text-foreground">{Number(tour.ratingAvg).toFixed(1)}</span>
                  <span className="text-xs text-foreground/40">({tour.ratingCount})</span>
                </div>
              )}
              {minPrice != null && minPrice !== Infinity && (
                <p className="text-sm font-bold text-foreground">{formatPrice(minPrice)}</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
