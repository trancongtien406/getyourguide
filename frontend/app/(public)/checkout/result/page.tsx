'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';

function PaymentResultContent() {
  const t = useTranslations('public');
  const searchParams = useSearchParams();

  // VNPay returns vnp_ResponseCode, MoMo returns resultCode
  const vnpCode = searchParams.get('vnp_ResponseCode');
  const momoCode = searchParams.get('resultCode');
  const isSuccess = vnpCode === '00' || momoCode === '0';
  const isError = (vnpCode && vnpCode !== '00') || (momoCode && momoCode !== '0');

  return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center">
      {isSuccess ? (
        <>
          <HiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('paymentSuccess')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {t('paymentSuccessDesc')}
          </p>
        </>
      ) : isError ? (
        <>
          <HiXCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('paymentFailed')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {t('paymentFailedDesc')}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('paymentProcessing')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {t('paymentProcessingDesc')}
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/profile/bookings"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          {t('viewBookings')}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 px-6 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto py-20 px-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
