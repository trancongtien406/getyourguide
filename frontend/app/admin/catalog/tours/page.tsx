'use client';

import { TourStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { catalogApi, referenceDataApi, type City, type Tour } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiEditLine, RiEyeLine, RiSearchLine } from 'react-icons/ri';

export default function ToursPage() {
  const t = useTranslations('catalog');
  const tc = useTranslations('common');

  const [tours, setTours] = useState<Tour[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const statusOptions = [
    { value: '', label: t('statusAll') },
    { value: 'DRAFT', label: t('statusDraft') },
    { value: 'PUBLISHED', label: t('statusPublished') },
    { value: 'PAUSED', label: t('statusPaused') },
    { value: 'ARCHIVED', label: t('statusArchived') },
  ];

  // Fetch cities for filter dropdown
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await referenceDataApi.listCities({ pageSize: '100' });
        setCities(response.data || []);
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    };
    fetchCities();
  }, []);

  const fetchTours = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      if (cityFilter) params.cityId = cityFilter;

      const response = await catalogApi.listTours(params);
      setTours(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch tours:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, statusFilter, cityFilter]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTours();
  };

  const columns = [
    {
      key: 'title',
      header: t('colTour'),
      render: (tour: Tour) => (
        <div className="max-w-xs">
          <p className="truncate font-medium">{tour.title}</p>
          <p className="truncate text-xs text-gray-500">/{tour.slug}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('colStatus'),
      render: (tour: Tour) => <TourStatusBadge status={tour.status} />,
    },
    {
      key: 'duration',
      header: t('colDuration'),
      render: (tour: Tour) =>
        tour.durationMinutes
          ? `${Math.floor(tour.durationMinutes / 60)}h ${tour.durationMinutes % 60}m`
          : '-',
    },
    {
      key: 'rating',
      header: t('colRating'),
      render: (tour: Tour) =>
        tour.ratingAvg ? (
          <span>
            ⭐ {Number(tour.ratingAvg).toFixed(1)} ({tour.ratingCount})
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'bookings',
      header: t('colBookings'),
      render: (tour: Tour) => tour.bookingCount.toLocaleString(),
    },
    {
      key: 'createdAt',
      header: t('colCreated'),
      render: (tour: Tour) => new Date(tour.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (tour: Tour) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/catalog/tours/${tour.id}`}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('tooltipView')}
          >
            <RiEyeLine className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/catalog/tours/${tour.id}/edit`}
            className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title={t('tooltipEdit')}
          >
            <RiEditLine className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('toursTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('toursSubtitle')}
          </p>
        </div>
        <Link href="/admin/catalog/tours/new">
          <Button>
            <RiAddLine className="h-5 w-5" />
            {t('addTour')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <RiSearchLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchTourPlaceholder')}
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
            wrapperClassName="sm:w-40 sm:flex-shrink-0"
          />
          <Select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: t('allCities') },
              ...cities.map((c) => ({ value: c.id, label: c.name })),
            ]}
            wrapperClassName="sm:w-48 sm:flex-shrink-0"
          />
          <Button type="submit" variant="secondary" className="sm:flex-shrink-0">
            {tc('search')}
          </Button>
        </form>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={tours}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage={t('toursEmpty')}
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
    </div>
  );
}
