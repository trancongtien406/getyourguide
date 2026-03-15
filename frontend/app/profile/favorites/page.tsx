'use client';

import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/table';
import { favoritesApi, type Tour } from '@/lib/api';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiDeleteBinLine, RiHeartLine, RiStarFill, RiTimeLine } from 'react-icons/ri';

interface FavoriteItem {
  userId: string;
  tourId: string;
  createdAt: string;
  tour?: Tour;
}

function getCoverImage(tour?: Tour) {
  if (!tour?.media?.length) return null;
  return tour.media.find((m) => m.isCover) ?? tour.media[0];
}

function getStartingPrice(tour?: Tour) {
  if (!tour?.options?.length) return null;
  for (const opt of tour.options) {
    const rules = (opt as { pricingRules?: { retailPrice: number }[] }).pricingRules;
    if (rules?.length) return Number(rules[0].retailPrice);
  }
  return null;
}

export default function MyFavoritesPage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const { formatPrice, formatDate, locale, currency } = useLocaleCurrency();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (search) params.q = search;
      const res = await favoritesApi.listMyFavorites(params);
      setFavorites(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites, locale, currency]);

  const handleRemove = async (tourId: string) => {
    try {
      await favoritesApi.removeFavorite(tourId);
      setFavorites(prev => prev.filter(f => f.tourId !== tourId));
      setTotal(prev => prev - 1);
    } catch { /* empty */ }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('myFavoritesTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('myFavoritesSubtitle')}</p>
      </div>

      <div className="mb-4">
        <Input
          placeholder={tc('search') + '...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RiHeartLine className="mb-4 h-12 w-12" />
          <p>{t('myFavoritesEmpty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => {
            const cover = getCoverImage(fav.tour);
            const price = getStartingPrice(fav.tour);
            return (
              <div key={fav.tourId} className="group overflow-hidden rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800/50">
                <div className="relative h-44 bg-slate-200 dark:bg-slate-700">
                  {cover ? (
                    <Image
                      src={cover.url}
                      alt={cover.altText ?? fav.tour?.title ?? ''}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <RiHeartLine className="h-10 w-10" />
                    </div>
                  )}
                  {fav.tour?.slug && (
                    <Link href={`/tours/${fav.tour.slug}`} className="absolute inset-0 z-10" />
                  )}
                  <button
                    onClick={() => handleRemove(fav.tourId)}
                    className="absolute right-2 top-2 z-20 rounded-full bg-white/90 p-1.5 text-red-500 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800"
                    title={t('removeFavorite')}
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="mb-1 line-clamp-1 font-semibold text-slate-900 dark:text-white">
                    {fav.tour?.title || `Tour ${fav.tourId.slice(0, 8)}...`}
                  </h3>
                  {fav.tour && (
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      {fav.tour.ratingAvg != null && (
                        <span className="flex items-center gap-1">
                          <RiStarFill className="h-3.5 w-3.5 text-yellow-500" />
                          {Number(fav.tour.ratingAvg).toFixed(1)}
                          {fav.tour.ratingCount > 0 && (
                            <span className="text-xs text-slate-400">({fav.tour.ratingCount})</span>
                          )}
                        </span>
                      )}
                      {fav.tour.durationMinutes != null && (
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="h-3.5 w-3.5" />
                          {fav.tour.durationMinutes >= 60
                            ? `${Math.floor(fav.tour.durationMinutes / 60)}h${fav.tour.durationMinutes % 60 ? ` ${fav.tour.durationMinutes % 60}m` : ''}`
                            : `${fav.tour.durationMinutes}m`}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    {price != null ? (
                      <span className="text-sm font-semibold text-primary">{formatPrice(price)}</span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDate(fav.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
