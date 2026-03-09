'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TranslationManager } from '@/components/ui/translation-manager';
import { ApiError, blogApi, BlogCategory, BlogCategoryTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function EditBlogCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<BlogCategory | null>(null);
  const [translations, setTranslations] = useState<BlogCategoryTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', isActive: true });
  const [formError, setFormError] = useState('');
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const loadCategory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await blogApi.listCategories({ pageSize: '1000' });
      const found = response.data?.find((c) => c.id === categoryId);
      if (found) {
        setCategory(found);
        setFormData({
          name: found.name,
          slug: found.slug,
          isActive: found.isActive,
        });
      }
    } catch (error) {
      console.error('Error loading category:', error);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await blogApi.getCategoryTranslations(categoryId);
      setTranslations(data || []);
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }, [categoryId]);

  useEffect(() => {
    loadCategory();
    loadTranslations();
  }, [loadCategory, loadTranslations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      await blogApi.updateCategory(categoryId, formData);
      router.push('/admin/blog/categories');
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('saveCategoryError'));
      } else {
        setFormError(t('saveCategoryError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTranslation = async (data: { languageCode: string; name?: string; description?: string }) => {
    await blogApi.upsertCategoryTranslation(categoryId, {
      languageCode: data.languageCode,
      name: data.name,
      description: data.description,
    });
  };

  const handleDeleteTranslation = async (languageCode: string) => {
    await blogApi.deleteCategoryTranslation(categoryId, languageCode);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('categoryNotFound')}</p>
        <Link href="/admin/blog/categories">
          <Button variant="outline" className="mt-4">
            {t('backToCategories')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/blog/categories">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-4 w-4 mr-1" />
            {tc('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('editCategoryPageTitle')}
          </h1>
          <p className="text-gray-500 text-sm">{category.name}</p>
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm">{tc('active')}</label>
            </div>
            <Button type="submit" isLoading={isSaving}>
              {tc('saveChanges')}
            </Button>
          </form>
        </Card>

        {/* Translations */}
        <Card>
          <TranslationManager
            entityId={categoryId}
            entityType="blog-category"
            translations={translations}
            onSave={handleSaveTranslation}
            onDelete={handleDeleteTranslation}
            onTranslationsChange={loadTranslations}
            fields={['name', 'description']}
          />
        </Card>
      </div>
    </div>
  );
}
