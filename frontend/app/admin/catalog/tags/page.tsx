'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table } from '@/components/ui/table';
import { ApiError, catalogApi, type Tag } from '@/lib/api';
import { generateSlug } from '@/lib/slugify';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiEditLine, RiTranslate2 } from 'react-icons/ri';

export default function TagsPage() {
  const t = useTranslations('catalog');
  const tc = useTranslations('common');

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await catalogApi.listTags();
      setTags(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '', slug: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, slug: tag.slug });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingTag) {
        await catalogApi.updateTag(editingTag.id, formData);
      } else {
        await catalogApi.createTag(formData);
      }
      setIsModalOpen(false);
      fetchTags();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('saveTagError'));
      } else {
        setFormError(tc('errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: t('colName'),
      render: (tag: Tag) => <Badge variant="info">{tag.name}</Badge>,
    },
    {
      key: 'slug',
      header: t('colSlug'),
      render: (tag: Tag) => <span className="text-gray-500">/{tag.slug}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (tag: Tag) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(tag)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={tc('edit')}
          >
            <RiEditLine className="h-4 w-4" />
          </button>
          <Link
            href={`/admin/catalog/tags/${tag.id}`}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tagsTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('tagsSubtitle')}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <RiAddLine className="h-5 w-5" />
          {t('addTag')}
        </Button>
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={tags}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage={t('tagsEmpty')}
        />
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTag ? t('editTagTitle') : t('createTagTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingTag ? tc('saveChanges') : tc('create')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          <Input
            label={tc('name')}
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData({
                ...formData,
                name,
                slug: editingTag ? formData.slug : generateSlug(name),
              });
            }}
            required
          />
          <Input
            label={tc('slug')}
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
            helperText={tc('slugHelper')}
          />
        </form>
      </Modal>
    </div>
  );
}
