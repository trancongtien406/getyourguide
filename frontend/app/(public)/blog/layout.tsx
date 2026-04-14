import { SITE_NAME, SITE_URL } from '@/lib/runtime-config';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const siteUrl = SITE_URL;
const siteName = SITE_NAME;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public');
  return {
    title: t('metaBlogTitle'),
    description: t('metaBlogDescription'),
    openGraph: {
      title: t('metaBlogTitle'),
      description: t('metaBlogOgDescription'),
      url: `${siteUrl}/blog`,
      siteName,
    },
    alternates: { canonical: `${siteUrl}/blog` },
  };
}

export default function BlogLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
