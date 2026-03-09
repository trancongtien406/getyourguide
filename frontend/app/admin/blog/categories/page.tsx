'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table } from '@/components/ui/table';
import { ApiError, blogApi, type BlogCategory } from '@/lib/api';
import { generateSlug } from '@/lib/slugify';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiCheckLine, RiCloseLine, RiEditLine, RiTranslate2 } from 'react-icons/ri';

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('blog');
  const tc = useTranslations('common');

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await blogApi.listCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: BlogCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, slug: category.slug });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await blogApi.updateCategory(editingCategory.id, formData);
      } else {
        await blogApi.createCategory(formData);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('saveCategoryError'));
      } else {
        setFormError(t('saveCategoryError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (category: BlogCategory) => {
    try {
      await blogApi.updateCategory(category.id, { isActive: !category.isActive });
      fetchCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const columns = [
    {
      key: 'name',
      header: tc('name'),
      render: (cat: BlogCategory) => (
        <div>
          <p className="font-medium">{cat.name}</p>
          <p className="text-xs text-gray-500">/{cat.slug}</p>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: tc('status'),
      render: (cat: BlogCategory) => (
        <Badge variant={cat.isActive ? 'success' : 'default'}>
          {cat.isActive ? tc('active') : tc('inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (cat: BlogCategory) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(cat)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={tc('edit')}
          >
            <RiEditLine className="h-4 w-4" />
          </button>
          <Link
            href={`/admin/blog/categories/${cat.id}`}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={tc('translations')}
          >
            <RiTranslate2 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => toggleActive(cat)}
            className={`rounded p-1.5 ${
              cat.isActive
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            title={cat.isActive ? tc('inactive') : tc('active')}
          >
            {cat.isActive ? (
              <RiCloseLine className="h-4 w-4" />
            ) : (
              <RiCheckLine className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('categoriesTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('categoriesSubtitle')}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <RiAddLine className="h-5 w-5" />
          {t('addCategory')}
        </Button>
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={categories}
          keyExtractor={(c) => c.id}
          isLoading={isLoading}
          emptyMessage={t('categoriesEmpty')}
        />
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? t('editCategoryTitle') : t('createCategoryTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingCategory ? tc('saveChanges') : tc('create')}
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
                slug: editingCategory ? formData.slug : generateSlug(name),
              });
            }}
            required
          />
          <Input
            label={tc('slug')}
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
