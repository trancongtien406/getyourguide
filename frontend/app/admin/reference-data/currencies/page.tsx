'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination, Table } from '@/components/ui/table';
import { ApiError, referenceDataApi, type Currency } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiDeleteBinLine,
    RiEditLine,
    RiSearchLine,
} from 'react-icons/ri';

const emptyForm = { code: '', name: '', symbol: '', decimals: '2' };

export default function CurrenciesPage() {
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
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

  const fetchCurrencies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(currentPage), pageSize: '20' };
      if (search) params.q = search;
      const response = await referenceDataApi.listCurrencies(params);
      setCurrencies(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchCurrencies(); }, [fetchCurrencies]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); fetchCurrencies(); };

  const openAdd = () => { setEditingCode(null); setFormData(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (c: Currency) => { setEditingCode(c.code); setFormData({ code: c.code, name: c.name, symbol: c.symbol || '', decimals: String(c.decimals) }); setFormError(''); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingCode(null); setFormError(''); };

  const handleSave = async () => {
    if (!formData.code || !formData.name) { setFormError(t('codeAndNameRequired')); return; }
    setIsSaving(true); setFormError('');
    try {
      if (editingCode) {
        await referenceDataApi.updateCurrency(editingCode, { name: formData.name, symbol: formData.symbol || undefined, decimals: formData.decimals ? parseInt(formData.decimals) : undefined });
      } else {
        await referenceDataApi.createCurrency({ code: formData.code.toUpperCase(), name: formData.name, symbol: formData.symbol || undefined, decimals: formData.decimals ? parseInt(formData.decimals) : undefined });
      }
      closeDialog(); fetchCurrencies();
    } catch (error) { setFormError(error instanceof ApiError ? error.message : editingCode ? t('editCurrencyTitle', { code: editingCode }) : t('createCurrencyTitle')); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (c: Currency) => {
    if (!confirm(t('confirmDeleteCurrency', { name: c.name, code: c.code }))) return;
    try { await referenceDataApi.deleteCurrency(c.code); fetchCurrencies(); }
    catch (error) { alert(error instanceof ApiError ? error.message : tc('delete')); }
  };

  const columns = [
    { key: 'code', header: t('labelCode'), render: (c: Currency) => <span className="font-mono text-sm font-medium">{c.code}</span> },
    { key: 'name', header: tc('name'), render: (c: Currency) => c.name },
    { key: 'symbol', header: t('colSymbol'), render: (c: Currency) => <span className="text-lg">{c.symbol || '—'}</span> },
    { key: 'decimals', header: t('colDecimals'), render: (c: Currency) => c.decimals },
    { key: 'actions', header: '', className: 'w-20', render: (c: Currency) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(c)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={tc('edit')}><RiEditLine className="h-4 w-4" /></button>
        <button onClick={() => handleDelete(c)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={tc('delete')}><RiDeleteBinLine className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('currenciesTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('currenciesSubtitle')}</p>
        </div>
        <Button onClick={openAdd}><RiAddLine className="h-5 w-5" /> {t('addCurrency')}</Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('searchCurrencyPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      <Card>
        <Table columns={columns} data={currencies} isLoading={isLoading} keyExtractor={(c) => c.code} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title={editingCode ? t('editCurrencyTitle', { code: editingCode }) : t('createCurrencyTitle')} size="sm"
        footer={<><Button variant="ghost" onClick={closeDialog}>{tc('cancel')}</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc('saving') : tc('save')}</Button></>}>
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <Input label={t('labelCode')} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="VND" disabled={!!editingCode} maxLength={3} />
          <Input label={`${tc('name')} *`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Vietnamese Dong" />
          <Input label={t('labelSymbol')} value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} placeholder="₫" />
          <Input label={t('labelDecimals')} value={formData.decimals} onChange={(e) => setFormData({ ...formData, decimals: e.target.value })} placeholder="2" type="number" />
        </div>
      </Modal>
    </div>
  );
}
