import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.getyourguide.com';
const siteName = 'GetYourGuide';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public');
  return {
    title: t('metaToursTitle'),
    description: t('metaToursDescription'),
    openGraph: {
      title: t('metaToursTitle'),
      description: t('metaToursOgDescription'),
      url: `${siteUrl}/tours`,
      siteName,
    },
    alternates: { canonical: `${siteUrl}/tours` },
  };
}

export default function ToursLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
