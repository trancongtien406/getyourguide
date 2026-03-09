'use client';

import type { Review, ReviewListResponse } from '@/lib/api';
import { reviewsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface TourReviewsProps {
  tourId: string;
  initialData: ReviewListResponse;
}

function StarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function RatingBar({ label, value, max = 5 }: { label: string; value: number | null; max?: number }) {
  if (value == null) return null;
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground w-32">{label}</span>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-1 h-2 bg-primary-100 dark:bg-slate-800/30 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold text-foreground w-8 text-right">{value.toFixed(1)}</span>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const t = useTranslations('tourPublic');
  const { formatDate } = useLocaleCurrency();
  const { isAuthenticated } = useAuth();
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount ?? 0);
  const [voted, setVoted] = useState(false);
  const [reporting, setReporting] = useState(false);
  const colors = ['bg-primary/20 text-primary', 'bg-primary-700/20 text-primary-700', 'bg-primary-500/20 text-primary-500', 'bg-primary-800/20 text-primary-800'];
  const colorClass = colors[review.user?.firstName?.charCodeAt(0) ? review.user.firstName.charCodeAt(0) % colors.length : 0];

  const handleHelpful = async () => {
    if (!isAuthenticated || voted) return;
    try {
      await reviewsApi.voteHelpful(review.id, true);
      setHelpfulCount((c) => c + 1);
      setVoted(true);
    } catch { /* empty */ }
  };

  const handleReport = async () => {
    if (!isAuthenticated) return;
    const reason = prompt(t('reportReason'));
    if (!reason) return;
    setReporting(true);
    try {
      await reviewsApi.reportReview(review.id, { reason });
      alert(t('reportSubmitted'));
    } catch { /* empty */ } finally {
      setReporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center font-bold`}>
            {review.user?.firstName?.[0] ?? '?'}
          </div>
          <div>
            <p className="font-bold text-foreground">
              {review.user?.firstName ?? t('guestName')}
              {review.user?.displayCountry ? ` - ${review.user.displayCountry}` : ''}
            </p>
            <p className="text-xs text-foreground/50">
              {formatDate(review.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: review.rating }).map((_, i) => (
            <StarIcon key={i} className="w-3.5 h-3.5 text-accent" />
          ))}
        </div>
      </div>
      <p className="text-foreground/70">{review.body}</p>
      <div className="flex gap-4">
        <button
          onClick={handleHelpful}
          disabled={voted}
          className={`text-xs flex items-center gap-1 transition-colors ${voted ? 'text-primary' : 'text-foreground/40 hover:text-primary'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {t('helpful')} {helpfulCount > 0 ? `(${helpfulCount})` : ''}
        </button>
        <button
          onClick={handleReport}
          disabled={reporting}
          className="text-xs text-foreground/40 hover:text-red-500 transition-colors"
        >
          {reporting ? '...' : t('report')}
        </button>
      </div>
    </div>
  );
}

export function TourReviews({ tourId, initialData }: TourReviewsProps) {
  const t = useTranslations('tourPublic');
  const [data, setData] = useState<ReviewListResponse>(initialData);
  const [reviews, setReviews] = useState<Review[]>(initialData?.data ?? []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filter & Sort state
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdat');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions = [
    { value: 'createdat', label: t('sortNewest') },
    { value: 'rating_desc', label: t('sortHighestRated') },
    { value: 'rating_asc', label: t('sortLowestRated') },
    { value: 'helpfulcount', label: t('sortMostHelpful') },
  ];

  const activeSortLabel = sortOptions.find(o => o.value === sortBy)?.label ?? sortOptions[0].label;

  const fetchReviews = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(pageNum),
        pageSize: '5',
      };
      if (filterRating) params.rating = String(filterRating);
      if (sortBy === 'rating_desc') { params.sortBy = 'rating'; params.sortOrder = 'desc'; }
      else if (sortBy === 'rating_asc') { params.sortBy = 'rating'; params.sortOrder = 'asc'; }
      else if (sortBy === 'helpfulcount') { params.sortBy = 'helpfulcount'; params.sortOrder = 'desc'; }
      else { params.sortBy = 'createdat'; params.sortOrder = 'desc'; }

      const result = await reviewsApi.listTourReviews(tourId, params);
      if (append) {
        setReviews(prev => [...prev, ...(result.data ?? [])]);
      } else {
        setReviews(result.data ?? []);
      }
      setData(result);
      setPage(pageNum);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [tourId, filterRating, sortBy]);

  // Re-fetch when filter/sort changes
  useEffect(() => {
    fetchReviews(1, false);
  }, [fetchReviews]);

  // Sync if initialData changes (only on first load if no filters)
  useEffect(() => {
    if (!filterRating && sortBy === 'createdat') {
      setData(initialData);
      setReviews(initialData?.data ?? []);
      setPage(1);
    }
  }, [initialData, filterRating, sortBy]);

  const loadMore = () => fetchReviews(page + 1, true);

  const hasMore = reviews.length < (data?.meta?.total ?? 0);

  const handleFilterRating = (rating: number | null) => {
    setFilterRating(rating);
    setShowFilterDropdown(false);
  };

  const handleSort = (value: string) => {
    setSortBy(value);
    setShowSortDropdown(false);
  };

  return (
    <section className="mt-20 pt-20 border-t border-foreground/10" id="reviews">
      <h3 className="text-2xl font-bold mb-8 text-foreground">{t('customerReviews')}</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Overall rating */}
        <div className="lg:col-span-1">
          <div className="text-6xl font-black text-foreground mb-2">
            {data.meta?.averageRating?.toFixed(1) ?? '—'}
            <span className="text-3xl text-foreground/40 font-medium">/5</span>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon
                key={i}
                className={`w-5 h-5 ${i < Math.round(data.meta?.averageRating ?? 0) ? 'text-accent' : 'text-foreground/20'}`}
              />
            ))}
          </div>
          <p className="text-foreground/50 text-sm mb-8">
            {t('basedOnReviews', { count: data?.meta?.publishedCount ?? 0 })}
          </p>

          <div className="space-y-4">
            <RatingBar label={t('ratingGuide')} value={data.meta?.averageRatingGuide} />
            <RatingBar label={t('ratingTransport')} value={data.meta?.averageRatingTransport} />
            <RatingBar label={t('ratingValue')} value={data.meta?.averageRatingValue} />
          </div>

          {/* Star filter chips */}
          <div className="mt-8 space-y-2">
            <p className="text-xs font-semibold text-foreground/50 mb-2">{t('filterByRating')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleFilterRating(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filterRating === null
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-foreground/15 text-foreground/60 hover:border-primary hover:text-primary'
                }`}
              >
                {t('allRatings')}
              </button>
              {[5, 4, 3, 2, 1].map(star => (
                <button
                  key={star}
                  onClick={() => handleFilterRating(star)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${
                    filterRating === star
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-foreground/15 text-foreground/60 hover:border-primary hover:text-primary'
                  }`}
                >
                  {star} <StarIcon className="w-3 h-3 text-accent" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Review list */}
        <div className="lg:col-span-2 space-y-12">
          {/* Filter bar */}
          <div className="flex items-center justify-between pb-6 border-b border-foreground/10">
            <div className="flex gap-3">
              {/* Rating filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                    filterRating !== null
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-foreground/15 hover:bg-foreground/5 text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {filterRating ? `${filterRating} ★` : t('filterButton')}
                </button>
                {showFilterDropdown && (
                  <div className="absolute z-20 top-full mt-1 left-0 bg-background border border-foreground/15 rounded-xl shadow-xl p-1 min-w-[160px]">
                    <button
                      onClick={() => handleFilterRating(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors ${
                        filterRating === null ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                      }`}
                    >
                      {t('allRatings')}
                    </button>
                    {[5, 4, 3, 2, 1].map(star => (
                      <button
                        key={star}
                        onClick={() => handleFilterRating(star)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors flex items-center gap-2 ${
                          filterRating === star ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                        }`}
                      >
                        {Array.from({ length: star }).map((_, i) => (
                          <StarIcon key={i} className="w-3.5 h-3.5 text-accent" />
                        ))}
                        <span className="ml-1">({star})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
                  className="flex items-center gap-2 px-4 py-2 border border-foreground/15 rounded-lg text-sm font-semibold hover:bg-foreground/5 text-foreground"
                >
                  {activeSortLabel}
                  <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSortDropdown && (
                  <div className="absolute z-20 top-full mt-1 left-0 bg-background border border-foreground/15 rounded-xl shadow-xl p-1 min-w-[180px]">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleSort(opt.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors ${
                          sortBy === opt.value ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter indicator */}
            {filterRating !== null && (
              <button
                onClick={() => handleFilterRating(null)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {t('clearFilter')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Reviews */}
          {loading && reviews.length === 0 ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/10" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-foreground/10 rounded" />
                      <div className="h-2 w-20 bg-foreground/10 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-full bg-foreground/10 rounded" />
                  <div className="h-3 w-3/4 bg-foreground/10 rounded" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-foreground/40">
              <p className="text-lg font-medium">{t('noReviewsFound')}</p>
              {filterRating && (
                <button onClick={() => handleFilterRating(null)} className="mt-2 text-primary text-sm hover:underline">
                  {t('clearFilter')}
                </button>
              )}
            </div>
          ) : (
            <>
              {reviews.map((review, i) => (
                <div key={review.id}>
                  {i > 0 && <div className="border-t border-foreground/10 mb-12" />}
                  <ReviewCard review={review} />
                </div>
              ))}
            </>
          )}

          {/* Load more */}
          {hasMore && (
            <button
              className="w-full py-4 border border-foreground/15 rounded-xl font-bold hover:bg-foreground/5 transition-colors text-foreground disabled:opacity-50"
              disabled={loading}
              onClick={loadMore}
            >
              {loading ? t('loading') : t('loadMoreReviews')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
