'use client';

import { cartApi, catalogApi, type CartData, type CartItem, type Tour } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useGuestCart, type GuestCartItem } from '@/lib/guest-cart-context';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    HiOutlineArrowLeft,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineLocationMarker,
    HiOutlineMinus,
    HiOutlinePlus,
    HiOutlineShieldCheck,
    HiOutlineShoppingCart,
    HiOutlineTag,
    HiOutlineTrash,
    HiOutlineUserGroup,
} from 'react-icons/hi';

/* ─── Unified item shape for rendering ─── */
interface DisplayCartItem {
  id: string;
  departureSlotId: string;
  tourId: string;
  tourTitle: string;
  optionTitle: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  startsAt: string;
  travelerMix?: Array<Record<string, unknown>>;
  languageCode?: string;
}

/* ─── Tour metadata cache (images, slugs) ─── */
interface TourMeta {
  slug: string;
  coverImage?: string;
  durationMinutes?: number;
  cityName?: string;
}

export default function CartPage() {
  const t = useTranslations('public');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const guestCart = useGuestCart();
  const { formatPrice, formatDate, formatTime, locale, currency } = useLocaleCurrency();
  const { addToast } = useToast();
  const router = useRouter();

  // Server cart state (for authenticated users)
  const [serverCart, setServerCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [tourMeta, setTourMeta] = useState<Record<string, TourMeta>>({});
  const [error, setError] = useState<string | null>(null);

  // Guest checkout form
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const isGuest = !authLoading && !isAuthenticated;

  // Fetch tour metadata (images, slugs, etc.)
  const fetchTourMeta = useCallback(async (tourIds: string[]) => {
    const missing = tourIds.filter(id => !tourMeta[id]);
    if (!missing.length) return;
    await Promise.all(
      missing.map(async (tourId) => {
        try {
          const tour: Tour = await catalogApi.getTourById(tourId);
          const cover = tour.media?.find(m => m.isCover)?.url
            || tour.media?.find(m => m.mediaType === 'IMAGE')?.url;
          setTourMeta(prev => ({
            ...prev,
            [tourId]: {
              slug: tour.slug,
              coverImage: cover,
              durationMinutes: tour.durationMinutes,
            },
          }));
        } catch { /* ignore */ }
      }),
    );
  }, [tourMeta]);

  // Fetch server cart for authenticated users
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await cartApi.getMyCart();
      setServerCart(data);
      if (data?.items) {
        const uniqueTourIds = [...new Set(data.items.map((i: CartItem) => i.tourId))];
        fetchTourMeta(uniqueTourIds);
      }
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchTourMeta]);

  useEffect(() => {
    if (!authLoading) fetchCart();
  }, [fetchCart, authLoading, locale, currency]);

  // Resolve tour meta for guest cart items
  useEffect(() => {
    if (!isGuest || guestCart.items.length === 0) return;
    const ids = [...new Set(guestCart.items.map(i => i.tourId))];
    fetchTourMeta(ids);
  }, [isGuest, guestCart.items, fetchTourMeta]);

  // Unified display items
  const displayItems: DisplayCartItem[] = useMemo(() => {
    if (isAuthenticated && serverCart?.items) {
      return serverCart.items.map((i: CartItem) => ({
        id: i.id,
        departureSlotId: i.departureSlotId,
        tourId: i.tourId,
        tourTitle: i.tourTitle,
        optionTitle: i.optionTitle,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
        startsAt: i.startsAt,
        languageCode: i.languageCode,
      }));
    }
    if (isGuest) {
      return guestCart.items.map((i: GuestCartItem) => ({
        id: i.id,
        departureSlotId: i.departureSlotId,
        tourId: i.tourId,
        tourTitle: i.tourTitle,
        optionTitle: i.optionTitle,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
        startsAt: i.startsAt,
        travelerMix: i.travelerMix,
        languageCode: i.languageCode,
      }));
    }
    return [];
  }, [isAuthenticated, isGuest, serverCart, guestCart.items]);

  const total = displayItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalTravelers = displayItems.reduce((sum, item) => sum + item.quantity, 0);

  /* ─── Format traveler mix ─── */
  const formatTravelerMix = (item: DisplayCartItem) => {
    if (!item.travelerMix?.length) {
      return t('cartTravelerCount', { count: item.quantity });
    }
    const parts: string[] = [];
    for (const mix of item.travelerMix) {
      const type = String(mix.type || '').toLowerCase();
      const count = Number(mix.count || 0);
      if (count <= 0) continue;
      if (type === 'adult') parts.push(t('cartAdults', { count }));
      else if (type === 'child') parts.push(t('cartChildren', { count }));
      else if (type === 'infant') parts.push(t('cartInfants', { count }));
      else parts.push(`${count} ${type}`);
    }
    return parts.join(', ') || t('cartTravelerCount', { count: item.quantity });
  };

  /* ─── Handlers ─── */
  const handleUpdateQuantity = async (item: DisplayCartItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    if (isAuthenticated) {
      setUpdating(item.id);
      try {
        const updated = await cartApi.updateItem(item.id, { quantity: newQty });
        setServerCart(updated);
      } catch { /* empty */ } finally {
        setUpdating(null);
      }
    } else {
      guestCart.updateQuantity(item.id, newQty);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (isAuthenticated) {
      setUpdating(itemId);
      try {
        await cartApi.removeItem(itemId);
        setServerCart(prev => {
          if (!prev) return null;
          const items = prev.items.filter(i => i.id !== itemId);
          return items.length ? { ...prev, items } : null;
        });
      } catch { /* empty */ } finally {
        setUpdating(null);
      }
    } else {
      guestCart.removeItem(itemId);
    }
  };

  const handleClearCart = async () => {
    if (!confirm(t('cartClearConfirm'))) return;
    if (isAuthenticated) {
      try {
        await cartApi.clearCart();
        setServerCart(null);
      } catch { /* empty */ }
    } else {
      guestCart.clearCart();
    }
  };

  const handleCheckout = async () => {
    if (isAuthenticated) {
      setCheckingOut(true);
      setError(null);
      try {
        const result = await cartApi.checkout({}) as { id?: string; bookingId?: string };
        const bookingId = result?.id || result?.bookingId;
        if (bookingId) {
          router.push(`/checkout/${bookingId}`);
        } else {
          router.push('/profile/bookings');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('cartCheckoutError');
        setError(message);
      } finally {
        setCheckingOut(false);
      }
    } else {
      setShowGuestForm(true);
    }
  };

  const handleGuestCheckout = async () => {
    if (!guestEmail.trim()) {
      setError(t('cartGuestEmailRequired'));
      return;
    }
    setCheckingOut(true);
    setError(null);
    try {
      const result = await cartApi.guestCheckout({
        items: guestCart.items.map(i => ({
          departureSlotId: i.departureSlotId,
          quantity: i.quantity,
          languageCode: i.languageCode,
          travelerMix: i.travelerMix,
        })),
        currencyCode: guestCart.currencyCode!,
        contactEmail: guestEmail.trim(),
        contactPhoneE164: guestPhone.trim() || undefined,
      }) as { id?: string; bookingId?: string; bookingRef?: string };

      guestCart.clearCart();
      addToast('success', t('cartBookingCreated'));

      const bookingId = result?.id ?? result?.bookingId;
      if (bookingId) {
        router.push(`/checkout/${bookingId}`);
      } else {
        router.push('/tours');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('cartCheckoutError');
      setError(message);
    } finally {
      setCheckingOut(false);
    }
  };

  /* ─── Loading state ─── */
  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  /* ─── Empty cart ─── */
  if (displayItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <HiOutlineShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('cartTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{t('cartEmpty')}</p>
          <Link
            href="/tours"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-full text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
            {t('cartBrowseTours')}
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Cart with items ─── */
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/tours"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('cartTitle')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('cartTotalItems', { count: displayItems.length })}
              {isGuest && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <HiOutlineUserGroup className="w-3.5 h-3.5" />
                  {t('cartGuest')}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleClearCart}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <HiOutlineTrash className="w-4 h-4" />
          {t('cartClearAll')}
        </button>
      </div>

      {/* Guest notice */}
      {isGuest && !showGuestForm && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
          <HiOutlineUserGroup className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
            {t('cartGuestNote')}
          </p>
          <Link
            href="/sign-in?returnUrl=%2Fcart"
            className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            {t('authLoginBtn')}
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Cart Items — wider column */}
        <div className="lg:col-span-3 space-y-4">
          {displayItems.map((item) => {
            const meta = tourMeta[item.tourId];
            return (
              <div
                key={item.id}
                className={`group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  updating === item.id ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Tour Image */}
                  <Link
                    href={`/tours/${meta?.slug || item.tourId}`}
                    className="relative sm:w-44 h-36 sm:h-auto flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700"
                  >
                    {meta?.coverImage ? (
                      <Image
                        src={meta.coverImage}
                        alt={item.tourTitle}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 176px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <HiOutlineLocationMarker className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-5 min-w-0">
                    {/* Title + Remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/tours/${meta?.slug || item.tourId}`}
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-primary transition-colors line-clamp-2 block"
                        >
                          {item.tourTitle}
                        </Link>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <HiOutlineTag className="w-3 h-3" />
                            {item.optionTitle}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updating === item.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors flex-shrink-0"
                        title={t('cartClearAll')}
                      >
                        <HiOutlineTrash className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <HiOutlineCalendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{formatDate(item.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <HiOutlineClock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{formatTime(item.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 col-span-2">
                        <HiOutlineUserGroup className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{formatTravelerMix(item)}</span>
                      </div>
                    </div>

                    {/* Price & Quantity row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleUpdateQuantity(item, -1)}
                          disabled={item.quantity <= 1 || updating === item.id}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        >
                          <HiOutlineMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item, 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        >
                          <HiOutlinePlus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(item.lineTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">{t('cartSummary')}</h2>

              {/* Line items */}
              <div className="space-y-3 mb-5">
                {displayItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">
                        {item.tourTitle}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.optionTitle} · {formatTravelerMix(item)}
                      </p>
                    </div>
                    <span className="text-sm text-slate-900 dark:text-white font-semibold whitespace-nowrap">
                      {formatPrice(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              <div className="space-y-2 py-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('cartSubtotal')}</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('cartTravelers')}</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{totalTravelers}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-slate-900 dark:text-white">{t('cartTotal')}</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Guest checkout form */}
            {isGuest && showGuestForm && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('cartGuestContactInfo')}
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    placeholder={t('cartGuestEmail')}
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    {t('cartGuestPhone')}
                  </label>
                  <input
                    type="tel"
                    placeholder="+84 xxx xxx xxx"
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={handleGuestCheckout}
                  disabled={checkingOut}
                  className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <HiOutlineShieldCheck className="w-5 h-5" />
                  {checkingOut ? t('cartProcessing') : t('cartGuestCheckoutConfirm')}
                </button>
                <div className="text-center">
                  <Link
                    href="/sign-in?returnUrl=%2Fcart"
                    className="text-xs text-primary hover:underline"
                  >
                    {t('cartLoginInstead')}
                  </Link>
                </div>
              </div>
            )}

            {/* Checkout actions */}
            {!(isGuest && showGuestForm) && (
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <HiOutlineShieldCheck className="w-5 h-5" />
                  {checkingOut ? t('cartProcessing') : t('cartSecureCheckout')}
                </button>

                {isGuest && (
                  <Link
                    href="/sign-in?returnUrl=%2Fcart"
                    className="block text-center text-sm text-primary hover:underline transition-colors font-medium"
                  >
                    {t('cartLoginToCheckout')}
                  </Link>
                )}
              </div>
            )}

            {/* Continue shopping */}
            <Link
              href="/tours"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors py-2"
            >
              <HiOutlineArrowLeft className="w-4 h-4" />
              {t('cartContinueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
