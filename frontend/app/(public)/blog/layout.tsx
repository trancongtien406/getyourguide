import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.getyourguide.com';
const siteName = 'GetYourGuide';

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
