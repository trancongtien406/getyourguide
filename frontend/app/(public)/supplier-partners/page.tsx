'use client';

import { useTranslations } from 'next-intl';

const SUPPLIER_EMAIL = 'partners@example.com';

export default function SupplierPartnersPage() {
  const t = useTranslations('public');

  const mailtoHref = `mailto:${SUPPLIER_EMAIL}?subject=${encodeURIComponent('Đăng ký nhà cung cấp')}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
        {t('supplierPartnersTitle')}
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mb-10 text-sm md:text-base">
        {t('supplierPartnersSubtitle')}
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          {t('supplierPartnersHowTitle')}
        </h2>
        <ol className="space-y-3 text-sm md:text-base text-slate-700 dark:text-slate-200 list-decimal list-inside">
          <li>{t('supplierPartnersHowStep1')}</li>
          <li>{t('supplierPartnersHowStep2')}</li>
          <li>{t('supplierPartnersHowStep3')}</li>
        </ol>
      </section>

      <section className="bg-primary-50 dark:bg-primary/10 border border-primary-100 dark:border-primary/40 rounded-2xl p-6 md:p-8">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-3">
          {t('supplierPartnersContactTitle')}
        </h2>
        <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 mb-4">
          {t('supplierPartnersContactEmail', { email: SUPPLIER_EMAIL })}
        </p>
        <a
          href={mailtoHref}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          {t('supplierPartnersCtaButton')}
        </a>
      </section>
    </div>
  );
}

