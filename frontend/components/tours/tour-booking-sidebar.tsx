'use client';

import type { Tour, TourOptionDetail } from '@/lib/api';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

/* ─── Inline Calendar Component ─── */
function InlineCalendar({
  selectedDate,
  onSelect,
  availableDates,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  availableDates: string[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} disabled={!canGoPrev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/5 disabled:opacity-30 text-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-bold text-foreground">{monthLabel}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/5 text-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-[10px] font-semibold text-foreground/40 text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast = cellDate < today;
          const isAvailable = availableSet.size === 0 || availableSet.has(dateStr);
          const isDisabled = isPast || !isAvailable;
          const isSelected = dateStr === selectedDate;
          const isToday = cellDate.getTime() === today.getTime();

          return (
            <button
              key={dateStr}
              disabled={isDisabled}
              onClick={() => onSelect(dateStr)}
              className={`w-full aspect-square flex items-center justify-center text-xs rounded-full transition-all
                ${isSelected
                  ? 'bg-primary text-white font-bold shadow-md'
                  : isToday
                    ? 'ring-1 ring-primary text-primary font-semibold'
                    : isDisabled
                      ? 'text-foreground/20 cursor-not-allowed'
                      : 'text-foreground hover:bg-primary/10 hover:text-primary font-medium'
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Participant Counter Row ─── */
function ParticipantRow({
  label,
  ageRange,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  label: string;
  ageRange: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-foreground/50">{ageRange}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-foreground/20 flex items-center justify-center text-foreground/60 hover:border-primary hover:text-primary disabled:opacity-30 transition-colors text-sm font-bold"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-bold text-foreground">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-foreground/20 flex items-center justify-center text-foreground/60 hover:border-primary hover:text-primary disabled:opacity-30 transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Booking state shared between sidebar & options ─── */
export interface BookingSelections {
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  selectedDate: string;
  selectedLanguage: string;
}

/* ─── Main Sidebar (compact selector) ─── */
interface TourBookingSidebarProps {
  tour: Tour;
  minPrice: number | null;
  currency: string;
  selections: BookingSelections;
  onSelectionsChange: (s: Partial<BookingSelections>) => void;
  onCheckAvailability: () => void;
}

export function TourBookingSidebar({ tour, minPrice, currency, selections, onSelectionsChange, onCheckAvailability }: TourBookingSidebarProps) {
  const { formatPrice } = useLocaleCurrency();
  const t = useTranslations('tourPublic');

  const { adults, children, infants, selectedDate, selectedLanguage } = selections;

  const [showParticipants, setShowParticipants] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const options = tour.options ?? [];
  const languages = tour.availableLanguages ?? [];
  const maxGroupSize = tour.maxGroupSize ?? 99;
  const activeLanguage = selectedLanguage || languages[0] || '';

  // Collect ALL available dates across ALL options (status=ACTIVE & future only)
  const allAvailableDates = useMemo(() => {
    const dates = new Set<string>();
    const todayStr = new Date().toISOString().split('T')[0];
    for (const opt of options) {
      const deps = (opt as TourOptionDetail).departures ?? [];
      for (const d of deps) {
        if (d.status === 'ACTIVE') {
          const date = d.startsAt.split('T')[0];
          if (date && date >= todayStr) dates.add(date);
        }
      }
    }
    return Array.from(dates).sort();
  }, [options]);

  // Compute min display price
  const displayPrice = useMemo(() => {
    if (!options.length) return minPrice;
    let min = Infinity;
    for (const opt of options) {
      const rules = (opt as TourOptionDetail).pricingRules ?? [];
      for (const r of rules) {
        if (r.componentType === 'BASE') min = Math.min(min, Number(r.amount));
      }
    }
    return min === Infinity ? minPrice : min;
  }, [options, minPrice]);

  const rawPolicy = tour.cancellationPolicy;
  const cancellation = (typeof rawPolicy === 'string' ? (() => { try { return JSON.parse(rawPolicy); } catch { return rawPolicy; } })() : rawPolicy) as Record<string, unknown> | undefined;
  const cancelType = String(cancellation?.type ?? '').toUpperCase();
  const cancelHours = Number(cancellation?.freeCancelHoursBefore ?? cancellation?.hoursBeforeStart ?? 24);
  const isFreeCancel = cancelType === 'FREE' || !!cancellation?.freeCancelHoursBefore || !!cancellation?.hoursBeforeStart;

  const participantSummary = useMemo(() => {
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} ${t('adultLabel')}`);
    if (children > 0) parts.push(`${children} ${t('childLabel')}`);
    if (infants > 0) parts.push(`${infants} ${t('infantLabel')}`);
    return parts.join(', ');
  }, [adults, children, infants, t]);

  return (
    <div className="sticky top-24 bg-background border border-foreground/10 rounded-2xl p-6 shadow-xl">
      {/* Price */}
      <div className="mb-6">
        <span className="text-foreground/50 text-sm">{t('fromPrice')}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">
            {displayPrice ? formatPrice(displayPrice) : t('contactUs')}
          </span>
          <span className="text-foreground/50 text-sm">{t('perPerson')}</span>
        </div>
      </div>

      {/* Selectors */}
      <div className="space-y-3 mb-6">
        {/* Participants */}
        <div className="relative">
          <button
            onClick={() => { setShowParticipants(!showParticipants); setShowCalendar(false); setShowLanguageDropdown(false); }}
            className="w-full flex items-center justify-between px-4 py-3 border border-foreground/15 rounded-lg text-sm font-medium hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-foreground">{participantSummary}</span>
            </div>
            <svg className={`w-5 h-5 text-foreground/40 transition-transform ${showParticipants ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showParticipants && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-background border border-foreground/15 rounded-xl shadow-xl p-4">
              <ParticipantRow label={t('adultLabel')} ageRange={t('adultAge')} value={adults} onChange={v => onSelectionsChange({ adults: v })} min={1} max={maxGroupSize} />
              <div className="border-t border-foreground/5" />
              <ParticipantRow label={t('childLabel')} ageRange={t('childAge')} value={children} onChange={v => onSelectionsChange({ children: v })} min={0} max={maxGroupSize} />
              <div className="border-t border-foreground/5" />
              <ParticipantRow label={t('infantLabel')} ageRange={t('infantAge')} value={infants} onChange={v => onSelectionsChange({ infants: v })} min={0} max={maxGroupSize} />
              <button onClick={() => setShowParticipants(false)} className="mt-3 w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors">
                {t('doneButton')}
              </button>
            </div>
          )}
        </div>

        {/* Calendar Date Selector */}
        <div className="relative">
          <button
            onClick={() => { setShowCalendar(!showCalendar); setShowParticipants(false); setShowLanguageDropdown(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-sm font-medium hover:border-primary transition-colors ${
              selectedDate ? 'border-primary text-foreground' : 'border-foreground/15 text-foreground/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                  : t('selectDate')}
              </span>
            </div>
            <svg className={`w-5 h-5 transition-transform ${showCalendar ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCalendar && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-background border border-foreground/15 rounded-xl shadow-xl p-4">
              <InlineCalendar
                selectedDate={selectedDate}
                onSelect={(d) => { onSelectionsChange({ selectedDate: d }); setShowCalendar(false); }}
                availableDates={allAvailableDates}
              />
            </div>
          )}
        </div>

        {/* Language selector */}
        {languages.length > 0 && (
          <div className="relative">
            <button
              onClick={() => { setShowLanguageDropdown(!showLanguageDropdown); setShowParticipants(false); setShowCalendar(false); }}
              className="w-full flex items-center justify-between px-4 py-3 border border-foreground/15 rounded-lg text-sm font-medium hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="text-foreground">{activeLanguage}</span>
              </div>
              <svg className={`w-5 h-5 text-foreground/40 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLanguageDropdown && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-background border border-foreground/15 rounded-lg shadow-xl p-1 max-h-48 overflow-y-auto">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { onSelectionsChange({ selectedLanguage: lang }); setShowLanguageDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-primary/10 transition-colors ${
                      activeLanguage === lang ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onCheckAvailability}
        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-primary/30 mb-6"
      >
        {t('checkAvailability')}
      </button>

      {/* Benefits */}
      <div className="space-y-4 pt-6 border-t border-foreground/10">
        {isFreeCancel && (
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-foreground">{t('freeCancel')}</p>
              <p className="text-xs text-foreground/50">{t('freeCancelDesc', { hours: cancelHours })}</p>
            </div>
          </div>
        )}

        {tour.allowPayLater && (
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-foreground">{t('payLaterTitle')}</p>
              <p className="text-xs text-foreground/50">{t('payLaterDesc')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
