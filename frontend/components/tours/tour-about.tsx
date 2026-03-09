import type { Tour } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface TourAboutProps {
  tour: Tour;
}

export function TourAbout({ tour }: TourAboutProps) {
  const t = useTranslations('tourPublic');
  const rawPolicy = tour.cancellationPolicy;
  const cancellation = (typeof rawPolicy === 'string' ? (() => { try { return JSON.parse(rawPolicy); } catch { return rawPolicy; } })() : rawPolicy) as Record<string, unknown> | undefined;
  const cancelType = String(cancellation?.type ?? '').toUpperCase();
  const isFreeCancel = cancelType === 'FREE' || !!cancellation?.freeCancelHoursBefore || !!cancellation?.hoursBeforeStart;
  const cancelHours = Number(cancellation?.freeCancelHoursBefore ?? cancellation?.hoursBeforeStart ?? 24);

  const durationText = (() => {
    const minutes = tour.durationMinutes;
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return t('durationMinutes', { min: mins });
    if (mins === 0) return t('durationHours', { hours });
    return t('durationHoursMin', { hours, min: mins });
  })();

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12 border-b border-foreground/10">
      <h2 className="text-2xl font-bold mb-6 md:col-span-2 text-foreground">{t('aboutTitle')}</h2>

      {/* Free cancellation */}
      {isFreeCancel && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-slate-800/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('freeCancel')}</h4>
            <p className="text-sm text-foreground/50">{t('freeCancelDesc', { hours: cancelHours })}</p>
          </div>
        </div>
      )}

      {/* Duration */}
      {tour.durationMinutes && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-slate-800/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('duration', { duration: durationText })}</h4>
            <p className="text-sm text-foreground/50">{t('checkSchedule')}</p>
          </div>
        </div>
      )}

      {/* Languages */}
      {tour.availableLanguages && tour.availableLanguages.length > 0 && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-slate-800/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('liveGuide')}</h4>
            <p className="text-sm text-foreground/50">{tour.availableLanguages.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Group size */}
      {tour.maxGroupSize && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-slate-800/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('smallGroup')}</h4>
            <p className="text-sm text-foreground/50">{t('groupLimit', { count: tour.maxGroupSize })}</p>
          </div>
        </div>
      )}
    </section>
  );
}
