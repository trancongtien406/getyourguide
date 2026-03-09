'use client';

import { Badge, BlogStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import { blogApi, type BlogCategory, type BlogPost } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiEditLine, RiEyeLine, RiSearchLine, RiTranslate2 } from 'react-icons/ri';

export default function BlogPostsPage() {
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const statusOptions = [
    { value: '', label: t('allCategories') },
    { value: 'DRAFT', label: t('statusDraft') },
    { value: 'REVIEW', label: t('statusReview') },
    { value: 'PUBLISHED', label: t('statusPublished') },
    { value: 'ARCHIVED', label: t('statusArchived') },
  ];
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);

  useEffect(() => {
    blogApi.listCategories({ pageSize: '100' }).then((res) => {
      setCategories(res.data || []);
    });
  }, []);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (featuredOnly) params.featured = 'true';

      const response = await blogApi.listPosts(params);
      setPosts(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, statusFilter, categoryFilter, featuredOnly]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPosts();
  };

  const columns = [
    {
      key: 'title',
      header: t('colTitle'),
      render: (post: BlogPost) => (
        <div className="max-w-xs">
          <p className="truncate font-medium">{post.title}</p>
          <p className="truncate text-xs text-gray-500">/{post.slug}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('colStatus'),
      render: (post: BlogPost) => (
        <div className="flex items-center gap-2">
          <BlogStatusBadge status={post.status} />
          {post.isFeatured && <Badge variant="purple">{t('badgeFeatured')}</Badge>}
        </div>
      ),
    },
    {
      key: 'views',
      header: t('colViews'),
      render: (post: BlogPost) => Number(post.viewCount).toLocaleString(),
    },
    {
      key: 'publishedAt',
      header: t('colPublishedAt'),
      render: (post: BlogPost) =>
        post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('vi-VN') : '-',
    },
    {
      key: 'createdAt',
      header: t('colCreatedAt'),
      render: (post: BlogPost) => new Date(post.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (post: BlogPost) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('tooltipView')}
          >
            <RiEyeLine className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/blog/posts/${post.id}/edit`}
            className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title={t('tooltipEdit')}
          >
            <RiEditLine className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/blog/posts/${post.id}`}
            className="rounded p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            title={t('tooltipTranslations')}
          >
            <RiTranslate2 className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('postsTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('postsSubtitle')}
          </p>
        </div>
        <Link href="/admin/blog/posts/new">
          <Button>
            <RiAddLine className="h-5 w-5" />
            {t('newPost')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPostPlaceholder')}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={statusOptions}
              wrapperClassName="sm:w-40 sm:flex-shrink-0"
            />
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('allCategories') },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              wrapperClassName="sm:w-48 sm:flex-shrink-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <Toggle
              checked={featuredOnly}
              onChange={setFeaturedOnly}
              label={t('featuredOnly')}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                {tc('search')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setCategoryFilter('');
                  setFeaturedOnly(false);
                  setCurrentPage(1);
                }}
              >
                {tc('clearFilters')}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={posts}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyMessage={t('postsEmpty')}
        />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
}
