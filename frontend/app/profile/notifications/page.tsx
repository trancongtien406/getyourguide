'use client';

import { Pagination, Table } from '@/components/ui/table';
import { notificationsApi, type Notification } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { HiBell, HiCheckCircle, HiClock, HiExclamationCircle } from 'react-icons/hi';

const EVENT_ICON: Record<string, React.ReactNode> = {
  booking_confirmed: <HiCheckCircle className="h-5 w-5 text-green-500" />,
  booking_cancelled: <HiExclamationCircle className="h-5 w-5 text-red-500" />,
  payment_received: <HiCheckCircle className="h-5 w-5 text-blue-500" />,
};

export default function NotificationsPage() {
  const t = useTranslations('profile');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 15;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.listMyNotifications({
        page: String(page),
        pageSize: String(pageSize),
      });
      setNotifications(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const statusIcon = (status: string) => {
    if (status === 'SENT' || status === 'DELIVERED') return <HiCheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'QUEUED' || status === 'PENDING') return <HiClock className="h-4 w-4 text-amber-500" />;
    if (status === 'FAILED') return <HiExclamationCircle className="h-4 w-4 text-red-500" />;
    return <HiBell className="h-4 w-4 text-slate-400" />;
  };

  const columns = [
    {
      key: 'event',
      header: t('notifEvent'),
      render: (n: Notification) => (
        <div className="flex items-center gap-2">
          {EVENT_ICON[n.eventKey] ?? <HiBell className="h-5 w-5 text-slate-400" />}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {n.eventKey.replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'channel',
      header: t('notifChannel'),
      render: (n: Notification) => (
        <span className="capitalize text-sm text-slate-500 dark:text-slate-400">
          {n.channel}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('notifStatus'),
      render: (n: Notification) => (
        <div className="flex items-center gap-1.5">
          {statusIcon(n.status)}
          <span className="text-sm capitalize">{n.status.toLowerCase()}</span>
        </div>
      ),
    },
    {
      key: 'sentAt',
      header: t('notifDate'),
      render: (n: Notification) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {n.sentAt
            ? new Date(n.sentAt).toLocaleString()
            : new Date(n.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('notificationsTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('notificationsSubtitle')}</p>
      </div>

      <Table
        columns={columns}
        data={notifications}
        keyExtractor={(n) => n.id}
        isLoading={loading}
        emptyMessage={t('notificationsEmpty')}
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
