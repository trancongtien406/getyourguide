'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination, Table } from '@/components/ui/table';
import { ApiError, referenceDataApi, type Country } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiDeleteBinLine,
    RiEditLine,
    RiSearchLine,
    RiTranslate2,
} from 'react-icons/ri';

const emptyForm = { iso2: '', iso3: '', name: '', currencyCode: '', imageUrl: '' };

export default function CountriesPage() {
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [countries, setCountries] = useState<Country[]>([]);
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

  const fetchCountries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(currentPage), pageSize: '20' };
      if (search) params.q = search;
      const response = await referenceDataApi.listCountries(params);
      setCountries(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); fetchCountries(); };

  const openAdd = () => { setEditingId(null); setFormData(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (c: Country) => { setEditingId(c.id); setFormData({ iso2: c.iso2, iso3: c.iso3, name: c.name, currencyCode: c.currencyCode, imageUrl: c.imageUrl || '' }); setFormError(''); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setFormError(''); };

  const handleSave = async () => {
    if (!formData.iso2 || !formData.iso3 || !formData.name || !formData.currencyCode) { setFormError(t('allFieldsRequired')); return; }
    setIsSaving(true); setFormError('');
    try {
      const data = { iso2: formData.iso2.toUpperCase(), iso3: formData.iso3.toUpperCase(), name: formData.name, currencyCode: formData.currencyCode.toUpperCase(), imageUrl: formData.imageUrl || undefined };
      if (editingId) { await referenceDataApi.updateCountry(editingId, data); }
      else { await referenceDataApi.createCountry(data); }
      closeDialog(); fetchCountries();
    } catch (error) { setFormError(error instanceof ApiError ? error.message : editingId ? t('updateCountryError') : t('createCountryError')); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (c: Country) => {
    if (!confirm(t('confirmDeleteCountry', { name: c.name, iso2: c.iso2 }))) return;
    try { await referenceDataApi.deleteCountry(c.id); fetchCountries(); }
    catch (error) { alert(error instanceof ApiError ? error.message : t('deleteCountryError')); }
  };

  const columns = [
    { key: 'image', header: '', className: 'w-14', render: (c: Country) => c.imageUrl ? (
      <Image src={c.imageUrl} alt={c.name} width={40} height={28} className="rounded object-cover" />
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'code', header: t('colCode'), render: (c: Country) => (<div className="font-mono text-sm"><span className="font-medium">{c.iso2}</span><span className="text-gray-400 ml-1">/ {c.iso3}</span></div>) },
    { key: 'name', header: tc('name'), render: (c: Country) => c.name },
    { key: 'currency', header: t('colCurrency'), render: (c: Country) => <span className="font-mono text-sm">{c.currencyCode}</span> },
    { key: 'actions', header: '', className: 'w-28', render: (c: Country) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(c)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={tc('edit')}><RiEditLine className="h-4 w-4" /></button>
        <Link href={`/admin/reference-data/countries/${c.id}`} className="rounded p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20" title={tc('translations')}><RiTranslate2 className="h-4 w-4" /></Link>
        <button onClick={() => handleDelete(c)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={tc('delete')}><RiDeleteBinLine className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('countriesTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('countriesSubtitle')}</p>
        </div>
        <Button onClick={openAdd}><RiAddLine className="h-5 w-5" /> {t('addCountry')}</Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('searchCountryPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      <Card>
        <Table columns={columns} data={countries} isLoading={isLoading} keyExtractor={(c) => c.id} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title={editingId ? t('editCountryTitle') : t('createCountryTitle')} size="md"
        footer={<><Button variant="ghost" onClick={closeDialog}>{tc('cancel')}</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc('saving') : tc('save')}</Button></>}>
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('labelIso2')} value={formData.iso2} onChange={(e) => setFormData({ ...formData, iso2: e.target.value })} placeholder="VN" maxLength={2} />
            <Input label={t('labelIso3')} value={formData.iso3} onChange={(e) => setFormData({ ...formData, iso3: e.target.value })} placeholder="VNM" maxLength={3} />
          </div>
          <Input label={`${tc('name')} *`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Vietnam" />
          <Input label={t('labelCurrencyCode')} value={formData.currencyCode} onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })} placeholder="VND" maxLength={3} />
          <ImageUpload label={t('labelImage')} value={formData.imageUrl} onChange={(url) => setFormData({ ...formData, imageUrl: url })} folder="reference-data" />
        </div>
      </Modal>
    </div>
  );
}
