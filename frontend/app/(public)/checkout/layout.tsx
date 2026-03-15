import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public');
  return {
    title: t('metaCheckoutTitle'),
    description: t('metaCheckoutDescription'),
    robots: { index: false, follow: false },
  };
}

export default function CheckoutLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
