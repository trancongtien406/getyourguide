'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { ApiError, referenceDataApi, type Country } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine, RiDeleteBinLine, RiSaveLine } from 'react-icons/ri';

export default function EditCountryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const t = useTranslations('referenceData');
  const tc = useTranslations('common');

  const [country, setCountry] = useState<Country | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    iso2: '',
    iso3: '',
    name: '',
    currencyCode: '',
    imageUrl: '',
  });

  useEffect(() => {
    // Load country by finding it from the list (no GET /:id endpoint)
    referenceDataApi.listCountries({ pageSize: '1000' }).then((res) => {
      const found = (res.data || []).find((c: Country) => c.id === id);
      if (found) {
        setCountry(found);
        setFormData({
          iso2: found.iso2,
          iso3: found.iso3,
          name: found.name,
          currencyCode: found.currencyCode,
          imageUrl: found.imageUrl || '',
        });
      } else {
        setFormError(t('countryNotFound'));
      }
      setIsLoading(false);
    }).catch(() => {
      setFormError(t('loadCountryError'));
      setIsLoading(false);
    });
  }, [id]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name) {
      setFormError(t('nameRequired'));
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      await referenceDataApi.updateCountry(id, {
        iso2: formData.iso2.toUpperCase(),
        iso3: formData.iso3.toUpperCase(),
        name: formData.name,
        currencyCode: formData.currencyCode.toUpperCase(),
        imageUrl: formData.imageUrl || undefined,
      });
      router.push('/admin/reference-data/countries');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t('updateCountryError'));
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, id, router]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('confirmDeleteCountryGeneric'))) return;
    setIsDeleting(true);
    try {
      await referenceDataApi.deleteCountry(id);
      router.push('/admin/reference-data/countries');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t('deleteCountryError'));
      }
      setIsDeleting(false);
    }
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!country) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('countryNotFound')}</p>
        <Link href="/admin/reference-data/countries">
          <Button variant="outline" className="mt-4">{tc('back')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/reference-data/countries">
            <Button variant="ghost" size="sm">
              <RiArrowLeftLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('editCountryTitle')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{country.name} ({country.iso2})</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDelete} disabled={isDeleting}>
          <RiDeleteBinLine className="h-4 w-4 text-red-500" />
          {isDeleting ? tc('processing') : tc('delete')}
        </Button>
      </div>

      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {formError}
        </div>
      )}

      <Card>
        <CardHeader title={t('countryInfoSection')} />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('labelIso2')}
              value={formData.iso2}
              onChange={(e) => setFormData({ ...formData, iso2: e.target.value })}
              placeholder="VN"
              maxLength={2}
            />
            <Input
              label={t('labelIso3')}
              value={formData.iso3}
              onChange={(e) => setFormData({ ...formData, iso3: e.target.value })}
              placeholder="VNM"
              maxLength={3}
            />
          </div>
          <Input
            label={`${tc('name')} *`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Vietnam"
          />
          <Input
            label={t('labelCurrencyCode')}
            value={formData.currencyCode}
            onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
            placeholder="VND"
            maxLength={3}
          />
          <ImageUpload
            label={t('labelImage')}
            value={formData.imageUrl}
            onChange={(url) => setFormData({ ...formData, imageUrl: url })}
            folder="reference-data"
          />
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href="/admin/reference-data/countries">
          <Button variant="outline">{tc('cancel')}</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSaving}>
          <RiSaveLine className="h-4 w-4" />
          {isSaving ? tc('saving') : tc('saveChanges')}
        </Button>
      </div>
    </div>
  );
}
