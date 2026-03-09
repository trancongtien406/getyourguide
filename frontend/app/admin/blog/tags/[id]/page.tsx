'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { TranslationManager } from '@/components/ui/translation-manager';
import { blogApi, type BlogTag, type BlogTagTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function BlogTagTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tag, setTag] = useState<BlogTag | null>(null);
  const [translations, setTranslations] = useState<BlogTagTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const loadTag = useCallback(async () => {
    try {
      const response = await blogApi.listTags({ pageSize: '1000' });
      const found = response.data?.find((t) => t.id === id);
      if (found) {
        setTag(found);
      } else {
        router.push('/admin/blog/tags');
      }
    } catch (error) {
      console.error('Failed to load tag:', error);
      router.push('/admin/blog/tags');
    }
  }, [id, router]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await blogApi.getTagTranslations(id);
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadTag(), loadTranslations()]).finally(() => setIsLoading(false));
  }, [loadTag, loadTranslations]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('tagNotFound')}</p>
        <Link href="/admin/blog/tags" className="mt-4 text-blue-500 hover:underline">
          {t('backToTags')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/blog/tags">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tagTranslationsTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{tag.name}</p>
        </div>
      </div>

      {/* Original Info */}
      <Card>
        <CardHeader title={tc('basicInfo')} />
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">{tc('name')}:</span>
            <p className="font-medium">{tag.name}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">{tc('slug')}:</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">/{tag.slug}</p>
          </div>
        </div>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader title={tc('translations')} />
        <TranslationManager
          entityId={id}
          entityType="blog-tag"
          translations={translations.map((t) => ({
            languageCode: t.languageCode,
            name: t.name,
          }))}
          onTranslationsChange={loadTranslations}
          fields={['name']}
          onSave={(data) => blogApi.upsertTagTranslation(id, data).then(() => {})}
          onDelete={(languageCode) => blogApi.deleteTagTranslation(id, languageCode).then(() => {})}
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/blog/tags">
          <Button variant="outline">{t('backToTags')}</Button>
        </Link>
      </div>
    </div>
  );
}
