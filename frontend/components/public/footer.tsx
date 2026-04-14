'use client';

import { ApiError, newsletterApi } from '@/lib/api';
import {
    useLocaleCurrency,
} from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter, FaYoutube } from 'react-icons/fa6';

export function Footer() {
  const t = useTranslations('public');
  const { locale, currency, locales, currencies, switchLocale, switchCurrency } = useLocaleCurrency();
  const [nlEmail, setNlEmail] = useState('');
  const [nlStatus, setNlStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = nlEmail.trim();
    if (!email) return;
    setNlStatus('loading');
    try {
      await newsletterApi.subscribe(email);
      setNlStatus('success');
      setNlEmail('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNlStatus('success');
        setNlEmail('');
        return;
      }
      setNlStatus('error');
    }
  };

  return (
    <footer className="border-t border-slate-200 bg-white px-4 pt-20 pb-8 text-slate-900">
      <div className="layout-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Language & Currency */}
          <div className="space-y-8">
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">
                {t('footerLanguage')}
              </h4>
              <select
                value={locale}
                onChange={(e) => switchLocale(e.target.value as typeof locale)}
                aria-label={t('footerLanguage')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 focus:ring-primary cursor-pointer"
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">
                {t('footerCurrency')}
              </h4>
              <select
                value={currency}
                onChange={(e) => switchCurrency(e.target.value as typeof currency)}
                aria-label={t('footerCurrency')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 focus:ring-primary cursor-pointer"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Apps */}
          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-400">
              {t('footerMobile')}
            </h4>
            <div className="flex flex-row gap-3 md:flex-col md:gap-3">
              <a href="#" aria-label={t('footerAppStore')} className="block transition-opacity hover:opacity-80">
                <Image src="/app-store-badge-en-us.svg" alt={t('footerAppStore')} width={140} height={44} className="h-10 md:h-11 w-auto" />
              </a>
              <a href="#" aria-label={t('footerGooglePlay')} className="block transition-opacity hover:opacity-80">
                <Image src="/google-play-badge-en-us.svg" alt={t('footerGooglePlay')} width={148} height={44} className="h-10 md:h-11 w-auto" />
              </a>
            </div>
          </div>

          {/* Support & Company */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-2">
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">
                {t('footerSupport')}
              </h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li><Link href="/help" className="hover:text-primary transition-colors">{t('footerHelpCenter')}</Link></li>
                <li><Link href="/pages/legal-notice" className="hover:text-primary transition-colors">{t('footerLegalNotice')}</Link></li>
                <li><Link href="/pages/privacy" className="hover:text-primary transition-colors">{t('footerPrivacy')}</Link></li>
                <li><Link href="/pages/terms" className="hover:text-primary transition-colors">{t('footerTerms')}</Link></li>
                <li><Link href="/pages/cookies" className="hover:text-primary transition-colors">{t('footerCookies')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-400">
                {t('footerCompany')}
              </h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li><Link href="/pages/about" className="hover:text-primary transition-colors">{t('footerAbout')}</Link></li>
                <li><Link href="/pages/careers" className="hover:text-primary transition-colors">{t('footerCareers')}</Link></li>
                <li><Link href="/blog" className="hover:text-primary transition-colors">{t('footerBlog')}</Link></li>
                <li><Link href="/pages/press" className="hover:text-primary transition-colors">{t('footerPress')}</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-slate-200 pt-10 pb-10">
          <div className="max-w-lg mx-auto text-center">
            <h3 className="text-lg font-semibold mb-2 text-slate-900">{t('newsletterTitle')}</h3>
            <p className="text-sm text-slate-600 mb-4">{t('newsletterSubtitle')}</p>
            {nlStatus === 'success' ? (
              <p className="text-emerald-600 text-sm font-medium">{t('newsletterSuccess')}</p>
            ) : (
              <>
              {nlStatus === 'error' && (
                <p className="text-red-600 text-sm mb-3">{t('newsletterError')}</p>
              )}
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2" aria-label={t('newsletterSignup')}>
                <input
                  type="email"
                  required
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  placeholder={t('newsletterPlaceholder')}
                  aria-label={t('emailAddress')}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={nlStatus === 'loading'}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {t('newsletterButton')}
                </button>
              </form>
              </>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-slate-500 text-sm">
            © 2008 – {new Date().getFullYear()} GetYourGuide.
          </div>
          <div className="flex items-center gap-5">
            <a href="#" aria-label={t('socialFacebook')} className="text-slate-400 hover:text-primary-600 transition-colors"><FaFacebookF className="w-5 h-5" /></a>
            <a href="#" aria-label={t('socialInstagram')} className="text-slate-400 hover:text-primary-600 transition-colors"><FaInstagram className="w-5 h-5" /></a>
            <a href="#" aria-label={t('socialX')} className="text-slate-400 hover:text-primary-600 transition-colors"><FaXTwitter className="w-5 h-5" /></a>
            <a href="#" aria-label={t('socialYoutube')} className="text-slate-400 hover:text-primary-600 transition-colors"><FaYoutube className="w-5 h-5" /></a>
            <a href="#" aria-label={t('socialLinkedIn')} className="text-slate-400 hover:text-primary-600 transition-colors"><FaLinkedinIn className="w-5 h-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
