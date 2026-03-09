'use client';

import { useAuth } from '@/lib/auth-context';
import {
    useLocaleCurrency,
} from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
    HiOutlineCheck,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineGlobeAlt,
    HiOutlineHeart,
    HiOutlineLogin,
    HiOutlineLogout,
    HiOutlineMenu,
    HiOutlineShieldCheck,
    HiOutlineShoppingCart,
    HiOutlineStar,
    HiOutlineUser,
    HiOutlineUserAdd,
    HiOutlineX,
} from 'react-icons/hi';
import { AuthDialog } from './auth-dialog';
import { CitySearchDropdown } from './city-search-dropdown';
import { ProfileDropdown } from './profile-dropdown';

export function Navbar() {
  const t = useTranslations('public');
  const { user, logout, isAdmin, isLoading } = useAuth();
  const { locale, currency, locales, currencies, switchLocale, switchCurrency } = useLocaleCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<'login' | 'register'>('login');
  const [globeOpen, setGlobeOpen] = useState(false);
  const globeRef = useRef<HTMLDivElement>(null);

  const openLogin = () => {
    setAuthDialogTab('login');
    setAuthDialogOpen(true);
    setMobileMenuOpen(false);
  };

  const openRegister = () => {
    setAuthDialogTab('register');
    setAuthDialogOpen(true);
    setMobileMenuOpen(false);
  };

  /* close globe dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (globeRef.current && !globeRef.current.contains(e.target as Node)) {
        setGlobeOpen(false);
      }
    };
    if (globeOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [globeOpen]);

  return (
    <>
      <nav aria-label="Main navigation" className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo + Search */}
          <div className="flex items-center gap-8 flex-1">
            <Link href="/" className="text-primary font-extrabold text-2xl tracking-tighter flex items-center shrink-0">
              <span className="text-slate-900 dark:text-white mr-1">GET</span>YOURGUIDE
            </Link>

            {/* Desktop Search – City Dropdown */}
            <CitySearchDropdown variant="navbar" />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/profile/favorites"
              className="relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label={t('favorites')}
            >
              <HiOutlineHeart className="w-5 h-5" />
            </Link>
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label={t('cart')}
            >
              <HiOutlineShoppingCart className="w-5 h-5" />
            </Link>
            <div className="relative" ref={globeRef}>
              <button
                onClick={() => setGlobeOpen(!globeOpen)}
                className={`p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors ${globeOpen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                aria-label={t('footerLanguage')}
                aria-expanded={globeOpen}
                aria-haspopup="true"
              >
                <HiOutlineGlobeAlt className="w-5 h-5" />
              </button>

              {/* Language & Currency Dropdown */}
              {globeOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  {/* Language */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t('footerLanguage')}</p>
                    <div className="space-y-1">
                      {locales.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => { switchLocale(l.code); setGlobeOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            locale === l.code
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span className="flex-1 text-left">{l.label}</span>
                          {locale === l.code && <HiOutlineCheck className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-slate-700" />

                  {/* Currency */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t('footerCurrency')}</p>
                    <div className="space-y-1">
                      {currencies.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { switchCurrency(c.code); setGlobeOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            currency === c.code
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-base font-mono">{c.symbol}</span>
                          <span className="flex-1 text-left">{c.code} – {c.label}</span>
                          {currency === c.code && <HiOutlineCheck className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

            {isLoading ? (
              /* Skeleton placeholder while auth state resolves */
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            ) : user ? (
              <ProfileDropdown />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openLogin}
                  className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('signIn')}
                </button>
                <button
                  onClick={openRegister}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors shadow-sm"
                >
                  {t('authRegisterTab')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-4 border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="mb-3">
              <CitySearchDropdown variant="mobile" />
            </div>

            <div className="flex flex-col">
              <Link
                href="/profile/favorites"
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <HiOutlineHeart className="w-5 h-5 text-slate-400" />
                {t('favorites')}
              </Link>
              <Link
                href="/cart"
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <HiOutlineShoppingCart className="w-5 h-5 text-slate-400" />
                {t('cart')}
              </Link>

              {/* Mobile Language & Currency */}
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
              <div className="px-3 py-2 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('footerLanguage')}</p>
                  <div className="flex gap-2">
                    {locales.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => switchLocale(l.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          locale === l.code
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span>{l.flag}</span> {l.code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('footerCurrency')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {currencies.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => switchCurrency(c.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          currency === c.code
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {c.symbol} {c.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  <div className="flex items-center gap-3 px-3 py-3">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </>
              ) : user ? (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HiOutlineUser className="w-5 h-5 text-slate-400" />
                    {t('dropdownProfile')}
                  </Link>
                  <Link
                    href="/profile/bookings"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HiOutlineClipboardList className="w-5 h-5 text-slate-400" />
                    {t('dropdownBookings')}
                  </Link>
                  <Link
                    href="/profile/reviews"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HiOutlineStar className="w-5 h-5 text-slate-400" />
                    {t('dropdownReviews')}
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HiOutlineCog className="w-5 h-5 text-slate-400" />
                    {t('dropdownSettings')}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <HiOutlineShieldCheck className="w-5 h-5" />
                      {t('dropdownAdmin')}
                    </Link>
                  )}
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <HiOutlineLogout className="w-5 h-5" />
                    {t('dropdownLogout')}
                  </button>
                </>
              ) : (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  <button
                    onClick={openLogin}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <HiOutlineLogin className="w-5 h-5 text-slate-400" />
                    {t('signIn')}
                  </button>
                  <button
                    onClick={openRegister}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    <HiOutlineUserAdd className="w-5 h-5" />
                    {t('authRegisterTab')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Auth Dialog */}
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        initialTab={authDialogTab}
      />
    </>
  );
}
