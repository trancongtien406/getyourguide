'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { TranslationManager } from '@/components/ui/translation-manager';
import { referenceDataApi, type FaqCategory, type FaqCategoryTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function FaqCategoryTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [category, setCategory] = useState<FaqCategory | null>(null);
  const [translations, setTranslations] = useState<FaqCategoryTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = useTranslations('referenceData');
  const tc = useTranslations('common');

  const loadCategory = useCallback(async () => {
    try {
      const response = await referenceDataApi.listFaqCategories({ pageSize: '1000' });
      const found = response.data?.find((c) => c.id === id);
      if (found) {
        setCategory(found);
      } else {
        router.push('/admin/reference-data/faq-categories');
      }
    } catch (error) {
      console.error('Failed to load category:', error);
      router.push('/admin/reference-data/faq-categories');
    }
  }, [id, router]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await referenceDataApi.getFaqCategoryTranslations(id);
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadCategory(), loadTranslations()]).finally(() => setIsLoading(false));
  }, [loadCategory, loadTranslations]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('faqCategoryNotFound')}</p>
        <Link href="/admin/reference-data/faq-categories" className="mt-4 text-blue-500 hover:underline">
          {t('backToFaqCategories')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/reference-data/faq-categories">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('faqCategoryTranslationsTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{category.name}</p>
        </div>
      </div>

      {/* Original Info */}
      <Card>
        <CardHeader title={tc('basicInfo')} />
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">{tc('name')}:</span>
            <p className="font-medium">{category.name}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">{tc('slug')}:</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">/{category.slug}</p>
          </div>
        </div>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader title={tc('translations')} />
        <TranslationManager
          entityId={id}
          entityType="faq-category"
          translations={translations.map((t) => ({
            languageCode: t.languageCode,
            name: t.name,
            description: t.description,
          }))}
          onTranslationsChange={loadTranslations}
          fields={['name', 'description']}
          onSave={(data) => referenceDataApi.upsertFaqCategoryTranslation(id, data).then(() => {})}
          onDelete={(languageCode) => referenceDataApi.deleteFaqCategoryTranslation(id, languageCode).then(() => {})}
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/reference-data/faq-categories">
          <Button variant="outline">{t('backToFaqCategories')}</Button>
        </Link>
      </div>
    </div>
  );
}
