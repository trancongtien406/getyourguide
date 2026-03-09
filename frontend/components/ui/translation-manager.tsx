'use client';

import { Language, referenceDataApi, Translation, UpsertTranslationData } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';

interface TranslationManagerProps {
  entityId: string;
  entityType: 'category' | 'tag' | 'tour' | 'tour-option' | 'blog-category' | 'blog-tag' | 'country' | 'city' | 'faq-category' | 'faq-item';
  translations: Translation[];
  onSave: (data: UpsertTranslationData) => Promise<void>;
  onDelete: (languageCode: string) => Promise<void>;
  onTranslationsChange: () => void;
  fields?: ('name' | 'title' | 'description')[];
}

export function TranslationManager({
  entityId,
  entityType,
  translations,
  onSave,
  onDelete,
  onTranslationsChange,
  fields = ['name'],
}: TranslationManagerProps) {
  const t = useTranslations('translationManager');
  const tc = useTranslations('common');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [formData, setFormData] = useState<UpsertTranslationData>({
    languageCode: '',
    name: '',
    title: '',
    description: '',
  });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadLanguages();
  }, []);

  async function loadLanguages() {
    try {
      const response = await referenceDataApi.listLanguages({ pageSize: '100' });
      setLanguages(response.data);
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  }

  function getAvailableLanguages() {
    const usedCodes = translations.map(t => t.languageCode);
    return languages.filter(l => !usedCodes.includes(l.code));
  }

  function handleAddNew() {
    setEditMode(false);
    setSelectedLanguage('');
    setFormData({ languageCode: '', name: '', title: '', description: '' });
  }

  function handleEdit(translation: Translation) {
    setEditMode(true);
    setSelectedLanguage(translation.languageCode);
    setFormData({
      languageCode: translation.languageCode,
      name: translation.name || '',
      title: translation.title || '',
      description: translation.description || '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const data: UpsertTranslationData = {
        languageCode: editMode ? selectedLanguage : formData.languageCode,
      };
      
      if (fields.includes('name')) data.name = formData.name;
      if (fields.includes('title')) data.title = formData.title;
      if (fields.includes('description')) data.description = formData.description;

      await onSave(data);
      onTranslationsChange();
      setFormData({ languageCode: '', name: '', title: '', description: '' });
      setSelectedLanguage('');
    } catch (error) {
      console.error('Error saving translation:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(languageCode: string) {
    if (!confirm(t('confirmDelete', { languageCode }))) return;
    
    setLoading(true);
    try {
      await onDelete(languageCode);
      onTranslationsChange();
    } catch (error) {
      console.error('Error deleting translation:', error);
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
              <span className="ml-2 text-sm text-gray-800">
                {translation.name || translation.title}
              </span>
              {translation.description && (
                <p className="text-xs text-gray-500 truncate max-w-xs">
                  {translation.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(translation)}
              >
                {t('editButton')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(translation.languageCode)}
              >
                {t('deleteButton')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {(selectedLanguage || availableLanguages.length > 0) && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-white">
          <h4 className="font-medium text-sm">
            {editMode ? t('editTitle', { languageCode: selectedLanguage }) : t('addTitle')}
          </h4>

          {!editMode && (
            <Select
              label={t('languageLabel')}
              value={formData.languageCode}
              onChange={(e) => setFormData({ ...formData, languageCode: e.target.value })}
              required
              placeholder={t('languagePlaceholder')}
              options={availableLanguages.map((lang) => ({
                value: lang.code,
                label: `${lang.name} (${lang.code})`,
              }))}
            />
          )}

          {fields.includes('name') && (
            <Input
              label={t('nameLabel')}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          )}

          {fields.includes('title') && (
            <Input
              label={t('titleLabel')}
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          )}

          {fields.includes('description') && (
            <Input
              label={t('descriptionLabel')}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? tc('saving') : tc('save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedLanguage('');
                setFormData({ languageCode: '', name: '', title: '', description: '' });
              }}
            >
              {tc('cancel')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
