import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public');
  return {
    title: t('notFoundTitle'),
    description: t('notFoundDesc'),
    robots: { index: false, follow: true },
  };
}

export default async function NotFound() {
  const t = await getTranslations('public');
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-blue-600 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('notFoundTitle')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          {t('notFoundDesc')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {t('goBackHome')}
        </Link>
      </div>
    </div>
  );
}
