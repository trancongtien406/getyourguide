'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { ApiError, referenceDataApi, type City, type Country } from '@/lib/api';
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

const emptyForm = { countryId: '', name: '', latitude: '', longitude: '', timezone: '', imageUrl: '' };

const TIMEZONE_OPTIONS = [
  { value: '', label: '' },
  // Asia
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (UTC+7)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+7)' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (UTC+8)' },
  { value: 'Asia/Manila', label: 'Asia/Manila (UTC+8)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (UTC+8)' },
  { value: 'Asia/Taipei', label: 'Asia/Taipei (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (UTC+9)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
  { value: 'Asia/Mumbai', label: 'Asia/Mumbai (UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' },
  { value: 'Asia/Jerusalem', label: 'Asia/Jerusalem (UTC+2)' },
  { value: 'Asia/Yangon', label: 'Asia/Yangon (UTC+6:30)' },
  { value: 'Asia/Phnom_Penh', label: 'Asia/Phnom_Penh (UTC+7)' },
  { value: 'Asia/Vientiane', label: 'Asia/Vientiane (UTC+7)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (UTC+5)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (UTC+6)' },
  { value: 'Asia/Kathmandu', label: 'Asia/Kathmandu (UTC+5:45)' },
  { value: 'Asia/Colombo', label: 'Asia/Colombo (UTC+5:30)' },
  // Europe
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (UTC+1)' },
  { value: 'Europe/Rome', label: 'Europe/Rome (UTC+1)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (UTC+1)' },
  { value: 'Europe/Brussels', label: 'Europe/Brussels (UTC+1)' },
  { value: 'Europe/Vienna', label: 'Europe/Vienna (UTC+1)' },
  { value: 'Europe/Zurich', label: 'Europe/Zurich (UTC+1)' },
  { value: 'Europe/Prague', label: 'Europe/Prague (UTC+1)' },
  { value: 'Europe/Warsaw', label: 'Europe/Warsaw (UTC+1)' },
  { value: 'Europe/Stockholm', label: 'Europe/Stockholm (UTC+1)' },
  { value: 'Europe/Copenhagen', label: 'Europe/Copenhagen (UTC+1)' },
  { value: 'Europe/Helsinki', label: 'Europe/Helsinki (UTC+2)' },
  { value: 'Europe/Athens', label: 'Europe/Athens (UTC+2)' },
  { value: 'Europe/Bucharest', label: 'Europe/Bucharest (UTC+2)' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (UTC+3)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (UTC+3)' },
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon (UTC+0)' },
  { value: 'Europe/Dublin', label: 'Europe/Dublin (UTC+0)' },
  // Americas
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-6)' },
  { value: 'America/Denver', label: 'America/Denver (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (UTC-9)' },
  { value: 'America/Toronto', label: 'America/Toronto (UTC-5)' },
  { value: 'America/Vancouver', label: 'America/Vancouver (UTC-8)' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City (UTC-6)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (UTC-3)' },
  { value: 'America/Buenos_Aires', label: 'America/Buenos_Aires (UTC-3)' },
  { value: 'America/Lima', label: 'America/Lima (UTC-5)' },
  { value: 'America/Bogota', label: 'America/Bogota (UTC-5)' },
  { value: 'America/Santiago', label: 'America/Santiago (UTC-4)' },
  { value: 'America/Havana', label: 'America/Havana (UTC-5)' },
  // Oceania
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+11)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (UTC+11)' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (UTC+10)' },
  { value: 'Australia/Perth', label: 'Australia/Perth (UTC+8)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (UTC+13)' },
  { value: 'Pacific/Fiji', label: 'Pacific/Fiji (UTC+12)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (UTC-10)' },
  // Africa
  { value: 'Africa/Cairo', label: 'Africa/Cairo (UTC+2)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (UTC+1)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (UTC+2)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (UTC+3)' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca (UTC+1)' },
];

