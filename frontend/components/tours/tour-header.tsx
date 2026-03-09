'use client';

import { favoritesApi, type Tour } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

function StarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

interface TourHeaderProps {
  tour: Tour;
  reviewCount: number;
}

export function TourHeader({ tour, reviewCount }: TourHeaderProps) {
  const t = useTranslations('tourPublic');
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Check if tour is already in user's favorites
  useEffect(() => {
    if (!isAuthenticated || !tour?.id) return;
    favoritesApi.listMyFavorites({ pageSize: '200' })
      .then(res => {
        const ids = (res.data || []).map((f: any) => f.tourId);
        setIsFavorited(ids.includes(tour.id));
      })
      .catch(() => {});
  }, [isAuthenticated, tour?.id]);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: tour.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { addToast } = useToast();

  const handleFavorite = async () => {
    if (!isAuthenticated || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        await favoritesApi.removeFavorite(tour.id);
        setIsFavorited(false);
        addToast('success', 'Removed from favorites');
      } else {
        await favoritesApi.addFavorite(tour.id);
        setIsFavorited(true);
        addToast('success', 'Added to favorites');
      }
    } catch {
      addToast('error', 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
        <a className="hover:underline" href="/">{t('breadcrumbHome')}</a>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-foreground/70">{tour.title}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {tour.badgeText && (
              <span className="bg-primary-100 text-primary-700 dark:bg-slate-800 dark:text-primary-200 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                {tour.badgeText}
              </span>
            )}
            {tour.ratingAvg && (
              <div className="flex items-center text-sm font-medium">
                <StarIcon className="w-4 h-4 text-accent mr-1" />
                {Number(tour.ratingAvg).toFixed(1)}
                <span className="text-foreground/40 ml-1 font-normal">
                  ({t('reviewCount', { count: reviewCount })})
                </span>
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {tour.title}
          </h1>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border border-foreground/15 rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline">{copied ? t('copied') : t('share')}</span>
          </button>
          <button
            onClick={handleFavorite}
            disabled={favoriteLoading}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              isFavorited
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-500'
                : 'border-foreground/15 hover:bg-foreground/5'
            }`}
          >
            <svg className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="hidden sm:inline">{isFavorited ? t('favorited') : t('favorite')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
