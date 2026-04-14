import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GetYourGuide - Book Tours & Activities',
    short_name: 'GetYourGuide',
    description: 'Discover and book amazing tours, attractions, and activities worldwide.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0ea5e9',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    categories: ['travel', 'lifestyle'],
    // Add icon-192.png and icon-512.png to /public for PWA; root favicon from app/icon.tsx
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
    related_applications: [],
    prefer_related_applications: false,
  };
}
