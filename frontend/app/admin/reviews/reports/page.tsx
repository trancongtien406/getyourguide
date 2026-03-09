'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Table } from '@/components/ui/table';
import { reviewsApi, type ReviewReport } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
    RiCheckLine,
    RiCloseLine,
    RiEyeOffLine,
    RiFlagLine,
} from 'react-icons/ri';

type ResolveAction = 'DISMISS' | 'HIDE_REVIEW' | 'REJECT_REVIEW';

export default function ReviewReportsPage() {
  const t = useTranslations('reviews');
  const tc = useTranslations('common');

  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resolve modal
  const [selectedReport, setSelectedReport] = useState<ReviewReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolveAction, setResolveAction] = useState<ResolveAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await reviewsApi.listPendingReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch review reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openResolveModal = (report: ReviewReport, action: ResolveAction) => {
    setSelectedReport(report);
    setResolveAction(action);
    setIsModalOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedReport || !resolveAction) return;

    setIsSubmitting(true);
    try {
      await reviewsApi.resolveReport(selectedReport.id, resolveAction);
      setIsModalOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Failed to resolve report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) =>
    '★'.repeat(rating) + '☆'.repeat(5 - rating);

  const actionLabels: Record<ResolveAction, string> = {
    DISMISS: t('reportsDismiss'),
    HIDE_REVIEW: t('reportsHide'),
    REJECT_REVIEW: t('reportsReject'),
  };

  const columns = [
    {
      key: 'reporter',
      header: t('reportsColReporter'),
      render: (r: ReviewReport) => (
        <div className="text-sm">
          {r.user ? (
            <span className="font-medium">
              {r.user.firstName} {r.user.lastName}
            </span>
          ) : (
            <span className="italic text-gray-400">{t('reportsReporterUnknown')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: t('reportsColReason'),
      render: (r: ReviewReport) => (
        <div className="max-w-xs">
          <Badge variant="warning">{r.reason}</Badge>
          {r.details && (
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
              {r.details}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'review',
      header: t('reportsColReview'),
      render: (r: ReviewReport) =>
        r.review ? (
          <div className="max-w-sm">
            <span className="text-sm text-yellow-500">
              {renderStars(r.review.rating)}
            </span>
            {r.review.title && (
              <p className="truncate text-sm font-medium">{r.review.title}</p>
            )}
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {r.review.body || '-'}
            </p>
          </div>
        ) : (
          <span className="text-xs text-gray-400">{t('reportsReviewGone')}</span>
        ),
    },
    {
      key: 'date',
      header: t('reportsColDate'),
      render: (r: ReviewReport) =>
        new Date(r.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (r: ReviewReport) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openResolveModal(r, 'DISMISS')}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('reportsDismiss')}
          >
            <RiCloseLine className="h-4 w-4" />
          </button>
          <button
            onClick={() => openResolveModal(r, 'HIDE_REVIEW')}
            className="rounded p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            title={t('reportsHide')}
          >
            <RiEyeOffLine className="h-4 w-4" />
          </button>
          <button
            onClick={() => openResolveModal(r, 'REJECT_REVIEW')}
            className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            title={t('reportsReject')}
          >
            <RiFlagLine className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('reportsTitle')}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {t('reportsSubtitle')}
        </p>
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={reports}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyMessage={t('reportsEmpty')}
        />
      </Card>

      {/* Resolve Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={resolveAction ? actionLabels[resolveAction] : t('reportsResolveTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant={resolveAction === 'DISMISS' ? 'primary' : 'danger'}
              onClick={handleResolve}
              isLoading={isSubmitting}
            >
              <RiCheckLine className="h-4 w-4" />
              {tc('confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedReport && (
            <>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Report reason: <Badge variant="warning">{selectedReport.reason}</Badge>
                </p>
                {selectedReport.details && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedReport.details}
                  </p>
                )}
              </div>
              {selectedReport.review && (
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-1 text-yellow-500">
                    {renderStars(selectedReport.review.rating)}
                  </div>
                  {selectedReport.review.title && (
                    <p className="font-medium">{selectedReport.review.title}</p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedReport.review.body || t('noContent')}
                  </p>
                </div>
              )}
            </>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {resolveAction === 'DISMISS'
              ? t('reportsDismissDesc')
              : resolveAction === 'HIDE_REVIEW'
                ? t('reportsHideDesc')
                : t('reportsRejectDesc')}
          </p>
        </div>
      </Modal>
    </div>
  );
}
