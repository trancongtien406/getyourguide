'use client';

import { TourAbout } from '@/components/tours/tour-about';
import { TourAvailableOptions } from '@/components/tours/tour-available-options';
import { TourBookingSidebar, type BookingSelections } from '@/components/tours/tour-booking-sidebar';
import { TourDetails } from '@/components/tours/tour-details';
import { TourGallery } from '@/components/tours/tour-gallery';
import { TourHeader } from '@/components/tours/tour-header';
import { TourItinerary } from '@/components/tours/tour-itinerary';
import { TourReviews } from '@/components/tours/tour-reviews';
import { TourSimilar } from '@/components/tours/tour-similar';
import { catalogApi, reviewsApi, type ReviewListResponse, type Tour } from '@/lib/api';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function TourDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const t = useTranslations('tourPublic');
  const { formatDate } = useLocaleCurrency();

  const [tour, setTour] = useState<Tour | null>(null);
  const [reviewData, setReviewData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Booking selections lifted to page level (shared between sidebar & options)
  const [selections, setSelections] = useState<BookingSelections>({
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    selectedDate: '',
    selectedLanguage: '',
  });

  const handleSelectionsChange = useCallback((partial: Partial<BookingSelections>) => {
    setSelections(prev => {
      const next = { ...prev, ...partial };
      next.travelers = next.adults + next.children;
      return next;
    });
  }, []);

  const scrollToOptions = useCallback(() => {
    const el = document.getElementById('available-options');
    if (el) {
      const offset = 90;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const tabs = [
    { id: 'overview', label: t('tabOverview') },
    { id: 'itinerary', label: t('tabItinerary') },
    { id: 'details', label: t('tabDetails') },
    { id: 'reviews', label: t('tabReviews') },
  ];

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!slug) return;

    async function fetchData() {
      try {
        setLoading(true);
        const tourRes = await catalogApi.getTourBySlug(slug);
        const reviewsRes = await reviewsApi
          .listTourReviews(tourRes.id, { pageSize: '5' })
          .catch(() => null);
        setTour(tourRes);
        setReviewData(reviewsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // Update active tab on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['overview', 'itinerary', 'details', 'reviews'];
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveTab(sectionIds[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-primary-100 dark:bg-slate-800/30 rounded w-2/3" />
            <div className="h-[400px] bg-primary-100 dark:bg-slate-800/30 rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-4 bg-primary-100 dark:bg-slate-800/30 rounded w-full" />
                <div className="h-4 bg-primary-100 dark:bg-slate-800/30 rounded w-3/4" />
              </div>
              <div className="h-64 bg-primary-100 dark:bg-slate-800/30 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-foreground">{t('notFoundTitle')}</h1>
          <p className="text-foreground/60">{error || t('notFoundDesc')}</p>
          <a href="/" className="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">
            {t('backHome')}
          </a>
        </div>
      </div>
    );
  }

  // Compute min price from options
  const minPrice = tour.options?.reduce((min, opt) => {
    const baseRules = opt.pricingRules?.filter(r => r.componentType === 'BASE') ?? [];
    const optMin = baseRules.reduce((m, r) => Math.min(m, Number(r.amount)), Infinity);
    return Math.min(min, optMin);
  }, Infinity) ?? null;

  const minPriceCurrency = tour.options?.[0]?.pricingRules?.find(r => r.componentType === 'BASE')?.currencyCode ?? 'VND';

  return (
    <div className="bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TourHeader tour={tour} reviewCount={reviewData?.meta?.publishedCount ?? tour.ratingCount} />

        <TourGallery media={tour.media ?? []} />

        {/* Sticky Tab Bar */}
        <div
          ref={tabBarRef}
          className="sticky top-0 z-20 -mx-4 px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 mt-6"
        >
          <nav className="flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-10">
          {/* Left content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Short description */}
            <section id="overview">
              {tour.shortDescription && (
                <p className="text-lg leading-relaxed text-foreground/80 mb-8">{tour.shortDescription}</p>
              )}
              <TourAbout tour={tour} />
            </section>

            {/* Highlighted reviews preview */}
            {reviewData && reviewData.data?.length > 0 && (
              <section>
                <h3 className="text-xl font-bold mb-6 text-foreground">{t('featuredReviews')}</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
                  {reviewData.data?.slice(0, 3).map((review) => (
                    <div key={review.id} className="min-w-[300px] md:min-w-[380px] p-6 rounded-2xl border border-foreground/10 bg-background shadow-sm flex-shrink-0">
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        ))}
                      </div>
                      <p className="text-foreground/80 italic mb-4 line-clamp-3">&ldquo;{review.body}&rdquo;</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {review.user?.firstName?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {review.user?.firstName ?? t('traveler')}
                            {review.user?.displayCountry ? ` - ${review.user.displayCountry}` : ''}
                          </p>
                          <p className="text-xs text-foreground/50">{formatDate(review.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section id="itinerary">
              <TourItinerary itinerary={tour.itinerary ?? []} meetingPoint={tour.meetingPoint} />
            </section>

            {/* Available Options (in content area, below gallery/overview) */}
            <TourAvailableOptions
              tour={tour}
              currency={minPriceCurrency}
              selections={selections}
            />

            <section id="details">
              <TourDetails tour={tour} />
            </section>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1">
            <TourBookingSidebar
              tour={tour}
              minPrice={minPrice && minPrice !== Infinity ? minPrice : null}
              currency={minPriceCurrency}
              selections={selections}
              onSelectionsChange={handleSelectionsChange}
              onCheckAvailability={scrollToOptions}
            />
          </div>
        </div>

        {/* Reviews section */}
        {reviewData && (
          <section id="reviews">
            <TourReviews
              tourId={tour.id}
              initialData={reviewData}
            />
          </section>
        )}

        {/* Similar tours */}
        <TourSimilar currentTourId={tour.id} cityId={tour.cityId} />
      </div>
    </div>
  );
}
