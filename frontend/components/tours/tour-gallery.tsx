'use client';

import type { TourMedia } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface TourGalleryProps {
  media: TourMedia[];
}

export function TourGallery({ media }: TourGalleryProps) {
  const t = useTranslations('tourPublic');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fallback placeholder when no media provided
  const images = media.length > 0
    ? media.filter(m => m.mediaType === 'IMAGE').sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  if (images.length === 0) {
    return (
      <div className="h-[400px] md:h-[500px] rounded-xl overflow-hidden bg-primary-100 dark:bg-slate-800/30 flex items-center justify-center">
        <div className="text-center text-foreground/40">
          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>{t('noPhotos')}</p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const prevImage = useCallback(() => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length), [images.length]);
  const nextImage = useCallback(() => setLightboxIndex((prev) => (prev + 1) % images.length), [images.length]);

  // Keyboard support for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightboxOpen, closeLightbox, prevImage, nextImage]);

  return (
    <>
      {/* Gallery grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[400px] md:h-[500px] mb-10 overflow-hidden rounded-xl relative">
        {/* Main large image */}
        <div
          className="md:col-span-2 md:row-span-2 relative group cursor-pointer overflow-hidden"
          role="button"
          tabIndex={0}
          onClick={() => openLightbox(0)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(0); } }}
          aria-label="Open image gallery"
        >
          <Image
            alt={images[0]?.altText || 'Tour photo'}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            src={images[0]?.url || '/no_image.jpg'}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        </div>

        {/* Smaller images */}
        {images.slice(1, 5).map((img, i) => (
          <div
            key={img.id}
            className={`hidden md:block relative group cursor-pointer overflow-hidden ${
              i === 1 ? 'rounded-tr-xl' : i === 3 ? 'rounded-br-xl' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => openLightbox(i + 1)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i + 1); } }}
            aria-label={`View photo ${i + 2}`}
          >
            <Image
              alt={img.altText || 'Tour photo'}
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              src={img.url || '/no_image.jpg'}
              fill
              sizes="25vw"
            />
          </div>
        ))}

        {/* "See all photos" button on last visible image */}
        {images.length > 4 && (
          <button
            className="absolute bottom-4 right-4 bg-white/90 dark:bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg z-10"
            onClick={() => openLightbox(0)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {t('seeAllPhotos', { count: images.length })}
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10"
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            aria-label="Previous image"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <img
            alt={images[lightboxIndex]?.altText || 'Tour photo'}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            src={images[lightboxIndex]?.url || '/no_image.jpg'}
            onError={(e) => { e.currentTarget.src = '/no_image.jpg'; }}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10"
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            aria-label="Next image"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-4 text-white/60 text-sm" aria-live="polite">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
