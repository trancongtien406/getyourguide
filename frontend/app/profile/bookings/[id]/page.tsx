'use client';

import { Badge } from '@/components/ui/badge';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { HiArrowLeft, HiCalendar, HiClock, HiMail, HiPhone, HiTicket } from 'react-icons/hi';

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

export default function BookingDetailPage() {
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
      <div className="text-center py-20 text-slate-500">
        <p>{t('bookingNotFound')}</p>
        <button onClick={() => router.push('/profile/bookings')} className="mt-4 text-primary hover:underline text-sm">
          ← {t('backToBookings')}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/profile/bookings')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <HiArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('bookingDetailTitle')}
          </h1>
          <p className="text-sm text-slate-500">{booking.bookingRef}</p>
        </div>
        <Badge variant={STATUS_VARIANT[booking.status] || 'default'}>
          {booking.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('bookingSummary')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <HiTicket className="h-5 w-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">{tb('colRef')}</p>
              <p className="font-mono font-medium text-slate-700 dark:text-slate-200">{booking.bookingRef}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HiCalendar className="h-5 w-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">{tb('colDate')}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{new Date(booking.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {booking.confirmedAt && (
            <div className="flex items-center gap-3">
              <HiClock className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{t('confirmedAt')}</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{new Date(booking.confirmedAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          {booking.contactEmail && (
            <div className="flex items-center gap-3">
              <HiMail className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{t('contactEmail')}</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{booking.contactEmail}</p>
              </div>
            </div>
          )}
          {booking.contactPhoneE164 && (
            <div className="flex items-center gap-3">
              <HiPhone className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{t('contactPhone')}</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{booking.contactPhoneE164}</p>
              </div>
            </div>
          )}
        </div>

        {booking.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 mb-1">{t('bookingNotes')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{booking.notes}</p>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-red-400 mb-1">{t('cancelReason')}</p>
            <p className="text-sm text-red-600 dark:text-red-400">{booking.cancellationReason}</p>
          </div>
        )}
      </div>

      {/* Items */}
      {booking.items && booking.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('bookingItems')}</h2>
          <div className="space-y-3">
            {booking.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{item.titleSnapshot}</p>
                  {item.optionSnapshot && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.optionSnapshot}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(item.startsAtSnapshot).toLocaleString()} · x{item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {booking.currencyCode} {Number(item.lineTotal).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('pricingBreakdown')}</h2>
        <div className="space-y-2 text-sm">
          {booking.subtotalAmount != null && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{t('subtotal')}</span>
              <span>{booking.currencyCode} {Number(booking.subtotalAmount).toLocaleString()}</span>
            </div>
          )}
          {booking.discountAmount != null && Number(booking.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('discount')}</span>
              <span>-{booking.currencyCode} {Number(booking.discountAmount).toLocaleString()}</span>
            </div>
          )}
          {booking.feeAmount != null && Number(booking.feeAmount) > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{t('fees')}</span>
              <span>{booking.currencyCode} {Number(booking.feeAmount).toLocaleString()}</span>
            </div>
          )}
          {booking.taxAmount != null && Number(booking.taxAmount) > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{t('tax')}</span>
              <span>{booking.currencyCode} {Number(booking.taxAmount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
            <span>{t('totalAmount')}</span>
            <span>{booking.currencyCode} {Number(booking.totalAmount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      {CANCELLABLE.includes(booking.status) && (
        <div className="flex justify-end">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {cancelling ? t('cancelling') : t('cancelBooking')}
          </button>
        </div>
      )}
    </div>
  );
}
