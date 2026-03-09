'use client';

import { blogApi, referenceDataApi, type BlogPostTranslation, type Language } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiEdit2Line, RiSaveLine } from 'react-icons/ri';
import { Button } from './button';

interface BlogPostTranslationManagerProps {
  postId: string;
  translations: BlogPostTranslation[];
  onTranslationsChange: () => void;
}

export function BlogPostTranslationManager({ postId, translations, onTranslationsChange }: BlogPostTranslationManagerProps) {
  const t = useTranslations('blogTranslationManager');
  const tc = useTranslations('common');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    languageCode: '',
    title: '',
    excerpt: '',
    content: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });

  useEffect(() => {
    referenceDataApi.listLanguages({ pageSize: '100' }).then((res) => {
      setLanguages(res.data || []);
    });
  }, []);

  const usedLanguageCodes = translations.map((t) => t.languageCode);
  const availableLanguages = languages.filter((l) => !usedLanguageCodes.includes(l.code));

  const handleEdit = (translation: BlogPostTranslation) => {
    setEditingCode(translation.languageCode);
    setFormData({
      languageCode: translation.languageCode,
      title: translation.title,
      excerpt: translation.excerpt || '',
      content: translation.content,
      seoTitle: translation.seoTitle || '',
      seoDescription: translation.seoDescription || '',
      seoKeywords: translation.seoKeywords || '',
    });
    setIsAdding(false);
  };

  const handleAdd = () => {
    if (availableLanguages.length === 0) return;
    setIsAdding(true);
    setEditingCode(null);
    setFormData({
      languageCode: availableLanguages[0].code,
      title: '',
      excerpt: '',
      content: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    });
  };

  const handleCancel = () => {
    setEditingCode(null);
    setIsAdding(false);
    setFormData({
      languageCode: '',
      title: '',
      excerpt: '',
      content: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    });
  };

  const handleSave = useCallback(async () => {
    if (!formData.languageCode || !formData.title || !formData.content) return;
    setIsSaving(true);
    try {
      await blogApi.upsertPostTranslation(postId, {
        languageCode: formData.languageCode,
        title: formData.title,
        excerpt: formData.excerpt || undefined,
        content: formData.content,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        seoKeywords: formData.seoKeywords || undefined,
      });
      handleCancel();
      onTranslationsChange();
    } catch (error) {
      console.error('Failed to save translation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [postId, formData, onTranslationsChange]);

  const handleDelete = useCallback(async (languageCode: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await blogApi.deletePostTranslation(postId, languageCode);
      onTranslationsChange();
    } catch (error) {
      console.error('Failed to delete translation:', error);
    }
  }, [postId, onTranslationsChange]);

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
          <Button size="sm" onClick={handleSave} disabled={isSaving || !formData.title || !formData.content}>
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
        <label className="mb-1 block text-sm font-medium">{t('titleLabel')}</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          placeholder={t('titlePlaceholder')}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('excerptLabel')}</label>
        <textarea
          value={formData.excerpt}
          onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          rows={2}
          placeholder={t('excerptPlaceholder')}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('contentLabel')}</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          rows={8}
          placeholder={t('contentPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('seoTitleLabel')}</label>
          <input
            type="text"
            value={formData.seoTitle}
            onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            placeholder="SEO title"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('seoKeywordsLabel')}</label>
          <input
            type="text"
            value={formData.seoKeywords}
            onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            placeholder="keyword1, keyword2"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('seoDescLabel')}</label>
        <textarea
          value={formData.seoDescription}
          onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          rows={2}
          placeholder="SEO meta description"
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
                <p className="truncate text-sm text-gray-500">{translation.title}</p>
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
