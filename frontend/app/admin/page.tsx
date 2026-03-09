'use client';

import { BookingStatusBadge } from '@/components/ui/badge';
import { Card, StatCard } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { authApi, bookingsApi, catalogApi, type Booking, type User } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
    RiMapPinLine,
    RiMoneyDollarCircleLine,
    RiShoppingCartLine,
    RiUserLine,
} from 'react-icons/ri';

interface DashboardStats {
  totalUsers: number;
  totalTours: number;
  totalBookings: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTours: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, toursRes, bookingsRes] = await Promise.all([
          authApi.listUsers({ pageSize: '5' }),
          catalogApi.listTours({ pageSize: '5' }),
          bookingsApi.listAllBookings({ pageSize: '5' }),
        ]);

        const revenue = bookingsRes.data?.reduce((sum, b) => {
          if (b.status === 'CONFIRMED') {
            return sum + Number(b.totalAmount || 0);
          }
          return sum;
        }, 0) ?? 0;

        setStats({
          totalUsers: usersRes.meta?.total || usersRes.data?.length || 0,
          totalTours: toursRes.meta?.total || toursRes.data?.length || 0,
          totalBookings: bookingsRes.meta?.total || bookingsRes.data?.length || 0,
          totalRevenue: revenue,
        });

        setRecentUsers(usersRes.data || []);
        setRecentBookings(bookingsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const userColumns = [
    { key: 'email', header: t('colEmail') },
    {
      key: 'name',
      header: t('colFullName'),
      render: (u: User) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-',
    },
    {
      key: 'roles',
      header: t('colRole'),
      render: (u: User) => u.roles.map((r) => typeof r === 'string' ? r : r.role).join(', '),
    },
    {
      key: 'createdAt',
      header: t('colJoinDate'),
      render: (u: User) => new Date(u.createdAt).toLocaleDateString(),
    },
  ];

  const bookingColumns = [
    { key: 'bookingRef', header: t('colBookingRef') },
    {
      key: 'status',
      header: t('colStatus'),
      render: (b: Booking) => <BookingStatusBadge status={b.status} />,
    },
    {
      key: 'totalAmount',
      header: t('colAmount'),
      render: (b: Booking) =>
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: b.currencyCode || 'VND',
        }).format(Number(b.totalAmount)),
    },
    {
      key: 'createdAt',
      header: t('colDate'),
      render: (b: Booking) => new Date(b.createdAt).toLocaleDateString(),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('welcome', { name: user?.firstName || 'Admin' })}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {t('overview')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalUsers')}
          value={stats.totalUsers.toLocaleString()}
          icon={<RiUserLine className="h-6 w-6" />}
        />
        <StatCard
          title={t('totalTours')}
          value={stats.totalTours.toLocaleString()}
          icon={<RiMapPinLine className="h-6 w-6" />}
        />
        <StatCard
          title={t('totalBookings')}
          value={stats.totalBookings.toLocaleString()}
          icon={<RiShoppingCartLine className="h-6 w-6" />}
        />
        <StatCard
          title={t('revenue')}
          value={new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'VND',
            notation: 'compact',
          }).format(stats.totalRevenue)}
          icon={<RiMoneyDollarCircleLine className="h-6 w-6" />}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card padding="none">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('recentUsers')}
            </h3>
          </div>
          <Table
            columns={userColumns}
            data={recentUsers}
            keyExtractor={(u) => u.id}
            emptyMessage={t('emptyUsers')}
          />
        </Card>

        {/* Recent Bookings */}
        <Card padding="none">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('recentBookings')}
            </h3>
          </div>
          <Table
            columns={bookingColumns}
            data={recentBookings}
            keyExtractor={(b) => b.id}
            emptyMessage={t('emptyBookings')}
          />
        </Card>
      </div>
    </div>
  );
}
