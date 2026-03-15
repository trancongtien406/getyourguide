import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public');
  return {
    title: t('metaCartTitle'),
    description: t('metaCartDescription'),
    robots: { index: false, follow: false },
  };
}

export default function CartLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
