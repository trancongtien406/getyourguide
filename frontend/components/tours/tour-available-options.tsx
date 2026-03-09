'use client';

import type { BookingSelections } from '@/components/tours/tour-booking-sidebar';
import { cartApi, type DepartureSlot, type Tour, type TourOptionDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useGuestCart } from '@/lib/guest-cart-context';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useToast } from '@/lib/toast-context';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

/* ─── Duration formatter ─── */
function formatDuration(minutes: number | undefined, t: ReturnType<typeof useTranslations>): string {
  if (!minutes) return '';
  if (minutes < 60) return t('durationMinutes', { min: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? t('durationHoursMin', { hours: h, min: m }) : t('durationHours', { hours: h });
}

/* ─── Time-slot chip component ─── */
function TimeSlotChip({
  departure,
  selected,
  onSelect,
}: {
  departure: DepartureSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  const time = new Date(departure.startsAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const inv = departure.inventory;
  const spotsLeft = inv ? inv.totalCapacity - inv.bookedCapacity - inv.heldCapacity : null;
  const lowStock = spotsLeft !== null && spotsLeft <= 10;

  return (
    <button
      onClick={onSelect}
      className={`relative px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
        selected
          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
          : 'border-foreground/15 hover:border-primary/40 text-foreground'
      }`}
    >
      <span>{time}</span>
      {lowStock && spotsLeft > 0 && (
        <span className="block text-[10px] text-orange-600 dark:text-orange-400 font-normal mt-0.5">
          {spotsLeft} left
        </span>
      )}
    </button>
  );
}

/* ─── Single Option Accordion Card ─── */
function OptionCard({
  option,
  departures,
  selections,
  currency,
  tour,
  defaultExpanded,
}: {
  option: TourOptionDetail;
  departures: DepartureSlot[];
  selections: BookingSelections;
  currency: string;
  tour: Tour;
  defaultExpanded: boolean;
}) {
  const { formatPrice } = useLocaleCurrency();
  const { isAuthenticated } = useAuth();
  const guestCart = useGuestCart();
  const { addToast } = useToast();
  const router = useRouter();
  const t = useTranslations('tourPublic');

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    departures.length === 1 ? departures[0].id : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { adults, children, infants, travelers } = selections;

  // Pricing
  const pricingRules = option.pricingRules ?? [];
  const baseRules = pricingRules.filter(r => r.componentType === 'BASE');
  const unitPrice = baseRules.length > 0
    ? baseRules.reduce((m, r) => Math.min(m, Number(r.amount)), Infinity)
    : null;

  // Try to get traveler-type specific prices
  const adultRule = baseRules.find(r => r.travelerType?.toLowerCase() === 'adult');
  const childRule = baseRules.find(r => r.travelerType?.toLowerCase() === 'child');
  const adultPrice = adultRule ? Number(adultRule.amount) : unitPrice;
  const childPrice = childRule ? Number(childRule.amount) : unitPrice;

  const totalPrice = useMemo(() => {
    if (unitPrice === null || unitPrice === Infinity) return null;
    // Use per-type pricing if available, else flat rate
    if (adultRule || childRule) {
      return (adults * (adultPrice ?? 0)) + (children * (childPrice ?? 0));
    }
    return unitPrice * travelers;
  }, [unitPrice, adults, children, travelers, adultPrice, childPrice, adultRule, childRule]);

  // Cancellation
  const rawPolicy = tour.cancellationPolicy;
  const cancellation = (typeof rawPolicy === 'string' ? (() => { try { return JSON.parse(rawPolicy); } catch { return rawPolicy; } })() : rawPolicy) as Record<string, unknown> | undefined;
  const cancelType = String(cancellation?.type ?? '').toUpperCase();
  const cancelHoursBefore = Number(cancellation?.freeCancelHoursBefore ?? cancellation?.hoursBeforeStart ?? 24);
  const isFreeCancel = cancelType === 'FREE' || !!cancellation?.freeCancelHoursBefore || !!cancellation?.hoursBeforeStart;

  // Compute cancel-before datetime for selected slot
  const cancelBeforeText = useMemo(() => {
    if (!isFreeCancel || !selectedSlotId) return '';
    const slot = departures.find(d => d.id === selectedSlotId);
    if (!slot) return '';
    const dt = new Date(slot.startsAt);
    dt.setHours(dt.getHours() - cancelHoursBefore);
    return dt.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [isFreeCancel, selectedSlotId, departures, cancelHoursBefore]);

  const selectedSlot = departures.find(d => d.id === selectedSlotId) ?? null;
  const spotsLeft = selectedSlot?.inventory
    ? selectedSlot.inventory.totalCapacity - selectedSlot.inventory.bookedCapacity - selectedSlot.inventory.heldCapacity
    : null;

  const durationText = formatDuration(option.durationMinutes ?? tour.durationMinutes, t);

  const handleAddToCart = useCallback(async () => {
    if (!selectedSlot) {
      setError(t('selectStartingTime'));
      return;
    }

    const travelerMix: Array<Record<string, unknown>> = [];
    if (adults > 0) travelerMix.push({ type: 'adult', count: adults });
    if (children > 0) travelerMix.push({ type: 'child', count: children });
    if (infants > 0) travelerMix.push({ type: 'infant', count: infants });

    if (isAuthenticated) {
      // Server cart for authenticated users
      setLoading(true);
      setError(null);
      try {
        await cartApi.addItem({
          departureSlotId: selectedSlot.id,
          quantity: travelers,
          currencyCode: currency,
          languageCode: selections.selectedLanguage || tour.availableLanguages?.[0] || undefined,
          travelerMix,
        });
        setSuccess(true);
        addToast('success', t('addedToCart'));
        setTimeout(() => setSuccess(false), 4000);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('addToCartError');
        setError(message);
        addToast('error', message);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest cart (localStorage)
      guestCart.addItem({
        departureSlotId: selectedSlot.id,
        quantity: travelers,
        currencyCode: currency,
        travelerMix,
        tourId: tour.id,
        tourTitle: tour.title,
        optionId: option.id,
        optionTitle: option.title,
        unitPrice: unitPrice ?? 0,
        startsAt: selectedSlot.startsAt,
        languageCode: selections.selectedLanguage || tour.availableLanguages?.[0] || '',
      });
      setSuccess(true);
      addToast('success', t('addedToCart'));
      setTimeout(() => setSuccess(false), 4000);
    }
  }, [isAuthenticated, selectedSlot, adults, children, infants, travelers, currency, router, t, addToast, guestCart, tour, option, unitPrice]);

  const handleBookNow = useCallback(async () => {
    if (!selectedSlot) {
      setError(t('selectStartingTime'));
      return;
    }

    const travelerMix: Array<Record<string, unknown>> = [];
    if (adults > 0) travelerMix.push({ type: 'adult', count: adults });
    if (children > 0) travelerMix.push({ type: 'child', count: children });
    if (infants > 0) travelerMix.push({ type: 'infant', count: infants });

    if (isAuthenticated) {
      // Server cart for authenticated users
      setLoading(true);
      setError(null);
      try {
        await cartApi.addItem({
          departureSlotId: selectedSlot.id,
          quantity: travelers,
          currencyCode: currency,
          languageCode: selections.selectedLanguage || tour.availableLanguages?.[0] || undefined,
          travelerMix,
        });
        router.push('/cart');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('addToCartError');
        setError(message);
        addToast('error', message);
        setLoading(false);
      }
    } else {
      // Guest cart — add and go to cart page
      guestCart.addItem({
        departureSlotId: selectedSlot.id,
        quantity: travelers,
        currencyCode: currency,
        travelerMix,
        tourId: tour.id,
        tourTitle: tour.title,
        optionId: option.id,
        optionTitle: option.title,
        unitPrice: unitPrice ?? 0,
        startsAt: selectedSlot.startsAt,
        languageCode: selections.selectedLanguage || tour.availableLanguages?.[0] || '',
      });
      router.push('/cart');
    }
  }, [isAuthenticated, selectedSlot, adults, children, infants, travelers, currency, router, t, addToast, guestCart, tour, option, unitPrice]);

  return (
    <div className="border border-foreground/10 rounded-2xl overflow-hidden transition-shadow hover:shadow-lg">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-4 p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-base font-bold text-foreground">{option.title || option.name}</h4>
            {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                {t('spotsLeft', { count: spotsLeft })}
              </span>
            )}
          </div>
          {/* Quick info line */}
          <div className="flex items-center gap-3 text-xs text-foreground/50 flex-wrap">
            {durationText && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {durationText}
              </span>
            )}
            {tour.availableLanguages && tour.availableLanguages.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {t('guideLanguage')}: {selections.selectedLanguage || tour.availableLanguages[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {unitPrice !== null && unitPrice !== Infinity && (
            <div className="text-right">
              <p className="text-lg font-extrabold text-foreground">{formatPrice(unitPrice)}</p>
              <p className="text-[10px] text-foreground/40">{t('perPerson')}</p>
            </div>
          )}
          <svg
            className={`w-5 h-5 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-foreground/5 px-5 pb-5">
          {/* Description */}
          {option.description && (
            <p className="text-sm text-foreground/60 mt-4 mb-4">{option.description}</p>
          )}

          {/* Detail badges row */}
          <div className="flex flex-wrap gap-2 mb-5">
            {durationText && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 rounded-full text-xs text-foreground/70">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {durationText}
              </span>
            )}
            {tour.availableLanguages && tour.availableLanguages.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 rounded-full text-xs text-foreground/70">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {t('guideLanguage')}: {selections.selectedLanguage || tour.availableLanguages[0]}
              </span>
            )}
            {tour.meetingPoint && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 rounded-full text-xs text-foreground/70">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {tour.meetingPoint}
              </span>
            )}
          </div>

          {/* Starting time selection */}
          <div className="mb-5">
            <h5 className="text-sm font-semibold text-foreground mb-3">{t('selectStartingTime')}</h5>
            <div className="flex flex-wrap gap-2">
              {departures.map((dep) => (
                <TimeSlotChip
                  key={dep.id}
                  departure={dep}
                  selected={selectedSlotId === dep.id}
                  onSelect={() => setSelectedSlotId(dep.id)}
                />
              ))}
            </div>
          </div>

          {/* Cancellation & Pay Later info */}
          <div className="space-y-3 mb-5">
            {isFreeCancel && (
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-foreground/60">
                  {cancelBeforeText
                    ? t('cancelBeforeRefund', { datetime: cancelBeforeText })
                    : t('freeCancelDesc', { hours: cancelHoursBefore })}
                </p>
              </div>
            )}
            {tour.allowPayLater && (
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="text-xs text-foreground/60">
                  {t('reserveNowPayLater')} <span className="text-primary cursor-pointer hover:underline">{t('learnMore')}</span>
                </p>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          {unitPrice !== null && unitPrice !== Infinity && (
            <div className="bg-foreground/[0.03] rounded-xl p-4 mb-5">
              <div className="space-y-1.5 text-sm">
                {adults > 0 && (
                  <div className="flex justify-between text-foreground/70">
                    <span>{adults} {t('adultLabel')} × {formatPrice(adultPrice ?? unitPrice)}</span>
                    <span>{formatPrice((adultPrice ?? unitPrice) * adults)}</span>
                  </div>
                )}
                {children > 0 && (
                  <div className="flex justify-between text-foreground/70">
                    <span>{children} {t('childLabel')} × {formatPrice(childPrice ?? unitPrice)}</span>
                    <span>{formatPrice((childPrice ?? unitPrice) * children)}</span>
                  </div>
                )}
                {infants > 0 && (
                  <div className="flex justify-between text-foreground/70">
                    <span>{infants} {t('infantLabel')} × {formatPrice(0)}</span>
                    <span>{formatPrice(0)}</span>
                  </div>
                )}
                <div className="border-t border-foreground/10 pt-2 mt-2 flex justify-between font-bold text-foreground">
                  <span>{t('totalLabel')}</span>
                  <span>{totalPrice !== null ? formatPrice(totalPrice) : '—'}</span>
                </div>
                <p className="text-[10px] text-foreground/40 text-right">{t('taxesIncluded')}</p>
              </div>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm flex items-center justify-between">
              <span>{t('addedToCart')}</span>
              <button onClick={() => router.push('/cart')} className="text-primary font-semibold hover:underline text-sm">
                {t('viewCart')}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleBookNow}
              disabled={loading || !selectedSlotId}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-full transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? t('loading') : t('bookNow')}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={loading || !selectedSlotId}
              className="flex-1 border-2 border-primary text-primary hover:bg-primary/5 font-bold py-3 rounded-full transition-all disabled:opacity-50"
            >
              {t('addToCartBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Available Options Section ─── */
interface TourAvailableOptionsProps {
  tour: Tour;
  currency: string;
  selections: BookingSelections;
}

export function TourAvailableOptions({ tour, currency, selections }: TourAvailableOptionsProps) {
  const t = useTranslations('tourPublic');
  const options = (tour.options ?? []) as TourOptionDetail[];
  const { selectedDate } = selections;

  // Filter departures per option for the selected date (ACTIVE, future only)
  const optionsWithDeps = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return options
      .filter(opt => opt.isActive !== false)
      .map(opt => {
        const allDeps = (opt.departures ?? []).filter(d => d.status === 'ACTIVE');
        const filteredDeps = selectedDate
          ? allDeps.filter(d => d.startsAt.startsWith(selectedDate) && d.startsAt.split('T')[0] >= todayStr)
          : allDeps.filter(d => d.startsAt.split('T')[0] >= todayStr);
        // Sort departures by time
        filteredDeps.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        return { option: opt, departures: filteredDeps };
      })
      .filter(({ departures }) => departures.length > 0);
  }, [options, selectedDate]);

  // Chỉ hiển thị block "Chọn từ các tùy chọn..." khi thực sự có danh sách option + departure
  if (!selectedDate || optionsWithDeps.length === 0) {
    return null;
  }

  return (
    <section id="available-options" className="scroll-mt-24">
      <h3 className="text-2xl font-bold text-foreground mb-2">{t('chooseOption')}</h3>
      <p className="text-sm text-foreground/50 mb-6">
        {t('availableOptionsCount', { count: optionsWithDeps.length })}
      </p>
      <div className="space-y-4">
        {optionsWithDeps.map(({ option, departures }, idx) => (
          <OptionCard
            key={option.id}
            option={option}
            departures={departures}
            selections={selections}
            currency={currency}
            tour={tour}
            defaultExpanded={idx === 0}
          />
        ))}
      </div>
    </section>
  );
}
