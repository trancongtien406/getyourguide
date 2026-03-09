'use client';

import { referenceDataApi, type FaqItemTranslation, type Language } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiEdit2Line, RiSaveLine } from 'react-icons/ri';
import { Button } from './button';

interface FaqItemTranslationManagerProps {
  itemId: string;
  translations: FaqItemTranslation[];
  onTranslationsChange: () => void;
}

export function FaqItemTranslationManager({ itemId, translations, onTranslationsChange }: FaqItemTranslationManagerProps) {
  const t = useTranslations('faqTranslationManager');
  const tc = useTranslations('common');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    languageCode: '',
    question: '',
    answer: '',
  });

  useEffect(() => {
    referenceDataApi.listLanguages({ pageSize: '100' }).then((res) => {
      setLanguages(res.data || []);
    });
  }, []);

  const usedLanguageCodes = translations.map((t) => t.languageCode);
  const availableLanguages = languages.filter((l) => !usedLanguageCodes.includes(l.code));

  const handleEdit = (translation: FaqItemTranslation) => {
    setEditingCode(translation.languageCode);
    setFormData({
      languageCode: translation.languageCode,
      question: translation.question,
      answer: translation.answer,
    });
    setIsAdding(false);
  };

  const handleAdd = () => {
    if (availableLanguages.length === 0) return;
    setIsAdding(true);
    setEditingCode(null);
    setFormData({
      languageCode: availableLanguages[0].code,
      question: '',
      answer: '',
    });
  };

  const handleCancel = () => {
    setEditingCode(null);
    setIsAdding(false);
    setFormData({ languageCode: '', question: '', answer: '' });
  };

  const handleSave = useCallback(async () => {
    if (!formData.languageCode || !formData.question || !formData.answer) return;
    setIsSaving(true);
    try {
      await referenceDataApi.upsertFaqItemTranslation(itemId, {
        languageCode: formData.languageCode,
        question: formData.question,
        answer: formData.answer,
      });
      handleCancel();
      onTranslationsChange();
    } catch (error) {
      console.error('Failed to save translation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, formData, onTranslationsChange]);

  const handleDelete = useCallback(async (languageCode: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await referenceDataApi.deleteFaqItemTranslation(itemId, languageCode);
      onTranslationsChange();
    } catch (error) {
      console.error('Failed to delete translation:', error);
    }
  }, [itemId, onTranslationsChange]);

  const getLanguageName = (code: string) => {
    const lang = languages.find((l) => l.code === code);
    return lang ? lang.name : code;
  };

  const renderForm = () => (
    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-blue-900 dark:text-blue-100">
          {editingCode ? t('editTitle', { language: getLanguageName(editingCode) }) : t('addTitle')}
        </h4>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
            <RiCloseLine className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !formData.question || !formData.answer}>
            <RiSaveLine className="h-4 w-4" />
            {isSaving ? tc('saving') : tc('save')}
          </Button>
        </div>
      </div>

      {isAdding && (
        <div>
          <label className="mb-1 block text-sm font-medium">{t('languageLabel')}</label>
          <select
            value={formData.languageCode}
            onChange={(e) => setFormData({ ...formData, languageCode: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">{t('questionLabel')}</label>
        <input
          type="text"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          placeholder={t('questionPlaceholder')}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('answerLabel')}</label>
        <textarea
          value={formData.answer}
          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          rows={5}
          placeholder={t('answerPlaceholder')}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('count', { count: translations.length })}</p>
        {availableLanguages.length > 0 && !isAdding && !editingCode && (
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <RiAddLine className="h-4 w-4" />
            {t('addButton')}
          </Button>
        )}
      </div>

      {(isAdding || editingCode) && renderForm()}

      {translations.length > 0 && (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {translations.map((translation) => (
            <div
              key={translation.languageCode}
              className={`flex items-center justify-between p-3 ${
                editingCode === translation.languageCode ? 'bg-blue-50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{getLanguageName(translation.languageCode)}</p>
                <p className="truncate text-sm text-gray-500">{translation.question}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(translation)}
                  className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title={t('tooltipEdit')}
                >
                  <RiEdit2Line className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(translation.languageCode)}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title={t('tooltipDelete')}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {translations.length === 0 && !isAdding && (
        <p className="py-4 text-center text-sm text-gray-500">{t('empty')}</p>
      )}
    </div>
  );
}
