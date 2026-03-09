'use client';

import type { TourItineraryStop } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface TourItineraryProps {
  itinerary: TourItineraryStop[];
  meetingPoint?: string;
}

const TRANSPORT_KEYS: Record<string, string> = {
  VAN: 'transportVan',
  BUS: 'transportBus',
  WALK: 'transportWalk',
  BOAT: 'transportBoat',
  TRAIN: 'transportTrain',
  CAR: 'transportCar',
};

export function TourItinerary({ itinerary, meetingPoint }: TourItineraryProps) {
  const t = useTranslations('tourPublic');
  const [showAll, setShowAll] = useState(false);

  if (itinerary.length === 0 && !meetingPoint) return null;

  const sortedStops = [...itinerary].sort((a, b) => a.stopOrder - b.stopOrder);
  const displayStops = showAll ? sortedStops : sortedStops.slice(0, 3);

  return (
    <section>
      <h3 className="text-xl font-bold mb-6 text-foreground">{t('itineraryTitle')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-primary-50 dark:bg-slate-900/50 rounded-2xl p-6">
        {/* Timeline */}
        <div className="space-y-6">
          {/* Starting point */}
          {meetingPoint && (
            <div className="relative pl-8 border-l-2 border-dashed border-foreground/20 ml-3">
              <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary border-4 border-primary-50 dark:border-slate-900" />
              <div>
                <h5 className="font-bold text-foreground">{t('departure')}</h5>
                <p className="text-foreground/60 text-sm">{meetingPoint}</p>
              </div>
            </div>
          )}

          {displayStops.map((stop, i) => {
            const isLast = i === displayStops.length - 1 && (showAll || sortedStops.length <= 3);
            return (
              <div
                key={stop.id}
                className={`relative pl-8 ml-3 ${!isLast ? 'border-l-2 border-dashed border-foreground/20' : ''}`}
              >
                <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-foreground/20 border-4 border-primary-50 dark:border-slate-900" />
                <div>
                  {stop.transportMode && (
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-sm font-medium text-foreground/70">
                        {TRANSPORT_KEYS[stop.transportMode] ? t(TRANSPORT_KEYS[stop.transportMode]) : stop.transportMode}
                        {stop.transportDurationMinutes ? ` (${t('durationMinutes', { min: stop.transportDurationMinutes })})` : ''}
                      </span>
                    </div>
                  )}
                  <h5 className="font-bold text-foreground">{stop.title}</h5>
                  {stop.description && (
                    <p className="text-foreground/60 text-sm italic">
                      {stop.description}
                      {stop.durationMinutes ? ` (${t('durationMinutes', { min: stop.durationMinutes })})` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {sortedStops.length > 3 && !showAll && (
            <button
              className="text-primary font-semibold text-sm hover:underline block mt-4"
              onClick={() => setShowAll(true)}
            >
              {t('showAllItinerary', { count: sortedStops.length - 3 })}
            </button>
          )}
        </div>

        {/* Map placeholder */}
        <div className="rounded-xl overflow-hidden h-[300px] border border-foreground/10">
          <div className="w-full h-full bg-primary-100/50 dark:bg-slate-800/20 flex items-center justify-center relative">
            <svg className="w-16 h-16 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
              </svg>
            </div>
            <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-black/70 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight shadow-sm text-foreground">
              {t('map')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
