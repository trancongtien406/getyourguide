'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { ApiError, referenceDataApi } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';

export default function NewCountryPage() {
  const router = useRouter();
  const t = useTranslations('referenceData');
  const tc = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    iso2: '',
    iso3: '',
    name: '',
    currencyCode: '',
    imageUrl: '',
  });

  const handleSubmit = useCallback(async () => {
    if (!formData.iso2 || !formData.iso3 || !formData.name || !formData.currencyCode) {
      setFormError(t('allFieldsRequired'));
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      await referenceDataApi.createCountry({
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
        setFormError(t('createCountryError'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/reference-data/countries">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('newCountryTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('newCountrySubtitle')}</p>
        </div>
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
        <Button onClick={handleSubmit} disabled={isLoading}>
          <RiSaveLine className="h-4 w-4" />
          {isLoading ? tc('creating') : tc('create')}
        </Button>
      </div>
    </div>
  );
}
