'use client';

import { reviewsApi, type Review } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiDeleteBin6Line, RiStarFill, RiStarLine } from 'react-icons/ri';

export default function MyReviewsPage() {
  const t = useTranslations('profile');

  const [reviews, setReviews] = useState<(Review & { tour?: { id: string; slug: string } })[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.listMyReviews({ page: String(page), pageSize: String(pageSize) });
      setReviews(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteReviewConfirm'))) return;
    try {
      await reviewsApi.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      /* empty */
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) =>
        s <= rating ? (
          <RiStarFill key={s} className="h-4 w-4 text-amber-400" />
        ) : (
          <RiStarLine key={s} className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        ),
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('myReviewsTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('myReviewsSubtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RiStarLine className="mb-4 h-12 w-12" />
          <p>{t('myReviewsEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-xs text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                    {review.verifiedBooking && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                        {t('verifiedBooking')}
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{review.title}</h3>
                  )}
                  {review.body && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{review.body}</p>
                  )}
                  {review.tour && (
                    <Link
                      href={`/tours/${review.tour.slug}`}
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      {t('viewTour')} →
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t('deleteReview')}
                >
                  <RiDeleteBin6Line className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                ←
              </button>
              <span className="flex items-center px-3 text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
