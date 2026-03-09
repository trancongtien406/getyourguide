'use client';

import { BookingStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { bookingsApi, type Booking } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiEyeLine, RiSearchLine } from 'react-icons/ri';

export default function BookingsPage() {
  const t = useTranslations('bookings');
  const tc = useTranslations('common');

  const statusOptions = [
    { value: '', label: t('statusAll') },
    { value: 'INITIATED', label: t('statusInitiated') },
    { value: 'PENDING_PAYMENT', label: t('statusPendingPayment') },
    { value: 'CONFIRMED', label: t('statusConfirmed') },
    { value: 'CANCELLED_BY_CUSTOMER', label: t('statusCancelledCustomer') },
    { value: 'CANCELLED_BY_OPERATOR', label: t('statusCancelledOperator') },
    { value: 'FAILED', label: t('statusFailed') },
    { value: 'EXPIRED', label: t('statusExpired') },
    { value: 'REFUNDED_PARTIAL', label: t('statusRefundedPartial') },
    { value: 'REFUNDED_FULL', label: t('statusRefundedFull') },
  ];

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await bookingsApi.listAllBookings(params);
      setBookings(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBookings();
  };

  const openDetailModal = async (booking: Booking) => {
    try {
      const fullBooking = await bookingsApi.getBookingById(booking.id);
      setSelectedBooking(fullBooking);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedBooking(booking);
      setIsDetailModalOpen(true);
    }
  };

  const openCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingsApi.cancelBooking(selectedBooking.id, cancelReason);
      setIsCancelModalOpen(false);
      fetchBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency || 'VND',
    }).format(amount);

  const columns = [
    {
      key: 'bookingRef',
      header: t('colRef'),
      render: (b: Booking) => (
        <span className="font-mono font-medium">{b.bookingRef}</span>
      ),
    },
    {
      key: 'tour',
      header: t('colTour'),
      render: (b: Booking) => {
        const firstItem = b.items?.[0];
        if (!firstItem) return <span className="text-gray-400">—</span>;
        return (
          <div className="max-w-[200px]">
            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{firstItem.titleSnapshot}</p>
            {firstItem.optionSnapshot && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{firstItem.optionSnapshot}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: t('colCustomer'),
      render: (b: Booking) => {
        if (b.user) {
          return (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{b.user.firstName} {b.user.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{b.user.email}</p>
            </div>
          );
        }
        return (
          <div>
            <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">{t('guestLabel')}</span>
            {b.contactEmail && <p className="text-xs text-gray-500 mt-0.5">{b.contactEmail}</p>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: t('colStatus'),
      render: (b: Booking) => <BookingStatusBadge status={b.status} />,
    },
    {
      key: 'totalAmount',
      header: t('colAmount'),
      render: (b: Booking) => formatCurrency(Number(b.totalAmount), b.currencyCode),
    },
    {
      key: 'createdAt',
      header: t('colDate'),
      render: (b: Booking) => new Date(b.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (b: Booking) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openDetailModal(b)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('tooltipDetail')}
          >
            <RiEyeLine className="h-4 w-4" />
          </button>
          {(b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => openCancelModal(b)}
            >
              {t('cancelButton')}
            </Button>
          )}
        </div>
      ),
    },
  ];

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
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={statusOptions}
              wrapperClassName="sm:w-48 sm:flex-shrink-0"
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              label={tc('fromDate')}
              wrapperClassName="flex-1"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              label={tc('toDate')}
              wrapperClassName="flex-1"
            />
            <Button type="submit" variant="secondary" className="sm:flex-shrink-0">
              {tc('search')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="sm:flex-shrink-0"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setDateFrom('');
                setDateTo('');
                setCurrentPage(1);
              }}
            >
              {tc('clearFilters')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={bookings}
          keyExtractor={(b) => b.id}
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
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={t('detailModalTitle', { ref: selectedBooking?.bookingRef || '' })}
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t('detailStatus')}</p>
                <BookingStatusBadge status={selectedBooking.status} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailAmount')}</p>
                <p className="font-semibold">
                  {formatCurrency(Number(selectedBooking.totalAmount), selectedBooking.currencyCode)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailEmail')}</p>
                <p>{selectedBooking.contactEmail || '-'}</p>
              </div>
              {selectedBooking.contactPhoneE164 && (
                <div>
                  <p className="text-sm text-gray-500">{t('detailPhone')}</p>
                  <p>{selectedBooking.contactPhoneE164}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">{t('detailCreated')}</p>
                <p>{new Date(selectedBooking.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              {selectedBooking.user && (
                <div>
                  <p className="text-sm text-gray-500">{t('colCustomer')}</p>
                  <p>{selectedBooking.user.firstName} {selectedBooking.user.lastName}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.user.email}</p>
                </div>
              )}
            </div>

            {/* Booking Items */}
            {selectedBooking.items && selectedBooking.items.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('detailItems')}</h4>
                <div className="space-y-2">
                  {selectedBooking.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.titleSnapshot}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.optionSnapshot && <span>{item.optionSnapshot}</span>}
                          <span>·</span>
                          <span>{new Date(item.startsAtSnapshot).toLocaleString('vi-VN')}</span>
                          <span>·</span>
                          <span>x{item.quantity}</span>
                        </div>
                      </div>
                      <p className="font-semibold text-sm whitespace-nowrap">
                        {formatCurrency(Number(item.lineTotal), selectedBooking.currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t('cancelModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
              {t('cancelKeep')}
            </Button>
            <Button variant="danger" onClick={handleCancel} isLoading={isSubmitting}>
              {t('cancelSubmit')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('cancelConfirm', { ref: selectedBooking?.bookingRef ?? '' })}
          </p>
          <Input
            label={t('cancelReasonLabel')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t('cancelReasonPlaceholder')}
          />
        </div>
      </Modal>
    </div>
  );
}
