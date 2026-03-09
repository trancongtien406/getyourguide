'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { TranslationManager } from '@/components/ui/translation-manager';
import { referenceDataApi, type Country, type CountryTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function CountryTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [translations, setTranslations] = useState<CountryTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = useTranslations('referenceData');
  const tc = useTranslations('common');

  const loadCountry = useCallback(async () => {
    try {
      const response = await referenceDataApi.listCountries({ pageSize: '1000' });
      const found = response.data?.find((c) => c.id === id);
      if (found) {
        setCountry(found);
      } else {
        router.push('/admin/reference-data/countries');
      }
    } catch (error) {
      console.error('Failed to load country:', error);
      router.push('/admin/reference-data/countries');
    }
  }, [id, router]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await referenceDataApi.getCountryTranslations(id);
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadCountry(), loadTranslations()]).finally(() => setIsLoading(false));
  }, [loadCountry, loadTranslations]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!country) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('countryNotFound')}</p>
        <Link href="/admin/reference-data/countries" className="mt-4 text-blue-500 hover:underline">
          {t('backToCountries')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/reference-data/countries">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('countryTranslationsTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{country.name} ({country.iso2})</p>
        </div>
      </div>

      {/* Original Info */}
      <Card>
        <CardHeader title={tc('basicInfo')} />
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">{t('labelIsoDisplay')}:</span>
            <p className="font-mono">{country.iso2} / {country.iso3}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">{tc('name')}:</span>
            <p className="font-medium">{country.name}</p>
          </div>
        </div>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader title={tc('translations')} />
        <TranslationManager
          entityId={id}
          entityType="country"
          translations={translations.map((t) => ({
            languageCode: t.languageCode,
            name: t.name,
          }))}
          onTranslationsChange={loadTranslations}
          fields={['name']}
          onSave={(data) => referenceDataApi.upsertCountryTranslation(id, data).then(() => {})}
          onDelete={(languageCode) => referenceDataApi.deleteCountryTranslation(id, languageCode).then(() => {})}
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/reference-data/countries">
          <Button variant="outline">{t('backToCountries')}</Button>
        </Link>
      </div>
    </div>
  );
}
