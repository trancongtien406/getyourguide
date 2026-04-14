'use client';

import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { HiHeart, HiOutlineHeart, HiStar } from 'react-icons/hi';

interface TourCardProps {
  id: string;
  title: string;
  slug?: string;
  coverImage?: string;
  categoryName?: string;
  duration?: string;
  features?: string[];
  rating?: number;
  ratingCount?: number;
  price?: number;
  originalPrice?: number;
  currency?: string;
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'white';
  isFavorited?: boolean;
  onFavorite?: (id: string) => void;
}

export function TourCard({
  id,
  title,
  slug,
  coverImage,
  categoryName,
  duration,
  features = [],
  rating,
  ratingCount,
  price,
  originalPrice,
  currency = 'VND',
  badge,
  badgeColor = 'white',
  isFavorited = false,
  onFavorite,
}: TourCardProps) {
  const { formatPrice } = useLocaleCurrency();
  const t = useTranslations('public');

  const badgeClasses = {
    blue: 'bg-primary text-white',
    amber: 'bg-accent text-white',
    white: 'bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white',
  };

  return (
    <Link
      href={`/tours/${slug || id}`}
      className="group flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={coverImage || '/no_image.jpg'}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {badge && (
          <span className={`absolute top-2 left-2 ${badgeClasses[badgeColor]} backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-bold uppercase shadow-sm`}>
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavorite?.(id);
          }}
          aria-label={isFavorited ? t('removeFromFavoritesAria') : t('addToFavoritesAria')}
          className={`absolute top-2 right-2 p-1.5 backdrop-blur-md rounded-full transition-colors ${
            isFavorited
              ? 'bg-red-500/80 text-white hover:bg-red-600/80'
              : 'bg-white/50 dark:bg-black/30 text-white hover:text-red-500'
          }`}
        >
          {isFavorited ? (
            <HiHeart className="w-5 h-5" />
          ) : (
            <HiOutlineHeart className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {categoryName && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{categoryName}</p>
        )}
        <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-2 text-slate-900 dark:text-white group-hover:text-primary transition-colors">
          {title}
        </h3>
        {/* Meta info chips: duration + key features */}
        {(duration || features.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {duration && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200">
                {duration}
              </span>
            )}
            {features.slice(0, 3).map((feat) => (
              <span
                key={feat}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-300"
              >
                {feat}
              </span>
            ))}
          </div>
        )}

        {/* Bottom: Rating + Price */}
        <div className="mt-auto flex items-center justify-between pt-3">
          {rating != null ? (
            <div className="flex flex-col gap-0.5" aria-label={`Rating ${rating.toFixed(1)} out of 5`}>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {rating.toFixed(1)}
                </span>
                <HiStar className="w-4 h-4 text-amber-400" aria-hidden="true" />
                {ratingCount != null && (
                  <span className="text-xs text-slate-400">
                    ({ratingCount.toLocaleString()})
                  </span>
                )}
              </div>
              {ratingCount != null && ratingCount > 0 && (
                <span className="text-[11px] text-slate-400">
                  {rating >= 4.5
                    ? t('ratingExcellent')
                    : rating >= 4
                      ? t('ratingVeryGood')
                      : t('ratingGood')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400">{t('newTour')}</span>
          )}
          {price != null && (
            <div className="text-right">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('fromPrice')}
                {originalPrice != null && originalPrice > price && (
                  <span className="line-through decoration-red-500/50 ml-1">{formatPrice(originalPrice, currency)}</span>
                )}
              </p>
              <p className="font-extrabold text-base text-slate-900 dark:text-white">{formatPrice(price, currency)}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
