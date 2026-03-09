'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination, Table } from '@/components/ui/table';
import { ApiError, referenceDataApi, type Language } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiDeleteBinLine,
    RiEditLine,
    RiSearchLine,
} from 'react-icons/ri';

const emptyForm = { code: '', name: '' };

export default function LanguagesPage() {
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchLanguages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(currentPage), pageSize: '20' };
      if (search) params.q = search;
      const response = await referenceDataApi.listLanguages(params);
      setLanguages(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchLanguages(); }, [fetchLanguages]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); fetchLanguages(); };

  const openAdd = () => { setEditingCode(null); setFormData(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (l: Language) => { setEditingCode(l.code); setFormData({ code: l.code, name: l.name }); setFormError(''); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingCode(null); setFormError(''); };

  const handleSave = async () => {
    if (!formData.code || !formData.name) { setFormError(t('codeAndNameRequired')); return; }
    setIsSaving(true); setFormError('');
    try {
      if (editingCode) {
        await referenceDataApi.updateLanguage(editingCode, { code: formData.code.toLowerCase(), name: formData.name });
      } else {
        await referenceDataApi.createLanguage({ code: formData.code.toLowerCase(), name: formData.name });
      }
      closeDialog(); fetchLanguages();
    } catch (error) { setFormError(error instanceof ApiError ? error.message : editingCode ? t('editLanguageTitle', { code: editingCode }) : t('createLanguageTitle')); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (l: Language) => {
    if (!confirm(t('confirmDeleteLanguage', { name: l.name, code: l.code }))) return;
    try { await referenceDataApi.deleteLanguage(l.code); fetchLanguages(); }
    catch (error) { alert(error instanceof ApiError ? error.message : tc('delete')); }
  };

  const columns = [
    { key: 'code', header: t('labelCode'), render: (l: Language) => <span className="font-mono text-sm font-medium">{l.code}</span> },
    { key: 'name', header: tc('name'), render: (l: Language) => l.name },
    { key: 'actions', header: '', className: 'w-20', render: (l: Language) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(l)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={tc('edit')}><RiEditLine className="h-4 w-4" /></button>
        <button onClick={() => handleDelete(l)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={tc('delete')}><RiDeleteBinLine className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('languagesTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('languagesSubtitle')}</p>
        </div>
        <Button onClick={openAdd}><RiAddLine className="h-5 w-5" /> {t('addLanguage')}</Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('searchLanguagePlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      <Card>
        <Table columns={columns} data={languages} isLoading={isLoading} keyExtractor={(l) => l.code} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title={editingCode ? t('editLanguageTitle', { code: editingCode }) : t('createLanguageTitle')} size="sm"
        footer={<><Button variant="ghost" onClick={closeDialog}>{tc('cancel')}</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc('saving') : tc('save')}</Button></>}>
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <Input label={t('labelCode')} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="vi" disabled={!!editingCode} />
          <Input label={`${tc('name')} *`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Vietnamese" />
        </div>
      </Modal>
    </div>
  );
}
