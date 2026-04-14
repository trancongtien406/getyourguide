import { API_URL, SITE_NAME, SITE_URL } from '@/lib/runtime-config';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

const siteUrl = SITE_URL;
const apiUrl = API_URL;
const siteName = SITE_NAME;

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

const getTour = cache(async (slug: string) => {
  try {
    const res = await fetch(`${apiUrl}/catalog/tours/by-slug/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? data;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations('public');
  const { slug } = await params;
  const tour = await getTour(slug);
  if (!tour) {
    return { title: t('metaTourNotFound'), alternates: { canonical: `${siteUrl}/tours/${slug}` } };
  }

  const title = tour.title || t('metaTourDefault');
  const description =
    tour.shortDescription ||
    (typeof tour.fullDescription === 'string'
      ? tour.fullDescription.slice(0, 160)
      : undefined) ||
    `Book ${title} - Tours & activities with ${siteName}.`;

  const canonical = `${siteUrl}/tours/${slug}`;
  const image =
    tour.media?.find((m: { isCover?: boolean }) => m.isCover)?.url ||
    tour.media?.[0]?.url;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title: `${title} | ${siteName}`,
      description: description.slice(0, 160),
      url: canonical,
      siteName,
      type: 'website',
      ...(image && {
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description: description.slice(0, 160),
    },
    alternates: { canonical },
  };
}

function BreadcrumbJsonLd({
  items,
}: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function TourSlugLayout({ children, params }: Props) {
  const t = await getTranslations('public');
  const { slug } = await params;
  const tour = await getTour(slug);
  const breadcrumbs = [
    { name: t('breadcrumbHome'), url: siteUrl },
    { name: t('breadcrumbTours'), url: `${siteUrl}/tours` },
    ...(tour ? [{ name: tour.title, url: `${siteUrl}/tours/${slug}` }] : []),
  ];
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  );
}
