'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError, referenceDataApi, type Country } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';

export default function NewCityPage() {
  const router = useRouter();
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    referenceDataApi.listCountries({ pageSize: '1000' }).then((res) => {
      setCountries(res.data || []);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.countryId || !formData.name) {
      setFormError(t('countryAndNameRequired'));
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      await referenceDataApi.createCity({
        countryId: formData.countryId,
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
        setFormError(t('createCityError'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, router]);

  const countryOptions = [
    { value: '', label: t('selectCountry') },
    ...countries.map((c) => ({ value: c.id, label: `${c.name} (${c.iso2})` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/reference-data/cities">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('newCityTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('newCitySubtitle')}</p>
        </div>
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
        <Button onClick={handleSubmit} disabled={isLoading}>
          <RiSaveLine className="h-4 w-4" />
          {isLoading ? tc('creating') : tc('create')}
        </Button>
      </div>
    </div>
  );
}
