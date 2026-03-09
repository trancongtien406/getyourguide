'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiEyeLine, RiSearchLine } from 'react-icons/ri';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'info',
  COMPLETED: 'success',
  CANCELLED_BY_CUSTOMER: 'danger',
  CANCELLED_BY_OPERATOR: 'danger',
  FAILED: 'danger',
  REFUNDED_FULL: 'default',
};

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

export default function SupplierBookingsPage() {
  const t = useTranslations('profile');
  const tb = useTranslations('bookings');
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const res = await bookingsApi.listSupplierBookings(params);
      setBookings(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  if (!user) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('supplierBookingsTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('supplierBookingsSubtitle')}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-64">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={tb('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center text-gray-500">{t('myBookingsEmpty')}</div>
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'bookingRef',
                header: tb('colRef'),
                render: (b: Booking) => (
                  <Link href={`/profile/supplier/bookings/${b.id}`} className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {b.bookingRef || b.id.slice(0, 8)}
                  </Link>
                ),
              },
              {
                key: 'tour',
                header: tb('colTour'),
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
                header: tb('colCustomer'),
                render: (b: Booking) => {
                  if (b.user) {
                    return (
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {b.user.firstName} {b.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{b.user.email}</p>
                      </div>
                    );
                  }
                  return (
                    <div>
                      <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">{tb('guestLabel')}</span>
                      {b.contactEmail && <p className="text-xs text-gray-500 mt-0.5">{b.contactEmail}</p>}
                    </div>
                  );
                },
              },
              {
                key: 'status',
                header: tb('colStatus'),
                render: (b: Booking) => (
                  <Badge variant={statusVariant[b.status] || 'default'}>{b.status.replace(/_/g, ' ')}</Badge>
                ),
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
                render: (b: Booking) => (
                  <span className="text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</span>
                ),
              },
              {
                key: 'actions',
                header: '',
                className: 'w-12',
                render: (b: Booking) => (
                  <Link
                    href={`/profile/supplier/bookings/${b.id}`}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex"
                    title={tb('tooltipDetail')}
                  >
                    <RiEyeLine className="h-4 w-4" />
                  </Link>
                ),
              },
            ]}
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
        </>
      )}
    </div>
  );
}
