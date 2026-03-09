'use client';

import { bookingsApi, paymentsApi, type Booking, type BookingItem, type PaymentOption } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    HiArrowLeft,
    HiCalendar,
    HiCheckCircle,
    HiClipboardCopy,
    HiClock,
    HiCreditCard,
    HiMail,
    HiPhone,
    HiShieldCheck,
    HiTicket,
    HiUserGroup,
} from 'react-icons/hi';

export default function CheckoutPage() {
  const t = useTranslations('public');
  const { formatPrice, formatDate, formatTime } = useLocaleCurrency();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isGuest = !authLoading && !isAuthenticated;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use guest endpoint for unauthenticated users, authenticated endpoint otherwise
      let bookingData: Booking;
      if (isGuest) {
        bookingData = await bookingsApi.getGuestBookingById(bookingId);
      } else {
        bookingData = await bookingsApi.getBookingById(bookingId);
      }

      const options = await paymentsApi
        .getOptions({ currencyCode: bookingData.currencyCode || 'VND' })
        .catch(() => [] as PaymentOption[]);

      setBooking(bookingData);
      const enabledOptions = Array.isArray(options)
        ? options.filter((o) => o.enabled)
        : [];
      setPaymentOptions(enabledOptions);
      if (enabledOptions.length > 0) {
        setSelectedMethod(enabledOptions[0].method);
      }
    } catch {
      setError(t('checkoutLoadError'));
    } finally {
      setLoading(false);
    }
  }, [bookingId, isGuest, t]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  const handlePay = async () => {
    if (!booking || !selectedMethod) return;
    setPaying(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/checkout/result`;
      let result;
      if (selectedMethod === 'VNPAY') {
        result = await paymentsApi.initiateVnpay({ bookingId: booking.id, returnUrl });
      } else if (selectedMethod === 'MOMO') {
        result = await paymentsApi.initiateMomo({ bookingId: booking.id, returnUrl });
      }

      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        setError(t('checkoutPayError'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('checkoutPayError');
      setError(msg);
    } finally {
      setPaying(false);
    }
  };

  const copyBookingRef = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.bookingRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT': return t('checkoutPendingPayment');
      case 'CONFIRMED': return t('checkoutConfirmed');
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_OPERATOR': return t('checkoutCancelled');
      default: return status.replace(/_/g, ' ').toLowerCase();
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      case 'CONFIRMED': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_OPERATOR': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800';
    }
  };

  /* ─── Loading ─── */
  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error && !booking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <HiTicket className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('checkoutLoadError')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('checkoutRetryLoad')}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-6 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('checkoutBackToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const items = booking.items ?? [];
  const hasDiscount = booking.discountAmount && Number(booking.discountAmount) > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <HiArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('checkoutTitle')}</h1>
      </div>

      {/* Success banner */}
      <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 flex items-start gap-3">
        <HiCheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-green-800 dark:text-green-300">{t('checkoutBookingCreated')}</h3>
          <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">{t('checkoutBookingCreatedDesc')}</p>
          {isGuest && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">{t('checkoutGuestBookingNote')}</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left column — Booking details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Booking reference card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('checkoutOrderSummary')}</h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(booking.status)}`}>
                {formatStatus(booking.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 mb-4">
              <HiTicket className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('checkoutBookingRef')}</p>
                <p className="text-base font-mono font-bold text-slate-900 dark:text-white">{booking.bookingRef}</p>
              </div>
              <button
                onClick={copyBookingRef}
                className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Copy"
              >
                {copied ? (
                  <HiCheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <HiClipboardCopy className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Contact info */}
            {(booking.contactEmail || booking.contactPhoneE164) && (
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t('checkoutContactInfo')}</h3>
                <div className="space-y-2">
                  {booking.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <HiMail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{booking.contactEmail}</span>
                    </div>
                  )}
                  {booking.contactPhoneE164 && (
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <HiPhone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{booking.contactPhoneE164}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Booking items */}
          {items.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('checkoutBookingItems')}</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item: BookingItem) => (
                  <div key={item.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2">
                          {item.titleSnapshot}
                        </h4>
                        {item.optionSnapshot && (
                          <span className="inline-flex items-center mt-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {item.optionSnapshot}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-primary whitespace-nowrap">
                        {formatPrice(Number(item.lineTotal), booking.currencyCode)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <HiCalendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{formatDate(item.startsAtSnapshot)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <HiClock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{formatTime(item.startsAtSnapshot)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <HiUserGroup className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{t('checkoutTravelers', { count: item.quantity })}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                      <span>{t('checkoutUnitPrice')}: {formatPrice(Number(item.unitPrice), booking.currencyCode)}</span>
                      <span>{t('checkoutQuantity')}: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Payment & Total */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price summary */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sticky top-24">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{t('checkoutTotal')}</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('checkoutSubtotal')}</span>
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {formatPrice(Number(booking.subtotalAmount || booking.totalAmount), booking.currencyCode)}
                </span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">{t('checkoutDiscount')}</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    -{formatPrice(Number(booking.discountAmount), booking.currencyCode)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 mb-6">
              <span className="text-base font-bold text-slate-900 dark:text-white">{t('checkoutTotal')}</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(Number(booking.totalAmount), booking.currencyCode)}
              </span>
            </div>

            {/* Payment methods */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">{t('checkoutPaymentMethod')}</h3>
              {paymentOptions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  {t('checkoutNoMethods')}
                </p>
              ) : (
                <div className="space-y-2">
                  {paymentOptions.map((opt) => (
                    <label
                      key={opt.method}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedMethod === opt.method
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={opt.method}
                        checked={selectedMethod === opt.method}
                        onChange={() => setSelectedMethod(opt.method)}
                        className="accent-primary"
                      />
                      <HiCreditCard className="h-5 w-5 text-slate-400" />
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{opt.label || opt.method}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              {paymentOptions.length > 0 && (
                <button
                  onClick={handlePay}
                  disabled={paying || !selectedMethod}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-50 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2"
                >
                  <HiShieldCheck className="h-5 w-5" />
                  {paying ? t('checkoutProcessing') : t('checkoutPayNow')}
                </button>
              )}
              {!isGuest ? (
                <Link
                  href="/profile/bookings"
                  className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  {t('checkoutViewBookings')}
                </Link>
              ) : (
                <Link
                  href="/"
                  className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  {t('checkoutBackToHome')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
