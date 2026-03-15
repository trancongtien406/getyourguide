'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineTag,
  HiOutlineX,
  HiOutlineCurrencyDollar,
  HiOutlineStar,
} from 'react-icons/hi';
import type { Category, City, Tag } from '@/lib/api';

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 1000;
const PRICE_SLIDER_STEP = 50;

const sliderTrack = `
  .price-range-slider { height: 24px; }
  .price-range-slider::-webkit-slider-runnable-track { height: 8px; border-radius: 9999px; background: transparent; }
  .price-range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; margin-top: -6px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-700) 100%); box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: grab; border: 3px solid white; transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .price-range-slider::-webkit-slider-thumb:hover { transform: scale(1.08); box-shadow: 0 3px 10px rgba(0,0,0,0.25); }
  .price-range-slider::-webkit-slider-thumb:active { cursor: grabbing; }
  .price-range-slider::-moz-range-track { height: 8px; border-radius: 9999px; background: transparent; }
  .price-range-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-700) 100%); box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: grab; border: 3px solid white; }
`;

function PriceRangeSlider({
  minPrice,
  maxPrice,
  onMinChange,
  onMaxChange,
  onCommit,
  t,
}: {
  minPrice: string;
  maxPrice: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  onCommit?: (min: string, max: string) => void;
  t: (key: string) => string;
}) {
  const valueFromProps = useMemo(() => {
    const minN = parseInt(minPrice, 10);
    const maxN = parseInt(maxPrice, 10);
    const minVal = Number.isNaN(minN) ? PRICE_SLIDER_MIN : Math.max(PRICE_SLIDER_MIN, Math.min(PRICE_SLIDER_MAX, minN));
    const maxVal = Number.isNaN(maxN) ? PRICE_SLIDER_MAX : Math.max(PRICE_SLIDER_MIN, Math.min(PRICE_SLIDER_MAX, maxN));
    return { minVal, maxVal };
  }, [minPrice, maxPrice]);

  const [localMin, setLocalMin] = useState(valueFromProps.minVal);
  const [localMax, setLocalMax] = useState(valueFromProps.maxVal);
  useEffect(() => {
    setLocalMin(valueFromProps.minVal);
    setLocalMax(valueFromProps.maxVal);
  }, [valueFromProps.minVal, valueFromProps.maxVal]);

  const safeMin = Math.min(localMin, localMax);
  const safeMax = Math.max(localMin, localMax);
  const fillLeft = ((safeMin - PRICE_SLIDER_MIN) / (PRICE_SLIDER_MAX - PRICE_SLIDER_MIN)) * 100;
  const fillWidth = ((safeMax - safeMin) / (PRICE_SLIDER_MAX - PRICE_SLIDER_MIN)) * 100;

  const commit = () => {
    const minStr = safeMin === PRICE_SLIDER_MIN ? '' : String(safeMin);
    const maxStr = safeMax === PRICE_SLIDER_MAX ? '' : String(safeMax);
    if (onCommit) {
      onCommit(minStr, maxStr);
    } else {
      onMinChange(minStr);
      onMaxChange(maxStr);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-4">
      <style dangerouslySetInnerHTML={{ __html: sliderTrack }} />
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
          <HiOutlineCurrencyDollar className="w-4 h-4" />
        </span>
        {t('filterPrice')}
      </label>
      <div className="relative">
        {/* Slider track container: fixed height so thumbs are visible */}
        <div className="relative h-8 flex items-center">
          {/* Full track (background) */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-slate-200 dark:bg-slate-600 pointer-events-none" />
          {/* Filled segment between thumbs */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary/50 dark:bg-primary/60 pointer-events-none transition-[left,width] duration-150"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
          {/* Two range inputs stacked; only thumbs receive pointer events */}
          <input
            type="range"
            min={PRICE_SLIDER_MIN}
            max={PRICE_SLIDER_MAX}
            step={PRICE_SLIDER_STEP}
            value={safeMin}
            aria-label={t('priceMin')}
            className="price-range-slider absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto z-10"
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalMin(v);
              if (v > safeMax) setLocalMax(v);
            }}
            onPointerUp={commit}
            onMouseUp={commit}
            onTouchEnd={commit}
          />
          <input
            type="range"
            min={PRICE_SLIDER_MIN}
            max={PRICE_SLIDER_MAX}
            step={PRICE_SLIDER_STEP}
            value={safeMax}
            aria-label={t('priceMax')}
            className="price-range-slider absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto z-20"
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalMax(v);
              if (v < safeMin) setLocalMin(v);
            }}
            onPointerUp={commit}
            onMouseUp={commit}
            onTouchEnd={commit}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            {safeMin === PRICE_SLIDER_MIN && !minPrice ? t('priceMin') : `${safeMin}`}
          </span>
          <span className="text-slate-300 dark:text-slate-600">–</span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            {safeMax === PRICE_SLIDER_MAX && !maxPrice ? t('priceMax') : `${safeMax}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export interface ToursFiltersState {
  cityId: string;
  categoryId: string;
  tagId: string;
  sortBy: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  maxDurationMinutes: string;
  dateFrom: string;
  dateTo: string;
}

const DURATION_PRESETS = [
  { value: '', labelKey: 'durationAny' },
  { value: '60', labelKey: 'durationUnder1h' },
  { value: '180', labelKey: 'durationUnder3h' },
  { value: '1440', labelKey: 'durationUnder1day' },
] as const;

const RATING_PRESETS = [
  { value: '', labelKey: 'anyRating' },
  { value: '3', labelKey: 'rating3Plus' },
  { value: '4', labelKey: 'rating4Plus' },
] as const;

interface ToursFiltersProps {
  state: ToursFiltersState;
  onChange: (key: keyof ToursFiltersState, value: string) => void;
  onClear: () => void;
  onApply?: () => void;
  onPriceCommit?: (min: string, max: string) => void;
  categories: Category[];
  cities: City[];
  tags: Tag[];
  activeCount: number;
  variant: 'sidebar' | 'sheet';
}

export function ToursFilters({
  state,
  onChange,
  onClear,
  onApply,
  onPriceCommit,
  categories,
  cities,
  tags,
  activeCount,
  variant,
}: ToursFiltersProps) {
  const t = useTranslations('public');
  const isSheet = variant === 'sheet';

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('filters')}</h2>
          {activeCount > 0 && (
            <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            <HiOutlineX className="w-4 h-4" />
            {t('clearFilters')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* City */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {t('filterCity')}
          </label>
          <select
            value={state.cityId}
            onChange={(e) => onChange('cityId', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
          >
            <option value="">{t('allCities')}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {t('filterCategory')}
          </label>
          <select
            value={state.categoryId}
            onChange={(e) => onChange('categoryId', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Tag */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <HiOutlineTag className="w-4 h-4 inline mr-1.5 text-slate-400" />
              {t('filterTags')}
            </label>
            <select
              value={state.tagId}
              onChange={(e) => onChange('tagId', e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
            >
              <option value="">{t('allTags')}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Price range — dual slider (commits on release to avoid extra API calls) */}
        <PriceRangeSlider
          minPrice={state.minPrice}
          maxPrice={state.maxPrice}
          onMinChange={(v) => onChange('minPrice', v)}
          onMaxChange={(v) => onChange('maxPrice', v)}
          onCommit={onPriceCommit}
          t={t}
        />

        {/* Rating */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <HiOutlineStar className="w-4 h-4 inline mr-1.5 text-slate-400" />
            {t('filterRating')}
          </label>
          <div className="flex flex-wrap gap-2">
            {RATING_PRESETS.map(({ value, labelKey }) => (
              <button
                key={value || 'any'}
                type="button"
                onClick={() => onChange('minRating', value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  state.minRating === value
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <HiOutlineClock className="w-4 h-4 inline mr-1.5 text-slate-400" />
            {t('filterDuration')}
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map(({ value, labelKey }) => (
              <button
                key={value || 'any'}
                type="button"
                onClick={() => onChange('maxDurationMinutes', value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  state.maxDurationMinutes === value
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <HiOutlineCalendar className="w-4 h-4 inline mr-1.5 text-slate-400" />
            {t('filterDate')}
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={state.dateFrom}
              onChange={(e) => onChange('dateFrom', e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
            <input
              type="date"
              value={state.dateTo}
              onChange={(e) => onChange('dateTo', e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {t('sortBy')}
          </label>
          <select
            value={state.sortBy}
            onChange={(e) => onChange('sortBy', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
          >
            <option value="recommended">{t('sortRecommended')}</option>
            <option value="latest">{t('sortNewest')}</option>
            <option value="price_asc">{t('sortPriceLow')}</option>
            <option value="price_desc">{t('sortPriceHigh')}</option>
            <option value="rating_desc">{t('sortRating')}</option>
          </select>
        </div>
      </div>

      {isSheet && onApply && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onApply}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
          >
            {t('applyFilters')}
          </button>
        </div>
      )}
    </div>
  );

  if (isSheet) {
    return <div className="p-4">{content}</div>;
  }

  return (
    <aside className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sticky top-24 shadow-sm">
      {content}
    </aside>
  );
}
