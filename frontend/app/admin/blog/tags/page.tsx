'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination, Table } from '@/components/ui/table';
import { blogApi, type BlogTag } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiSearchLine, RiTranslate2 } from 'react-icons/ri';

export default function BlogTagsPage() {
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '20',
      };
      if (search) params.q = search;

      const response = await blogApi.listTags(params);
      setTags(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch blog tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTags();
  };

  const columns = [
    {
      key: 'name',
      header: tc('name'),
      render: (tag: BlogTag) => (
        <div>
          <p className="font-medium">{tag.name}</p>
          <p className="text-xs text-gray-500">/{tag.slug}</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: t('colCreatedAt'),
      render: (tag: BlogTag) => new Date(tag.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (tag: BlogTag) => (
        <Link
          href={`/admin/blog/tags/${tag.id}`}
          className="rounded p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          title={tc('translations')}
        >
          <RiTranslate2 className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tagsTitle')}</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {t('tagsSubtitle')}
        </p>
      </div>

      {/* Search */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('searchTagPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      {/* Table */}
      <Card>
        <Table columns={columns} data={tags} isLoading={isLoading} keyExtractor={(tag) => tag.id} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
