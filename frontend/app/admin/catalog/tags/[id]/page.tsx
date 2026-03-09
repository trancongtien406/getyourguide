'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TranslationManager } from '@/components/ui/translation-manager';
import { ApiError, catalogApi, Tag, TagTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function EditTagPage() {
  const t = useTranslations('catalog');
  const tc = useTranslations('common');

  const params = useParams();
  const router = useRouter();
  const tagId = params.id as string;

  const [tag, setTag] = useState<Tag | null>(null);
  const [translations, setTranslations] = useState<TagTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [formError, setFormError] = useState('');

  const loadTag = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await catalogApi.listTags({ pageSize: '1000' });
      const found = response.data?.find((t) => t.id === tagId);
      if (found) {
        setTag(found);
        setFormData({
          name: found.name,
          slug: found.slug,
        });
      }
    } catch (error) {
      console.error('Error loading tag:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tagId]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await catalogApi.getTagTranslations(tagId);
      setTranslations(data || []);
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }, [tagId]);

  useEffect(() => {
    loadTag();
    loadTranslations();
  }, [loadTag, loadTranslations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      await catalogApi.updateTag(tagId, formData);
      router.push('/admin/catalog/tags');
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || tc('cannotSave'));
      } else {
        setFormError(tc('errorGeneric'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTranslation = async (data: { languageCode: string; name?: string }) => {
    await catalogApi.upsertTagTranslation(tagId, {
      languageCode: data.languageCode,
      name: data.name,
    });
  };

  const handleDeleteTranslation = async (languageCode: string) => {
    await catalogApi.deleteTagTranslation(tagId, languageCode);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('tagNotFound')}</p>
        <Link href="/admin/catalog/tags">
          <Button variant="outline" className="mt-4">
            {t('backToTags')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/catalog/tags">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-4 w-4 mr-1" />
            {tc('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('editTagPageTitle')}
          </h1>
          <p className="text-gray-500 text-sm">{tag.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <h2 className="font-semibold text-lg mb-4">{tc('basicInfo')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}
            <Input
              label={tc('name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label={tc('slug')}
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
            <Button type="submit" isLoading={isSaving}>
              {tc('saveChanges')}
            </Button>
          </form>
        </Card>

        {/* Translations */}
        <Card>
          <TranslationManager
            entityId={tagId}
            entityType="tag"
            translations={translations}
            onSave={handleSaveTranslation}
            onDelete={handleDeleteTranslation}
            onTranslationsChange={loadTranslations}
            fields={['name']}
          />
        </Card>
      </div>
    </div>
  );
}
