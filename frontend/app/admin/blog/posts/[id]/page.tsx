'use client';

import { BlogPostTranslationManager } from '@/components/ui/blog-post-translation-manager';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { blogApi, type BlogPost, type BlogPostTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function BlogPostTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [translations, setTranslations] = useState<BlogPostTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const loadPost = useCallback(async () => {
    try {
      const data = await blogApi.getPostById(id);
      setPost(data);
    } catch (error) {
      console.error('Failed to load post:', error);
      router.push('/admin/blog/posts');
    }
  }, [id, router]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await blogApi.getPostTranslations(id);
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadPost(), loadTranslations()]).finally(() => setIsLoading(false));
  }, [loadPost, loadTranslations]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('postNotFound')}</p>
        <Link href="/admin/blog/posts" className="mt-4 text-blue-500 hover:underline">
          {t('backToPosts')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/blog/posts">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('postTranslationsTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{post.title}</p>
        </div>
      </div>

      {/* Post Info */}
      <Card>
        <CardHeader title={tc('basicInfo')} />
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">{t('labelTitleDisplay')}:</span>
            <p className="font-medium">{post.title}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">{t('labelSlugDisplay')}:</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">/{post.slug}</p>
          </div>
          {post.excerpt && (
            <div>
              <span className="text-sm font-medium text-gray-500">{t('labelExcerptDisplay')}:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">{post.excerpt}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader title={t('sectionTranslations')} />
        <BlogPostTranslationManager
          postId={id}
          translations={translations}
          onTranslationsChange={loadTranslations}
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/blog/posts">
          <Button variant="outline">{t('backToPosts')}</Button>
        </Link>
        <Link href={`/admin/blog/posts/${id}/edit`}>
          <Button>{t('editPost')}</Button>
        </Link>
      </div>
    </div>
  );
}
