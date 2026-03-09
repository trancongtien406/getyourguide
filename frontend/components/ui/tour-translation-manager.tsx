'use client';

import { catalogApi, Language, referenceDataApi, TourTranslation } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';

interface TourTranslationManagerProps {
  tourId: string;
  translations: TourTranslation[];
  onTranslationsChange: () => void;
}

export function TourTranslationManager({
  tourId,
  translations,
  onTranslationsChange,
}: TourTranslationManagerProps) {
  const t = useTranslations('tourTranslationManager');
  const tc = useTranslations('common');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<TourTranslation>>({
    languageCode: '',
    title: '',
    shortDescription: '',
    fullDescription: '',
    highlights: [],
    includedItems: [],
    excludedItems: [],
  });

  // Temp state for array inputs
  const [highlightsText, setHighlightsText] = useState('');
  const [includedText, setIncludedText] = useState('');
  const [excludedText, setExcludedText] = useState('');

  useEffect(() => {
    loadLanguages();
  }, []);

  async function loadLanguages() {
    try {
      const response = await referenceDataApi.listLanguages({ pageSize: '100' });
      setLanguages(response.data.filter((l) => l.code));
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  }

  function getAvailableLanguages() {
    const usedCodes = translations.map((t) => t.languageCode);
    return languages.filter((l) => !usedCodes.includes(l.code));
  }

  function handleAddNew() {
    setEditMode(false);
    setSelectedLanguage('');
    setFormData({
      languageCode: '',
      title: '',
      shortDescription: '',
      fullDescription: '',
      highlights: [],
      includedItems: [],
      excludedItems: [],
    });
    setHighlightsText('');
    setIncludedText('');
    setExcludedText('');
  }

  function handleEdit(translation: TourTranslation) {
    setEditMode(true);
    setSelectedLanguage(translation.languageCode);
    setFormData({
      languageCode: translation.languageCode,
      title: translation.title,
      shortDescription: translation.shortDescription || '',
      fullDescription: translation.fullDescription || '',
      highlights: translation.highlights || [],
      includedItems: translation.includedItems || [],
      excludedItems: translation.excludedItems || [],
    });
    setHighlightsText((translation.highlights || []).join('\n'));
    setIncludedText((translation.includedItems || []).join('\n'));
    setExcludedText((translation.excludedItems || []).join('\n'));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);

    try {
      const data: TourTranslation = {
        tourId,
        languageCode: editMode ? selectedLanguage : formData.languageCode!,
        title: formData.title!,
        shortDescription: formData.shortDescription,
        fullDescription: formData.fullDescription,
        highlights: highlightsText.split('\n').filter((s) => s.trim()),
        includedItems: includedText.split('\n').filter((s) => s.trim()),
        excludedItems: excludedText.split('\n').filter((s) => s.trim()),
      };

      await catalogApi.upsertTourTranslation(tourId, data);
      onTranslationsChange();
      setFormData({
        languageCode: '',
        title: '',
        shortDescription: '',
        fullDescription: '',
      });
      setSelectedLanguage('');
      setHighlightsText('');
      setIncludedText('');
      setExcludedText('');
    } catch (error) {
      console.error('Error saving translation:', error);
    } finally {
      setLoading(false);
    }
  }

  const availableLanguages = getAvailableLanguages();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{t('title')}</h3>
        {availableLanguages.length > 0 && !selectedLanguage && (
          <Button type="button" variant="outline" size="sm" onClick={handleAddNew}>
            {t('addButton')}
          </Button>
        )}
      </div>

      {/* Existing Translations */}
      <div className="space-y-2">
        {translations.length === 0 && (
          <p className="text-sm text-gray-500">{t('empty')}</p>
        )}
        {translations.map((translation) => (
          <div
            key={translation.languageCode}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <span className="font-medium text-sm uppercase text-gray-600">
                {translation.languageCode}
              </span>
              <span className="ml-2 text-sm text-gray-800">{translation.title}</span>
              {translation.shortDescription && (
                <p className="text-xs text-gray-500 truncate max-w-xs">
                  {translation.shortDescription}
                </p>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(translation)}>
              {t('editButton')}
            </Button>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {(selectedLanguage || availableLanguages.length > 0) && (
        <div className="space-y-3 p-4 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700">
          <h4 className="font-medium text-sm">
            {editMode ? t('editTitle', { languageCode: selectedLanguage }) : t('addTitle')}
          </h4>

          {!editMode && (
            <Select
              label={t('languageLabel')}
              value={formData.languageCode || ''}
              onChange={(e) => setFormData({ ...formData, languageCode: e.target.value })}
              required
              placeholder={t('languagePlaceholder')}
              options={availableLanguages.map((lang) => ({
                value: lang.code,
                label: `${lang.name} (${lang.code})`,
              }))}
            />
          )}

          <Input
            label={t('titleLabel')}
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Textarea
            label={t('shortDescLabel')}
            value={formData.shortDescription || ''}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            rows={2}
          />

          <Textarea
            label={t('fullDescLabel')}
            value={formData.fullDescription || ''}
            onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
            rows={4}
          />

          <Textarea
            label={t('highlightsLabel')}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            rows={3}
            placeholder="Beautiful scenery&#10;Expert guide&#10;Local cuisine"
          />

          <Textarea
            label={t('includedLabel')}
            value={includedText}
            onChange={(e) => setIncludedText(e.target.value)}
            rows={3}
            placeholder="Hotel pickup&#10;Lunch&#10;Entrance fees"
          />

          <Textarea
            label={t('excludedLabel')}
            value={excludedText}
            onChange={(e) => setExcludedText(e.target.value)}
            rows={3}
            placeholder="Personal expenses&#10;Tips&#10;Travel insurance"
          />

          <div className="flex gap-2">
            <Button type="button" disabled={loading} onClick={() => handleSubmit()}>
              {loading ? tc('saving') : tc('save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedLanguage('');
                setFormData({
                  languageCode: '',
                  title: '',
                  shortDescription: '',
                  fullDescription: '',
                });
                setHighlightsText('');
                setIncludedText('');
                setExcludedText('');
              }}
            >
              {tc('cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
