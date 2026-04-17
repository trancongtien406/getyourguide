'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/api';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const STATUS_I18N_MAP: Record<BookingStatus, string> = {
  INITIATED: 'statusInitiated',
  PENDING_PAYMENT: 'statusPendingPayment',
  CONFIRMED: 'statusConfirmed',
  FAILED: 'statusFailed',
  CANCELLED_BY_CUSTOMER: 'statusCancelledCustomer',
  CANCELLED_BY_OPERATOR: 'statusCancelledOperator',
  EXPIRED: 'statusExpired',
  REFUNDED_PARTIAL: 'statusRefundedPartial',
  REFUNDED_FULL: 'statusRefundedFull',
};

export default function MyBookingsPage() {
  const t = useTranslations('profile');
  const tb = useTranslations('bookings');
  const { locale, currency } = useLocaleCurrency();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const res = await bookingsApi.listBookings(params);
      setBookings(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings, locale, currency]);

  const statusVariant = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      CONFIRMED: 'success',
      PENDING_PAYMENT: 'warning',
      INITIATED: 'info',
      CANCELLED_BY_CUSTOMER: 'danger',
      CANCELLED_BY_OPERATOR: 'danger',
      FAILED: 'danger',
      EXPIRED: 'default',
      REFUNDED_FULL: 'default',
      REFUNDED_PARTIAL: 'warning',
    };
    return map[status] || 'default';
  };

  const columns = [
    {
      key: 'bookingRef',
      header: tb('colRef'),
      render: (b: Booking) => (
        <Link href={`/profile/bookings/${b.id}`} className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">{b.bookingRef}</Link>
      ),
    },
    {
      key: 'tour',
      header: tb('colTour'),
      render: (b: Booking) => {
        const firstItem = b.items?.[0];
        if (!firstItem) return <span className="text-slate-400">—</span>;
        return (
          <div className="max-w-[220px]">
            <p className="font-medium text-slate-900 dark:text-white truncate text-sm">{firstItem.titleSnapshot}</p>
            {firstItem.optionSnapshot && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{firstItem.optionSnapshot}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: tb('colStatus'),
      render: (b: Booking) => {
        const statusKey = STATUS_I18N_MAP[b.status as BookingStatus];
        const statusLabel = statusKey
          ? tb(statusKey as Parameters<typeof tb>[0])
          : b.status.replace(/_/g, ' ');

        return <Badge variant={statusVariant(b.status)}>{statusLabel}</Badge>;
      },
    },
    {
      key: 'totalAmount',
      header: tb('colAmount'),
      render: (b: Booking) => (
        <span className="font-medium">{b.currencyCode} {Number(b.totalAmount).toLocaleString()}</span>
      ),
    },
    {
      key: 'createdAt',
      header: tb('colDate'),
      render: (b: Booking) => new Date(b.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('myBookingsTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('myBookingsSubtitle')}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          placeholder={tb('searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          wrapperClassName="w-48"
          options={[
            { value: '', label: tb('statusAll') },
            ...Object.entries(STATUS_I18N_MAP).map(([value, key]) => ({
              value,
              label: tb(key as Parameters<typeof tb>[0]),
            })),
          ]}
        />
      </div>

      <Table
        columns={columns}
        data={bookings}
        keyExtractor={(b) => b.id}
        isLoading={loading}
        emptyMessage={t('myBookingsEmpty')}
      />

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
