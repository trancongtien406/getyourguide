'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { FaqItemTranslationManager } from '@/components/ui/faq-item-translation-manager';
import { referenceDataApi, type FaqItem, type FaqItemTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function FaqItemTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<FaqItem | null>(null);
  const [translations, setTranslations] = useState<FaqItemTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = useTranslations('referenceData');
  const tc = useTranslations('common');

  const loadItem = useCallback(async () => {
    try {
      const response = await referenceDataApi.listFaqItems({ pageSize: '1000' });
      const found = response.data?.find((i) => i.id === id);
      if (found) {
        setItem(found);
      } else {
        router.push('/admin/reference-data/faq-items');
      }
    } catch (error) {
      console.error('Failed to load FAQ item:', error);
      router.push('/admin/reference-data/faq-items');
    }
  }, [id, router]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await referenceDataApi.getFaqItemTranslations(id);
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadItem(), loadTranslations()]).finally(() => setIsLoading(false));
  }, [loadItem, loadTranslations]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('faqItemNotFound')}</p>
        <Link href="/admin/reference-data/faq-items" className="mt-4 text-blue-500 hover:underline">
          {t('backToFaqItems')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/reference-data/faq-items">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('faqItemTranslationsTitle')}</h1>
          <p className="truncate text-gray-500 dark:text-gray-400">{item.question}</p>
        </div>
      </div>

      {/* Original Info */}
      <Card>
        <CardHeader title={tc('basicInfo')} />
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">{t('labelQuestionDisplay')}:</span>
            <p className="font-medium">{item.question}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">{t('labelAnswerDisplay')}:</span>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{item.answer}</p>
          </div>
        </div>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader title={tc('translations')} />
        <FaqItemTranslationManager
          itemId={id}
          translations={translations}
          onTranslationsChange={loadTranslations}
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/reference-data/faq-items">
          <Button variant="outline">{t('backToFaqItems')}</Button>
        </Link>
      </div>
    </div>
  );
}
