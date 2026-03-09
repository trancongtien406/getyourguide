'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { authApi, catalogApi, type SupplierMembership, type Tour, type TourStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiEditLine, RiEyeLine, RiSearchLine } from 'react-icons/ri';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
  SUSPENDED: 'danger',
};

const TOUR_STATUSES: TourStatus[] = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'];

export default function SupplierToursPage() {
  const t = useTranslations('profile');
  const tt = useTranslations('catalog');
  const tc = useTranslations('common');
  const { user } = useAuth();

  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierMembership[]>([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const pageSize = 10;

  // Fetch supplier memberships on mount
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const data = await authApi.getMySuppliers();
        setSuppliers(data);
        // If single supplier, auto-select
        if (data.length === 1) setSupplierFilter(data[0].id);
      } catch { /* empty */ }
    }
    loadSuppliers();
  }, []);

  const fetchTours = useCallback(async () => {
    // Don't fetch until we have a supplier filter
    if (!supplierFilter && suppliers.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      // Filter by supplier – if single supplier auto-selected, or user chose one
      if (supplierFilter) {
        params.supplierId = supplierFilter;
      } else if (suppliers.length > 0) {
        // If multiple suppliers and none selected, filter by all supplier IDs
        params.supplierId = suppliers.map((s) => s.id).join(',');
      }
      const res = await catalogApi.listTours(params);
      setTours(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, supplierFilter, suppliers]);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  useEffect(() => { setPage(1); }, [search, statusFilter, supplierFilter]);

  if (!user) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('supplierToursTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('supplierToursSubtitle')}</p>
        </div>
        <Link href="/profile/supplier/tours/new">
          <Button>
            <RiAddLine className="h-4 w-4" />
            {tt('createTour')}
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-64">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={tc('search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          wrapperClassName="w-44"
          options={[
            { value: '', label: tc('allStatuses') },
            ...TOUR_STATUSES.map((s) => ({ value: s, label: tt(`status${s[0] + s.slice(1).toLowerCase()}` as Parameters<typeof tt>[0]) })),
          ]}
        />
        {suppliers.length > 1 && (
          <Select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            wrapperClassName="w-52"
            options={[
              { value: '', label: tc('all') },
              ...suppliers.map((s) => ({ value: s.id, label: s.displayName || s.legalName })),
            ]}
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : tours.length === 0 ? (
        <div className="py-12 text-center text-gray-500">{tt('toursEmpty')}</div>
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'title',
                header: tt('colTour'),
                render: (tour: Tour) => (
                  <Link
                    href={`/profile/supplier/tours/${tour.id}/edit`}
                    className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {tour.title}
                  </Link>
                ),
              },
              {
                key: 'status',
                header: tc('status'),
                render: (tour: Tour) => (
                  <Badge variant={statusVariant[tour.status] || 'default'}>{tour.status}</Badge>
                ),
              },
              {
                key: 'rating',
                header: tt('colRating'),
                render: (tour: Tour) => (
                  <span>{tour.ratingAvg ? `${Number(tour.ratingAvg).toFixed(1)} (${tour.ratingCount})` : '-'}</span>
                ),
              },
              {
                key: 'bookingCount',
                header: tt('colBookings'),
                render: (tour: Tour) => <span>{tour.bookingCount}</span>,
              },
              {
                key: 'createdAt',
                header: tt('colCreated'),
                render: (tour: Tour) => (
                  <span className="text-gray-500">{new Date(tour.createdAt).toLocaleDateString()}</span>
                ),
              },
              {
                key: 'actions',
                header: '',
                className: 'w-24',
                render: (tour: Tour) => (
                  <div className="flex items-center gap-1">
                    <Link href={`/profile/supplier/tours/${tour.id}/edit`}>
                      <Button variant="ghost" size="sm"><RiEditLine className="h-4 w-4" /></Button>
                    </Link>
                    <Link href={`/tours/${tour.slug || tour.id}`} target="_blank">
                      <Button variant="ghost" size="sm"><RiEyeLine className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                ),
              },
            ]}
            data={tours}
            keyExtractor={(tour) => tour.id}
            isLoading={loading}
            emptyMessage={tt('toursEmpty')}
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
