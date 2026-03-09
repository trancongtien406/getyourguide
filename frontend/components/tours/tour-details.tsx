'use client';

import type { Tour } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface TourDetailsProps {
  tour: Tour;
}

export function TourDetails({ tour }: TourDetailsProps) {
  const t = useTranslations('tourPublic');
  const [showFullDesc, setShowFullDesc] = useState(false);

  const toArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch {}
    }
    return [];
  };

  const highlights = toArray(tour.highlights);
  const includedItems = toArray(tour.includedItems);
  const excludedItems = toArray(tour.excludedItems);
  const whatToBring = toArray(tour.whatToBring);
  const importantInfo = toArray(tour.importantInfo);

  return (
    <section className="space-y-8">
      {/* Highlights */}
      {highlights.length > 0 && (
        <div>
          <h4 className="text-lg font-bold mb-4 text-foreground">{t('highlights')}</h4>
          <ul className="space-y-2 list-disc pl-5 text-foreground/70">
            {highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Full description */}
      {tour.fullDescription && (
        <div>
          <h4 className="text-lg font-bold mb-4 text-foreground">{t('fullDescription')}</h4>
          <div className={`text-foreground/70 ${!showFullDesc ? 'line-clamp-4' : ''}`}>
            <p className="whitespace-pre-line">{tour.fullDescription}</p>
          </div>
          {tour.fullDescription.length > 300 && (
            <button
              className="text-primary font-semibold hover:underline mt-2"
              onClick={() => setShowFullDesc(!showFullDesc)}
            >
              {showFullDesc ? t('showLess') : t('showMore')}
            </button>
          )}
        </div>
      )}

      {/* Includes / Excludes */}
      {(includedItems.length > 0 || excludedItems.length > 0) && (
        <div>
          <h4 className="text-lg font-bold mb-4 text-foreground">{t('includes')}</h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8">
            {includedItems.map((item, i) => (
              <li key={`inc-${i}`} className="flex items-center gap-2 text-foreground/70">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
            {excludedItems.map((item, i) => (
              <li key={`exc-${i}`} className="flex items-center gap-2 text-foreground/40">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meeting point */}
      {tour.meetingPoint && (
        <div>
          <h4 className="text-lg font-bold mb-4 text-foreground">{t('meetingPoint')}</h4>
          <div className="flex items-center gap-2 text-foreground/70">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {tour.meetingPoint}
          </div>
        </div>
      )}

      {/* Important information */}
      {(whatToBring.length > 0 || importantInfo.length > 0) && (
        <div>
          <h4 className="text-lg font-bold mb-4 text-foreground">{t('importantInfo')}</h4>

          {whatToBring.length > 0 && (
            <>
              <h5 className="font-semibold text-foreground mb-2">{t('whatToBring')}</h5>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 mb-4">
                {whatToBring.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground/70">{item}</li>
                ))}
              </ul>
            </>
          )}

          {importantInfo.length > 0 && (
            <>
              <h5 className="font-semibold text-foreground mb-2">{t('notAllowed')}</h5>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8">
                {importantInfo.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground/70">{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
