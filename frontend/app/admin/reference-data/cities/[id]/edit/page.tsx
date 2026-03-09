'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError, referenceDataApi, type City, type Country } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine, RiDeleteBinLine, RiSaveLine } from 'react-icons/ri';

export default function EditCityPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const t = useTranslations('referenceData');
  const tc = useTranslations('common');

  const [city, setCity] = useState<City | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    countryId: '',
    name: '',
    latitude: '',
    longitude: '',
    timezone: '',
    imageUrl: '',
  });

  useEffect(() => {
    Promise.all([
      referenceDataApi.listCities({ pageSize: '1000' }),
      referenceDataApi.listCountries({ pageSize: '1000' }),
    ]).then(([cityRes, countryRes]) => {
      setCountries(countryRes.data || []);
      const found = (cityRes.data || []).find((c: City) => c.id === id);
      if (found) {
        setCity(found);
        setFormData({
          countryId: found.countryId,
          name: found.name,
          latitude: found.latitude?.toString() || '',
          longitude: found.longitude?.toString() || '',
          timezone: found.timezone || '',
          imageUrl: found.imageUrl || '',
        });
      } else {
        setFormError(t('cityNotFound'));
      }
      setIsLoading(false);
    }).catch(() => {
      setFormError(t('loadCityError'));
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
      await referenceDataApi.updateCity(id, {
        countryId: formData.countryId || undefined,
        name: formData.name,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        timezone: formData.timezone || undefined,
        imageUrl: formData.imageUrl || undefined,
      });
      router.push('/admin/reference-data/cities');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t('updateCityError'));
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, id, router]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('confirmDeleteCityGeneric'))) return;
    setIsDeleting(true);
    try {
      await referenceDataApi.deleteCity(id);
      router.push('/admin/reference-data/cities');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t('deleteCityError'));
      }
      setIsDeleting(false);
    }
  }, [id, router]);

  const countryOptions = [
    { value: '', label: t('selectCountry') },
    ...countries.map((c) => ({ value: c.id, label: `${c.name} (${c.iso2})` })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!city) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('cityNotFound')}</p>
        <Link href="/admin/reference-data/cities">
          <Button variant="outline" className="mt-4">{tc('back')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/reference-data/cities">
            <Button variant="ghost" size="sm">
              <RiArrowLeftLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('editCityTitle')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{city.name}</p>
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
        <CardHeader title={t('cityInfoSection')} />
        <div className="space-y-4">
          <Select
            label={t('labelCountry')}
            value={formData.countryId}
            onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
            options={countryOptions}
          />
          <Input
            label={`${tc('name')} *`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ho Chi Minh City"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('labelLatitude')}
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              placeholder="10.762622"
              type="number"
            />
            <Input
              label={t('labelLongitude')}
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              placeholder="106.660172"
              type="number"
            />
          </div>
          <Input
            label={t('labelTimezone')}
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            placeholder="Asia/Ho_Chi_Minh"
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
        <Link href="/admin/reference-data/cities">
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
