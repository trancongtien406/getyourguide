'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination, Table } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import { ApiError, referenceDataApi, type FaqCategory } from '@/lib/api';
import { generateSlug } from '@/lib/slugify';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiDeleteBinLine,
    RiEditLine,
    RiSearchLine,
    RiTranslate2,
} from 'react-icons/ri';

const emptyForm = { slug: '', name: '', sortOrder: '0', isActive: true };

export default function FaqCategoriesPage() {
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(currentPage), pageSize: '20' };
      if (search) params.q = search;
      const response = await referenceDataApi.listFaqCategories(params);
      setCategories(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch FAQ categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); fetchCategories(); };

  const openAdd = () => { setEditingId(null); setFormData(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (cat: FaqCategory) => {
    setEditingId(cat.id);
    setFormData({ slug: cat.slug, name: cat.name, sortOrder: String(cat.sortOrder), isActive: cat.isActive });
    setFormError(''); setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setFormError(''); };

  const handleSave = async () => {
    const slug = formData.slug || generateSlug(formData.name);
    if (!slug || !formData.name) { setFormError(t('slugAndNameRequired')); return; }
    setIsSaving(true); setFormError('');
    try {
      const payload = { slug, name: formData.name, sortOrder: parseInt(formData.sortOrder) || 0, isActive: formData.isActive };
      if (editingId) {
        await referenceDataApi.updateFaqCategory(editingId, payload);
      } else {
        await referenceDataApi.createFaqCategory(payload);
      }
      closeDialog(); fetchCategories();
    } catch (error) { setFormError(error instanceof ApiError ? error.message : editingId ? t('editFaqCategoryTitle') : t('createFaqCategoryTitle')); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (cat: FaqCategory) => {
    if (!confirm(t('confirmDeleteFaqCategory', { name: cat.name }))) return;
    try { await referenceDataApi.deleteFaqCategory(cat.id); fetchCategories(); }
    catch (error) { alert(error instanceof ApiError ? error.message : tc('delete')); }
  };

  const columns = [
    { key: 'name', header: tc('name'), render: (cat: FaqCategory) => (
      <div>
        <p className="font-medium">{cat.name}</p>
        <p className="text-xs text-gray-500">/{cat.slug}</p>
      </div>
    )},
    { key: 'sortOrder', header: t('colSortOrder'), render: (cat: FaqCategory) => cat.sortOrder },
    { key: 'isActive', header: tc('status'), render: (cat: FaqCategory) => (
      <Badge variant={cat.isActive ? 'success' : 'default'}>{cat.isActive ? tc('active') : tc('inactive')}</Badge>
    )},
    { key: 'actions', header: '', className: 'w-28', render: (cat: FaqCategory) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(cat)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={tc('edit')}><RiEditLine className="h-4 w-4" /></button>
        <Link href={`/admin/reference-data/faq-categories/${cat.id}`} className="rounded p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20" title={tc('translations')}><RiTranslate2 className="h-4 w-4" /></Link>
        <button onClick={() => handleDelete(cat)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={tc('delete')}><RiDeleteBinLine className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('faqCategoriesTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('faqCategoriesSubtitle')}</p>
        </div>
        <Button onClick={openAdd}><RiAddLine className="h-5 w-5" /> {t('addFaqCategory')}</Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('searchFaqCategoryPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      <Card>
        <Table columns={columns} data={categories} isLoading={isLoading} keyExtractor={(c) => c.id} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title={editingId ? t('editFaqCategoryTitle') : t('createFaqCategoryTitle')} size="sm"
        footer={<><Button variant="ghost" onClick={closeDialog}>{tc('cancel')}</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc('saving') : tc('save')}</Button></>}>
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <Input label={`${tc('name')} *`} value={formData.name} onChange={(e) => {
            const name = e.target.value;
            setFormData({ ...formData, name, slug: editingId ? formData.slug : generateSlug(name) });
          }} placeholder="Booking & Payments" />
          <Input label={`${tc('slug')} *`} value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="booking-payments" />
          <Input label={t('labelSortOrder')} value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} type="number" placeholder="0" />
          <Toggle label={t('labelActive')} checked={formData.isActive} onChange={(checked) => setFormData({ ...formData, isActive: checked })} />
        </div>
      </Modal>
    </div>
  );
}
