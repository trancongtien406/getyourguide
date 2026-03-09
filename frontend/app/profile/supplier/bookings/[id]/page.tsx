'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    HiArrowLeft,
    HiCalendar,
    HiClock,
    HiMail,
    HiPhone,
    HiTicket,
    HiUser,
    HiUserGroup,
} from 'react-icons/hi';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
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

const CANCELLABLE: BookingStatus[] = ['CONFIRMED', 'PENDING_PAYMENT'];

export default function SupplierBookingDetailPage() {
  const t = useTranslations('profile');
  const tb = useTranslations('bookings');
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getBookingById(bookingId);
      setBooking(res);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async () => {
    if (!booking) return;
    const reason = prompt(t('cancelReason'));
    if (reason === null) return;
    setCancelling(true);
    try {
      await bookingsApi.cancelBooking(booking.id, reason);
      fetchBooking();
    } catch {
      /* empty */
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>{t('bookingNotFound')}</p>
        <button
          onClick={() => router.push('/profile/supplier/bookings')}
          className="mt-4 text-primary hover:underline text-sm"
        >
          ← {t('backToBookings')}
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: booking.currencyCode || 'VND',
    }).format(amount);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/profile/supplier/bookings')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <HiArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('bookingDetailTitle')}
          </h1>
          <p className="text-sm text-gray-500">{booking.bookingRef}</p>
        </div>
        <Badge variant={STATUS_VARIANT[booking.status] || 'default'}>
          {booking.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('bookingSummary')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <HiTicket className="h-5 w-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">{tb('colRef')}</p>
              <p className="font-mono font-medium text-gray-700 dark:text-gray-200">
                {booking.bookingRef}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HiCalendar className="h-5 w-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">{tb('colDate')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          {booking.confirmedAt && (
            <div className="flex items-center gap-3">
              <HiClock className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('confirmedAt')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {new Date(booking.confirmedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer info */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {tb('colCustomer')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {booking.user ? (
            <div className="flex items-center gap-3">
              <HiUser className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {booking.user.firstName} {booking.user.lastName}
                </p>
                <p className="text-xs text-gray-500">{booking.user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <HiUserGroup className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                  {tb('guestLabel')}
                </span>
              </div>
            </div>
          )}
          {booking.contactEmail && (
            <div className="flex items-center gap-3">
              <HiMail className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('contactEmail')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">{booking.contactEmail}</p>
              </div>
            </div>
          )}
          {booking.contactPhoneE164 && (
            <div className="flex items-center gap-3">
              <HiPhone className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('contactPhone')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">{booking.contactPhoneE164}</p>
              </div>
            </div>
          )}
        </div>

        {booking.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">{t('bookingNotes')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{booking.notes}</p>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-red-400 mb-1">{t('cancelReason')}</p>
            <p className="text-sm text-red-600 dark:text-red-400">{booking.cancellationReason}</p>
          </div>
        )}
      </div>

      {/* Items */}
      {booking.items && booking.items.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('bookingItems')}
          </h2>
          <div className="space-y-3">
            {booking.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {item.titleSnapshot}
                  </p>
                  {item.optionSnapshot && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.optionSnapshot}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.startsAtSnapshot).toLocaleString('vi-VN')} · x{item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {formatCurrency(Number(item.lineTotal))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Breakdown */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('pricingBreakdown')}
        </h2>
        <div className="space-y-2 text-sm">
          {booking.subtotalAmount != null && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{t('subtotal')}</span>
              <span>{formatCurrency(Number(booking.subtotalAmount))}</span>
            </div>
          )}
          {booking.discountAmount != null && Number(booking.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('discount')}</span>
              <span>-{formatCurrency(Number(booking.discountAmount))}</span>
            </div>
          )}
          {booking.feeAmount != null && Number(booking.feeAmount) > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{t('fees')}</span>
              <span>{formatCurrency(Number(booking.feeAmount))}</span>
            </div>
          )}
          {booking.taxAmount != null && Number(booking.taxAmount) > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{t('tax')}</span>
              <span>{formatCurrency(Number(booking.taxAmount))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
            <span>{t('totalAmount')}</span>
            <span>{formatCurrency(Number(booking.totalAmount))}</span>
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      {CANCELLABLE.includes(booking.status) && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={handleCancel}
            isLoading={cancelling}
          >
            {cancelling ? t('cancelling') : t('cancelBooking')}
          </Button>
        </div>
      )}
    </div>
  );
}
