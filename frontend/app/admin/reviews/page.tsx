'use client';

import { Badge, ReviewStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import {
    catalogApi,
    reviewsApi,
    type Review,
    type ReviewStatus,
    type Tour,
} from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiEyeOffLine } from 'react-icons/ri';

export default function ReviewsPage() {
  const t = useTranslations('reviews');
  const tc = useTranslations('common');

  const statusOptions = [
    { value: '', label: t('statusAll') },
    { value: 'PENDING', label: t('statusPending') },
    { value: 'PUBLISHED', label: t('statusPublished') },
    { value: 'HIDDEN', label: t('statusHidden') },
    { value: 'REJECTED', label: t('statusRejected') },
  ];

  const [reviews, setReviews] = useState<Review[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  // Moderation modal
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [moderationAction, setModerationAction] = useState<'publish' | 'hide' | 'reject' | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tours for dropdown
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await catalogApi.listTours({ pageSize: '100' });
        setTours(response.data || []);
        if (response.data?.length > 0) {
          setSelectedTourId(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch tours:', error);
      }
    };
    fetchTours();
  }, []);

  const fetchReviews = useCallback(async () => {
    if (!selectedTourId) return;
    
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      if (statusFilter) params.status = statusFilter;

      const response = await reviewsApi.listReviews(selectedTourId, params);
      setReviews(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedTourId, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openModerationModal = (review: Review, action: typeof moderationAction) => {
    setSelectedReview(review);
    setModerationAction(action);
    setModerationReason('');
    setIsModalOpen(true);
  };

  const handleModerate = async () => {
    if (!selectedReview || !moderationAction) return;
    
    setIsSubmitting(true);
    try {
      const statusMap: Record<string, ReviewStatus> = {
        publish: 'PUBLISHED',
        hide: 'HIDDEN',
        reject: 'REJECTED',
      };
      await reviewsApi.moderateReview(selectedReview.id, statusMap[moderationAction]);
      setIsModalOpen(false);
      fetchReviews();
    } catch (error) {
      console.error('Failed to moderate review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const columns = [
    {
      key: 'rating',
      header: t('colRating'),
      render: (review: Review) => (
        <div>
          <span className="text-yellow-500">{renderStars(review.rating)}</span>
          {(review.ratingGuide || review.ratingTransport || review.ratingValue) && (
            <div className="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              {review.ratingGuide != null && (
                <div>{t('ratingGuide', { value: review.ratingGuide })}</div>
              )}
              {review.ratingTransport != null && (
                <div>{t('ratingTransport', { value: review.ratingTransport })}</div>
              )}
              {review.ratingValue != null && (
                <div>{t('ratingValue', { value: review.ratingValue })}</div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'user',
      header: t('colUser'),
      render: (review: Review) => (
        <div className="text-sm">
          {review.user ? (
            <span className="font-medium">{review.user.firstName} {review.user.lastName}</span>
          ) : (
            <span className="italic text-gray-400">{t('userUnknown')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'content',
      header: t('colContent'),
      render: (review: Review) => (
        <div className="max-w-md">
          {review.title && <p className="truncate font-medium">{review.title}</p>}
          <p className="truncate text-sm text-gray-500">{review.body || '-'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('colStatus'),
      render: (review: Review) => (
        <div className="flex items-center gap-2">
          <ReviewStatusBadge status={review.status} />
          {review.verifiedBooking && (
            <Badge variant="success">{t('verifiedBadge')}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'helpful',
      header: t('colHelpful'),
      render: (review: Review) => review.helpfulCount,
    },
    {
      key: 'createdAt',
      header: t('colDate'),
      render: (review: Review) => new Date(review.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (review: Review) => (
        <div className="flex items-center gap-1">
          {review.status !== 'PUBLISHED' && (
            <button
              onClick={() => openModerationModal(review, 'publish')}
              className="rounded p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
              title={t('tooltipPublish')}
            >
              <RiCheckLine className="h-4 w-4" />
            </button>
          )}
          {review.status !== 'HIDDEN' && (
            <button
              onClick={() => openModerationModal(review, 'hide')}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              title={t('tooltipHide')}
            >
              <RiEyeOffLine className="h-4 w-4" />
            </button>
          )}
          {review.status !== 'REJECTED' && (
            <button
              onClick={() => openModerationModal(review, 'reject')}
              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title={t('tooltipReject')}
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const tourOptions = tours.map((tour) => ({ value: tour.id, label: tour.title }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={selectedTourId}
            onChange={(e) => {
              setSelectedTourId(e.target.value);
              setCurrentPage(1);
            }}
            options={tourOptions}
            placeholder={t('selectTourPlaceholder')}
            wrapperClassName="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={statusOptions}
            wrapperClassName="sm:w-40 sm:flex-shrink-0"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {!selectedTourId ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            {t('selectTourPrompt')}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={reviews}
              keyExtractor={(r) => r.id}
              isLoading={isLoading}
              emptyMessage={t('empty')}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={10}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </Card>

      {/* Moderation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          moderationAction === 'publish'
            ? t('moderatePublishTitle')
            : moderationAction === 'hide'
              ? t('moderateHideTitle')
              : t('moderateRejectTitle')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant={moderationAction === 'reject' ? 'danger' : 'primary'}
              onClick={handleModerate}
              isLoading={isSubmitting}
            >
              {tc('confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedReview && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="mb-2 text-yellow-500">
                {renderStars(selectedReview.rating)}
              </div>
              {selectedReview.title && (
                <p className="font-medium">{selectedReview.title}</p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedReview.body || t('noContent')}
              </p>
            </div>
          )}
          <Input
            label={t('reasonLabel')}
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
          />
        </div>
      </Modal>
    </div>
  );
}
