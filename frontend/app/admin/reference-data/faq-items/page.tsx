'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ApiError, referenceDataApi, type FaqCategory, type FaqItem } from '@/lib/api';
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

const emptyForm = { categoryId: '', slug: '', question: '', answer: '', sortOrder: '0', isActive: true };

export default function FaqItemsPage() {
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [items, setItems] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    referenceDataApi.listFaqCategories({ pageSize: '100' }).then((res) => {
      setCategories(res.data || []);
    });
  }, []);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(currentPage), pageSize: '20' };
      if (search) params.q = search;
      if (categoryFilter) params.categoryId = categoryFilter;
      const response = await referenceDataApi.listFaqItems(params);
      setItems(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch FAQ items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, categoryFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); fetchItems(); };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '-';
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : categoryId;
  };

  const filterOptions = [
    { value: '', label: t('allFaqCategories') },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const categorySelectOptions = [
    { value: '', label: t('noFaqCategory') },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const openAdd = () => { setEditingId(null); setFormData(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: FaqItem) => {
    setEditingId(item.id);
    setFormData({ categoryId: item.categoryId || '', slug: item.slug, question: item.question, answer: item.answer, sortOrder: String(item.sortOrder), isActive: item.isActive });
    setFormError(''); setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setFormError(''); };

  const handleSave = async () => {
    const slug = formData.slug || generateSlug(formData.question);
    if (!slug || !formData.question || !formData.answer) { setFormError(t('slugQuestionAnswerRequired')); return; }
    setIsSaving(true); setFormError('');
    try {
      const payload = {
        categoryId: formData.categoryId || undefined,
        slug,
        question: formData.question,
        answer: formData.answer,
        sortOrder: parseInt(formData.sortOrder) || 0,
        isActive: formData.isActive,
      };
      if (editingId) {
        await referenceDataApi.updateFaqItem(editingId, payload);
      } else {
        await referenceDataApi.createFaqItem(payload);
      }
      closeDialog(); fetchItems();
    } catch (error) { setFormError(error instanceof ApiError ? error.message : editingId ? t('editFaqItemTitle') : t('createFaqItemTitle')); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (item: FaqItem) => {
    if (!confirm(t('confirmDeleteFaqItem', { question: item.question.substring(0, 50) }))) return;
    try { await referenceDataApi.deleteFaqItem(item.id); fetchItems(); }
    catch (error) { alert(error instanceof ApiError ? error.message : tc('delete')); }
  };

  const columns = [
    { key: 'question', header: t('colQuestion'), render: (item: FaqItem) => (
      <div className="max-w-md">
        <p className="truncate font-medium">{item.question}</p>
        <p className="text-xs text-gray-500">/{item.slug}</p>
      </div>
    )},
    { key: 'category', header: t('colCategory'), render: (item: FaqItem) => getCategoryName(item.categoryId) },
    { key: 'sortOrder', header: t('colSortOrder'), render: (item: FaqItem) => item.sortOrder },
    { key: 'isActive', header: tc('status'), render: (item: FaqItem) => (
      <Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? tc('active') : tc('inactive')}</Badge>
    )},
    { key: 'actions', header: '', className: 'w-28', render: (item: FaqItem) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(item)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={tc('edit')}><RiEditLine className="h-4 w-4" /></button>
        <Link href={`/admin/reference-data/faq-items/${item.id}`} className="rounded p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20" title={tc('translations')}><RiTranslate2 className="h-4 w-4" /></Link>
        <button onClick={() => handleDelete(item)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={tc('delete')}><RiDeleteBinLine className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('faqItemsTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('faqItemsSubtitle')}</p>
        </div>
        <Button onClick={openAdd}><RiAddLine className="h-5 w-5" /> {t('addFaqItem')}</Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('searchFaqItemPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="w-48">
            <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }} options={filterOptions} />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      <Card>
        <Table columns={columns} data={items} isLoading={isLoading} keyExtractor={(item) => item.id} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title={editingId ? t('editFaqItemTitle') : t('createFaqItemTitle')} size="lg"
        footer={<><Button variant="ghost" onClick={closeDialog}>{tc('cancel')}</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc('saving') : tc('save')}</Button></>}>
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <Select label={t('colCategory')} value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} options={categorySelectOptions} />
          <Textarea label={t('labelQuestion')} value={formData.question} onChange={(e) => {
            const question = e.target.value;
            setFormData({ ...formData, question, slug: editingId ? formData.slug : generateSlug(question) });
          }} placeholder="How do I cancel my booking?" rows={2} />
          <Input label={`${tc('slug')} *`} value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="how-to-cancel-booking" />
          <Textarea label={t('labelAnswer')} value={formData.answer} onChange={(e) => setFormData({ ...formData, answer: e.target.value })} placeholder="You can cancel your booking by..." rows={4} />
          <Input label={t('labelSortOrder')} value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} type="number" placeholder="0" />
          <Toggle label={t('labelActive')} checked={formData.isActive} onChange={(checked) => setFormData({ ...formData, isActive: checked })} />
        </div>
      </Modal>
    </div>
  );
}