export default function CitiesPage() {
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [cities, setCities] = useState<City[]>([]);
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

  useEffect(() => {
    referenceDataApi.listCountries({ pageSize: '1000' }).then((res) => setCountries(res.data || []));
  }, []);

  const fetchCities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(currentPage), pageSize: '20' };
      if (search) params.q = search;
      const response = await referenceDataApi.listCities(params);
      setCities(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); fetchCities(); };

  const openAdd = () => { setEditingId(null); setFormData(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (c: City) => {
    setEditingId(c.id);
    setFormData({ countryId: c.countryId, name: c.name, latitude: c.latitude?.toString() || '', longitude: c.longitude?.toString() || '', timezone: c.timezone || '', imageUrl: c.imageUrl || '' });
    setFormError(''); setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setFormError(''); };

  const handleSave = async () => {
    if (!formData.countryId || !formData.name) { setFormError(t('countryAndNameRequired')); return; }
    setIsSaving(true); setFormError('');
    try {
      const data = {
        countryId: formData.countryId,
        name: formData.name,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        timezone: formData.timezone || undefined,
        imageUrl: formData.imageUrl || undefined,
      };
      if (editingId) { await referenceDataApi.updateCity(editingId, data); }
      else { await referenceDataApi.createCity(data); }
      closeDialog(); fetchCities();
    } catch (error) { setFormError(error instanceof ApiError ? error.message : editingId ? t('updateCityError') : t('createCityError')); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (c: City) => {
    if (!confirm(t('confirmDeleteCity', { name: c.name }))) return;
    try { await referenceDataApi.deleteCity(c.id); fetchCities(); }
    catch (error) { alert(error instanceof ApiError ? error.message : t('deleteCityError')); }
  };

  const getCountryName = (countryId: string) => countries.find((c) => c.id === countryId)?.name || countryId;
  const countryOptions = countries.map((c) => ({ value: c.id, label: `${c.name} (${c.iso2})` }));

  const columns = [
    { key: 'name', header: tc('name'), render: (c: City) => c.name },
    { key: 'country', header: t('colCountry'), render: (c: City) => getCountryName(c.countryId) },
    { key: 'timezone', header: t('colTimezone'), render: (c: City) => <span className="text-sm text-gray-500">{c.timezone || '—'}</span> },
    { key: 'actions', header: '', className: 'w-28', render: (c: City) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(c)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={tc('edit')}><RiEditLine className="h-4 w-4" /></button>
        <Link href={`/admin/reference-data/cities/${c.id}`} className="rounded p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20" title={tc('translations')}><RiTranslate2 className="h-4 w-4" /></Link>
        <button onClick={() => handleDelete(c)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={tc('delete')}><RiDeleteBinLine className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('citiesTitle')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('citiesSubtitle')}</p>
        </div>
        <Button onClick={openAdd}><RiAddLine className="h-5 w-5" /> {t('addCity')}</Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('searchCityPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit">{tc('search')}</Button>
        </form>
      </Card>

      <Card>
        <Table columns={columns} data={cities} isLoading={isLoading} keyExtractor={(c) => c.id} />
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title={editingId ? t('editCityTitle') : t('createCityTitle')} size="md"
        footer={<><Button variant="ghost" onClick={closeDialog}>{tc('cancel')}</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc('saving') : tc('save')}</Button></>}>
        <div className="space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <Select label={t('labelCountry')} value={formData.countryId} onChange={(e) => setFormData({ ...formData, countryId: e.target.value })} options={countryOptions} placeholder="Select country" />
          <Input label={`${tc('name')} *`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ho Chi Minh City" />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('labelLatitude')} value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} placeholder="10.8231" type="number" />
            <Input label={t('labelLongitude')} value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} placeholder="106.6297" type="number" />
          </div>
          <Select label={t('labelTimezone')} value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} options={TIMEZONE_OPTIONS} />
          <ImageUpload label={t('labelImage')} value={formData.imageUrl} onChange={(url) => setFormData({ ...formData, imageUrl: url })} folder="reference-data" />
        </div>
      </Modal>
    </div>
  );
}
