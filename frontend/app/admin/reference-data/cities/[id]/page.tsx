'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { TranslationManager } from '@/components/ui/translation-manager';
import { referenceDataApi, type City, type CityTranslation, type Country } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function CityTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [city, setCity] = useState<City | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [translations, setTranslations] = useState<CityTranslation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = useTranslations('referenceData');
  const tc = useTranslations('common');

  const loadCity = useCallback(async () => {
    try {
      const response = await referenceDataApi.listCities({ pageSize: '1000' });
      const found = response.data?.find((c) => c.id === id);
      if (found) {
        setCity(found);
      } else {
        router.push('/admin/reference-data/cities');
      }
    } catch (error) {
      console.error('Failed to load city:', error);
      router.push('/admin/reference-data/cities');
    }
  }, [id, router]);

  const loadTranslations = useCallback(async () => {
    try {
      const data = await referenceDataApi.getCityTranslations(id);
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [id]);

  useEffect(() => {
    referenceDataApi.listCountries({ pageSize: '1000' }).then((res) => {
      setCountries(res.data || []);
    });
  }, []);

  useEffect(() => {
    Promise.all([loadCity(), loadTranslations()]).finally(() => setIsLoading(false));
  }, [loadCity, loadTranslations]);

  const getCountryName = (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    return country ? country.name : countryId;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('cityNotFound')}</p>
        <Link href="/admin/reference-data/cities" className="mt-4 text-blue-500 hover:underline">
          {t('backToCities')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/reference-data/cities">
          <Button variant="ghost" size="sm">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('cityTranslationsTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{city.name} - {getCountryName(city.countryId)}</p>
        </div>
      </div>

      {/* Original Info */}
      <Card>
        <CardHeader title={tc('basicInfo')} />
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">{tc('name')}:</span>
            <p className="font-medium">{city.name}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">{t('colCountry')}:</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">{getCountryName(city.countryId)}</p>
          </div>
        </div>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader title={tc('translations')} />
        <TranslationManager
          entityId={id}
          entityType="city"
          translations={translations.map((t) => ({
            languageCode: t.languageCode,
            name: t.name,
          }))}
          onTranslationsChange={loadTranslations}
          fields={['name']}
          onSave={(data) => referenceDataApi.upsertCityTranslation(id, data).then(() => {})}
          onDelete={(languageCode) => referenceDataApi.deleteCityTranslation(id, languageCode).then(() => {})}
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/reference-data/cities">
          <Button variant="outline">{t('backToCities')}</Button>
        </Link>
      </div>
    </div>
  );
}
