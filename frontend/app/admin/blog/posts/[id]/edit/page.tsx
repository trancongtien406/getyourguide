'use client';

import { BlogPostTranslationManager } from '@/components/ui/blog-post-translation-manager';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import {
    ApiError,
    blogApi,
    type BlogCategory,
    type BlogPost,
    type BlogPostStatus,
    type BlogPostTranslation,
} from '@/lib/api';
import { generateSlug } from '@/lib/slugify';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine, RiDeleteBinLine, RiSaveLine } from 'react-icons/ri';

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  coverImageUrl: string;
  status: BlogPostStatus;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const statusOptions = [
    { value: 'DRAFT', label: t('statusDraft') },
    { value: 'REVIEW', label: t('statusReview') },
    { value: 'PUBLISHED', label: t('statusPublished') },
    { value: 'ARCHIVED', label: t('statusArchived') },
  ];

  const [post, setPost] = useState<BlogPost | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [translations, setTranslations] = useState<BlogPostTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    categoryId: '',
    coverImageUrl: '',
    status: 'DRAFT',
    isFeatured: false,
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });

  const loadTranslations = useCallback(async () => {
    try {
      const data = await blogApi.getPostTranslations(id);
      setTranslations(data || []);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([
      blogApi.getPostById(id),
      blogApi.listCategories({ pageSize: '100' }),
      blogApi.getPostTranslations(id),
    ]).then(([postData, catRes, translationsData]) => {
      setPost(postData);
      setCategories(catRes.data || []);
      setTranslations(translationsData || []);
      setFormData({
        title: postData.title || '',
        slug: postData.slug || '',
        excerpt: postData.excerpt || '',
        content: postData.content || '',
        categoryId: postData.categoryId || '',
        coverImageUrl: postData.coverImageUrl || '',
        status: postData.status || 'DRAFT',
        isFeatured: postData.isFeatured || false,
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
      });
      setIsLoading(false);
    }).catch(() => {
      setFormError(t('loadError'));
      setIsLoading(false);
    });
  }, [id]);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      setFormError(t('validationRequired'));
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      await blogApi.updatePost(id, {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || undefined,
        content: formData.content,
        categoryId: formData.categoryId || undefined,
        coverImageUrl: formData.coverImageUrl || undefined,
        status: formData.status,
        isFeatured: formData.isFeatured,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        seoKeywords: formData.seoKeywords ? formData.seoKeywords.split(',').map((k) => k.trim()) : undefined,
      });
      router.push('/admin/blog/posts');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t('updateError'));
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, id, router]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('confirmDelete'))) return;

    setIsDeleting(true);
    try {
      await blogApi.deletePost(id);
      router.push('/admin/blog/posts');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t('deleteError'));
      }
      setIsDeleting(false);
    }
  }, [id, router]);

  const categoryOptions = [
    { value: '', label: t('noCategoryOption') },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('postNotFound')}</p>
        <Link href="/admin/blog/posts">
          <Button variant="outline" className="mt-4">{t('backToPosts')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog/posts">
            <Button variant="ghost" size="sm">
              <RiArrowLeftLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('editPostTitle')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{post.title}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDelete} disabled={isDeleting}>
          <RiDeleteBinLine className="h-4 w-4 text-red-500" />
          {isDeleting ? tc('processing') : tc('delete')}
        </Button>
      </div>

      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content - 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t('sectionContent')} />
            <div className="space-y-4">
              <Input
                label={t('labelTitle')}
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t('placeholderTitle')}
              />
              <Input
                label={t('labelSlug')}
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={t('placeholderSlug')}
              />
              <Textarea
                label={t('labelExcerpt')}
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder={t('placeholderExcerpt')}
                rows={3}
              />
              <Textarea
                label={t('labelContent')}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('placeholderContent')}
                rows={15}
              />
            </div>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader title={t('sectionSeo')} />
            <div className="space-y-4">
              <Input
                label={t('labelSeoTitle')}
                value={formData.seoTitle}
                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                placeholder={t('placeholderSeoTitle')}
              />
              <Textarea
                label={t('labelSeoDescription')}
                value={formData.seoDescription}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                placeholder={t('placeholderSeoDescription')}
                rows={2}
              />
              <Input
                label={t('labelSeoKeywords')}
                value={formData.seoKeywords}
                onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                placeholder={t('placeholderSeoKeywords')}
              />
            </div>
          </Card>

          {/* Translations */}
          <Card>
            <CardHeader title={tc('translations')} />
            <BlogPostTranslationManager
              postId={id}
              translations={translations}
              onTranslationsChange={loadTranslations}
            />
          </Card>
        </div>

        {/* Sidebar - 1 col */}
        <div className="space-y-6">
          {/* Publishing */}
          <Card>
            <CardHeader title={t('sectionPublish')} />
            <div className="space-y-4">
              <Select
                label={t('labelStatus')}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as BlogPostStatus })}
                options={statusOptions}
              />
              <Select
                label={t('labelCategory')}
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                options={categoryOptions}
              />
              <Input
                label={t('labelCoverImage')}
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="https://..."
              />
              <Toggle
                checked={formData.isFeatured}
                onChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                label={t('toggleFeatured')}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/admin/blog/posts" className="flex-1">
              <Button variant="outline" className="w-full">{tc('cancel')}</Button>
            </Link>
            <Button className="flex-1" onClick={handleSubmit} disabled={isSaving}>
              <RiSaveLine className="h-4 w-4" />
              {isSaving ? tc('saving') : tc('save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
