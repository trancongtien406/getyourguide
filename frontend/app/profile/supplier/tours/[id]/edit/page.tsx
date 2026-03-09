'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    ApiError,
    catalogApi,
    referenceDataApi,
    uploadsApi,
    type Category,
    type City,
    type Language,
    type Tag,
    type TourItineraryStop,
    type TourMedia,
    type TourTranslation,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiArrowDownLine,
    RiArrowLeftLine,
    RiArrowUpLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiGlobalLine,
    RiImageAddLine,
    RiSaveLine,
    RiStarFill,
    RiStarLine,
    RiUploadCloud2Line,
} from 'react-icons/ri';

// ─── Types ───────────────────────────────────────────────────────────

interface TourOption {
  id?: string;
  name: string;
  description?: string;
  maxParticipants?: number;
  isActive: boolean;
}

interface TranslationFormData {
  title: string;
  shortDescription: string;
  fullDescription: string;
  highlightsText: string;
  includedItemsText: string;
  excludedItemsText: string;
  whatToBringText: string;
  importantInfoText: string;
}

const EMPTY_TRANSLATION: TranslationFormData = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  highlightsText: '',
  includedItemsText: '',
  excludedItemsText: '',
  whatToBringText: '',
  importantInfoText: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function translationToForm(t: TourTranslation): TranslationFormData {
  return {
    title: t.title || '',
    shortDescription: t.shortDescription || '',
    fullDescription: t.fullDescription || '',
    highlightsText: (t.highlights || []).join('\n'),
    includedItemsText: (t.includedItems || []).join('\n'),
    excludedItemsText: (t.excludedItems || []).join('\n'),
    whatToBringText: (t.whatToBring || []).join('\n'),
    importantInfoText: (t.importantInfo || []).join('\n'),
  };
}

function formToTranslation(
  languageCode: string,
  form: TranslationFormData,
): Omit<TourTranslation, 'tourId'> {
  return {
    languageCode,
    title: form.title,
    shortDescription: form.shortDescription || undefined,
    fullDescription: form.fullDescription || undefined,
    highlights: form.highlightsText
      ? form.highlightsText.split('\n').filter(Boolean)
      : undefined,
    includedItems: form.includedItemsText
      ? form.includedItemsText.split('\n').filter(Boolean)
      : undefined,
    excludedItems: form.excludedItemsText
      ? form.excludedItemsText.split('\n').filter(Boolean)
      : undefined,
    whatToBring: form.whatToBringText
      ? form.whatToBringText.split('\n').filter(Boolean)
      : undefined,
    importantInfo: form.importantInfoText
      ? form.importantInfoText.split('\n').filter(Boolean)
      : undefined,
  };
}

// ─── Component ───────────────────────────────────────────────────────

export default function SupplierEditTourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('catalog');
  const tc = useTranslations('common');

  // ── Main tour form state ────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [cityId, setCityId] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [maxGroupSize, setMaxGroupSize] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);
  const [deletedOptionIds, setDeletedOptionIds] = useState<string[]>([]);

  // ── Additional fields ───────────────────────────────────────────
  const [availableLanguagesText, setAvailableLanguagesText] = useState('');
  const [whatToBringText, setWhatToBringText] = useState('');
  const [importantInfoText, setImportantInfoText] = useState('');
  const [allowPayLater, setAllowPayLater] = useState(false);
  const [defaultLanguageCode, setDefaultLanguageCode] = useState('');
  const [cancelType, setCancelType] = useState('FREE');
  const [cancelHours, setCancelHours] = useState('24');

  // ── Departure slots state ───────────────────────────────────────
  const [depSummary, setDepSummary] = useState<Record<string, { total: number; active: number }>>({});
  const [depLoading, setDepLoading] = useState<Record<string, boolean>>({});

  // ── Media state ──────────────────────────────────────────────────
  const [media, setMedia] = useState<TourMedia[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);

  // ── Itinerary state ─────────────────────────────────────────────
  const [itinerary, setItinerary] = useState<TourItineraryStop[]>([]);
  const [itineraryLoading, setItineraryLoading] = useState(false);

  // ── Translation tab state ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>('default');
  const [translationTabs, setTranslationTabs] = useState<string[]>([]);
  const [translationForms, setTranslationForms] = useState<
    Record<string, TranslationFormData>
  >({});

  // ── Reference data ──────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  // ── UI state ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const showMessage = useCallback(
    (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 4000);
    },
    [],
  );

  // ── Load all data ───────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [tourRes, catRes, tagRes, cityRes, langRes, transRes] =
          await Promise.all([
            catalogApi.getTourById(id),
            catalogApi.listCategories({ pageSize: '200' }),
            catalogApi.listTags({ pageSize: '200' }),
            referenceDataApi.listCities({ pageSize: '200' }),
            referenceDataApi.listLanguages({ pageSize: '200' }),
            catalogApi.getTourTranslations(id),
          ]);

        setTitle(tourRes.title || '');
        setSlug(tourRes.slug || '');
        setShortDescription(tourRes.shortDescription || '');
        setFullDescription(tourRes.fullDescription || '');
        setCityId(tourRes.cityId || '');
        setMeetingPoint(tourRes.meetingPoint || '');
        setDurationMinutes(
          tourRes.durationMinutes ? String(tourRes.durationMinutes) : '',
        );
        setMaxGroupSize(
          tourRes.maxGroupSize ? String(tourRes.maxGroupSize) : '',
        );
        setStatus(tourRes.status || 'DRAFT');

        setAvailableLanguagesText((tourRes.availableLanguages || []).join('\n'));
        setWhatToBringText(((tourRes.whatToBring as string[]) || []).join('\n'));
        setImportantInfoText(((tourRes.importantInfo as string[]) || []).join('\n'));
        setAllowPayLater(tourRes.allowPayLater ?? false);
        setDefaultLanguageCode(tourRes.defaultLanguageCode || '');

        // Cancellation policy
        const cp = typeof tourRes.cancellationPolicy === 'string'
          ? (() => { try { return JSON.parse(tourRes.cancellationPolicy); } catch { return {}; } })()
          : (tourRes.cancellationPolicy || {});
        setCancelType(cp.type || 'FREE');
        setCancelHours(String(cp.freeCancelHoursBefore ?? 24));

        // Media
        setMedia((tourRes.media || []) as TourMedia[]);

        // Itinerary
        const itineraryStops = tourRes.itinerary || [];
        setItinerary(itineraryStops.sort((a: TourItineraryStop, b: TourItineraryStop) => a.stopOrder - b.stopOrder));

        // Categories & tags
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = tourRes as any;
        const catIds = (res.categories || []).map(
          (c: { categoryId: string }) => c.categoryId,
        );
        setSelectedCategoryIds(catIds);
        const tagIds = (res.tags || []).map(
          (tg: { tagId: string }) => tg.tagId,
        );
        setSelectedTagIds(tagIds);

        // Tour options
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts = ((tourRes as any).tourOptions || tourRes.options || []).map(
          (o: {
            id: string;
            name?: string;
            title?: string;
            description?: string;
            maxParticipants?: number;
            isActive: boolean;
          }) => ({
            id: o.id,
            name: o.name || o.title || '',
            description: o.description || '',
            maxParticipants: o.maxParticipants,
            isActive: o.isActive,
          }),
        );
        setTourOptions(opts);

        setCategories(catRes.data || []);
        setTags(tagRes.data || []);
        setCities(cityRes.data || []);
        setLanguages(langRes.data || []);

        // Translations
        const translations: TourTranslation[] = transRes || [];
        const tabCodes = translations.map((tr) => tr.languageCode);
        setTranslationTabs(tabCodes);

        const forms: Record<string, TranslationFormData> = {};
        for (const tr of translations) {
          forms[tr.languageCode] = translationToForm(tr);
        }
        setTranslationForms(forms);
      } catch (err) {
        console.error('Failed to load tour data', err);
        showMessage('error', t('cannotLoadTour'));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, showMessage]);

  // ── Departure slot helpers ───────────────────────────────────────
  const loadDepSummary = useCallback(async (optionId: string) => {
    setDepLoading(prev => ({ ...prev, [optionId]: true }));
    try {
      const deps = await catalogApi.listDepartureSlots(optionId);
      setDepSummary(prev => ({
        ...prev,
        [optionId]: { total: deps.length, active: deps.filter(d => d.status === 'ACTIVE').length },
      }));
    } catch { /* ignore */ }
    setDepLoading(prev => ({ ...prev, [optionId]: false }));
  }, []);

  useEffect(() => {
    tourOptions.filter(o => o.id && !o.id.startsWith('new-')).forEach(o => {
      if (!depSummary[o.id!]) loadDepSummary(o.id!);
    });
  }, [tourOptions, loadDepSummary, depSummary]);

  const handleBulkGenerate = async (optionId: string) => {
    const startEl = document.getElementById(`dep-start-${optionId}`) as HTMLInputElement;
    const endEl = document.getElementById(`dep-end-${optionId}`) as HTMLInputElement;
    const timesEl = document.getElementById(`dep-times-${optionId}`) as HTMLInputElement;
    const capEl = document.getElementById(`dep-cap-${optionId}`) as HTMLInputElement;
    if (!startEl?.value || !endEl?.value || !timesEl?.value) {
      showMessage('error', t('fillAllFields'));
      return;
    }
    const times = timesEl.value.split(',').map(s => s.trim()).filter(Boolean);
    if (times.length === 0) return;
    try {
      const result = await catalogApi.bulkGenerateDepartures(optionId, {
        startDate: startEl.value,
        endDate: endEl.value,
        times,
        totalCapacity: Number(capEl?.value) || 20,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
      showMessage('success', t('departuresGenerated', { created: result.created, skipped: result.skipped }));
      loadDepSummary(optionId);
    } catch {
      showMessage('error', t('departureAddError'));
    }
  };

  // ── Save default tab ────────────────────────────────────────────
  const handleSaveDefault = async () => {
    setSaving(true);
    try {
      await catalogApi.updateTour(id, {
        title,
        slug,
        shortDescription: shortDescription || undefined,
        fullDescription: fullDescription || undefined,
        cityId: cityId || undefined,
        meetingPoint: meetingPoint || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        maxGroupSize: maxGroupSize ? Number(maxGroupSize) : undefined,
        status: status as 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED',
        availableLanguages: availableLanguagesText
          ? availableLanguagesText.split('\n').map(s => s.trim()).filter(Boolean)
          : undefined,
        whatToBring: whatToBringText
          ? whatToBringText.split('\n').filter(Boolean)
          : undefined,
        importantInfo: importantInfoText
          ? importantInfoText.split('\n').filter(Boolean)
          : undefined,
        allowPayLater,
        defaultLanguageCode: defaultLanguageCode || undefined,
        cancellationPolicy: cancelType === 'NONE'
          ? { type: 'NONE' }
          : { type: cancelType, freeCancelHoursBefore: Number(cancelHours) || 24 },
      });

      await Promise.all([
        catalogApi.setTourCategories(id, selectedCategoryIds),
        catalogApi.setTourTags(id, selectedTagIds),
      ]);

      // Save tour options — create new ones, update existing ones
      const optionPromises = tourOptions.map(async (opt) => {
        if (opt.id) {
          // Update existing option
          return catalogApi.updateTourOption(opt.id, {
            title: opt.name,
            description: opt.description || undefined,
            maxParticipants: opt.maxParticipants,
            isActive: opt.isActive,
          });
        } else if (opt.name.trim()) {
          // Create new option
          return catalogApi.createTourOption(id, {
            code: opt.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            title: opt.name,
            description: opt.description || undefined,
            maxParticipants: opt.maxParticipants,
            isActive: opt.isActive,
          });
        }
      });
      await Promise.all(optionPromises);

      // Delete removed options
      for (const deletedId of deletedOptionIds) {
        try {
          await catalogApi.updateTourOption(deletedId, { isActive: false });
        } catch { /* option may already be deleted */ }
      }
      setDeletedOptionIds([]);

      showMessage('success', t('tourSavedSuccess'));
    } catch (err) {
      if (err instanceof ApiError) {
        showMessage('error', `${tc('errorGeneric')}: ${err.statusText}`);
      } else {
        showMessage('error', t('tourSaveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Save translation tab ────────────────────────────────────────
  const handleSaveTranslation = async (langCode: string) => {
    const form = translationForms[langCode];
    if (!form) return;
    if (!form.title.trim()) {
      showMessage('error', t('translationTitleRequired'));
      return;
    }
    setSaving(true);
    try {
      const data = formToTranslation(langCode, form);
      await catalogApi.upsertTourTranslation(id, {
        tourId: id,
        ...data,
      } as TourTranslation);
      showMessage('success', t('translationSavedSuccess'));
    } catch (err) {
      if (err instanceof ApiError) {
        showMessage('error', `${tc('errorGeneric')}: ${err.statusText}`);
      } else {
        showMessage('error', t('translationSaveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Language tab management ─────────────────────────────────────
  const addLanguageTab = (langCode: string) => {
    if (translationTabs.includes(langCode)) {
      setActiveTab(langCode);
      return;
    }
    setTranslationTabs((prev) => [...prev, langCode]);
    setTranslationForms((prev) => ({
      ...prev,
      [langCode]: { ...EMPTY_TRANSLATION },
    }));
    setActiveTab(langCode);
    setShowLanguagePicker(false);
  };

  const removeLanguageTab = async (langCode: string) => {
    const lang = languages.find((l) => l.code === langCode);
    const langName = lang?.name || langCode;
    if (!confirm(t('confirmDeleteTranslation', { name: langName }))) return;

    try {
      await catalogApi.deleteTourTranslation(id, langCode);
    } catch {
      // May not exist in DB yet
    }

    setTranslationTabs((prev) => prev.filter((c) => c !== langCode));
    setTranslationForms((prev) => {
      const next = { ...prev };
      delete next[langCode];
      return next;
    });
    setActiveTab('default');
    showMessage('success', t('translationDeleted', { name: langName }));
  };

  const updateTranslationField = (
    langCode: string,
    field: keyof TranslationFormData,
    value: string,
  ) => {
    setTranslationForms((prev) => ({
      ...prev,
      [langCode]: { ...prev[langCode], [field]: value },
    }));
  };

  const availableTranslationLanguages = languages.filter(
    (l) => !translationTabs.includes(l.code) && l.code !== defaultLanguageCode,
  );

  // ── Media CRUD ──────────────────────────────────────────────────
  const handleMediaUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      showMessage('error', 'File too large (max 10MB)');
      return;
    }
    setMediaUploading(true);
    try {
      const cdnUrl = await uploadsApi.uploadFile(file, 'tour-media');
      const newMedia = await catalogApi.addTourMedia(id, {
        url: cdnUrl,
        mediaType: 'IMAGE',
        sortOrder: media.length,
        isCover: media.length === 0,
      });
      setMedia((prev) => [...prev, newMedia as unknown as TourMedia]);
      showMessage('success', t('mediaAdded'));
    } catch {
      showMessage('error', t('cannotAddMedia'));
    } finally {
      setMediaUploading(false);
    }
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    (async () => {
      for (let i = 0; i < files.length; i++) {
        await handleMediaUpload(files[i]);
      }
    })();
    e.target.value = '';
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    (async () => {
      for (let i = 0; i < files.length; i++) {
        await handleMediaUpload(files[i]);
      }
    })();
  };

  const setMediaCover = async (mediaId: string) => {
    try {
      await catalogApi.updateTourMedia(mediaId, { isCover: true });
      setMedia((prev) => prev.map((m) => ({ ...m, isCover: m.id === mediaId })));
      showMessage('success', t('mediaUpdated'));
    } catch {
      showMessage('error', t('cannotUpdateMedia'));
    }
  };

  const updateMediaAltText = async (mediaId: string, altText: string) => {
    try {
      await catalogApi.updateTourMedia(mediaId, { altText });
      setMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, altText } : m)));
    } catch {
      showMessage('error', t('cannotUpdateMedia'));
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm(t('confirmDeleteMedia'))) return;
    try {
      await catalogApi.deleteTourMedia(mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      showMessage('success', t('mediaDeleted'));
    } catch {
      showMessage('error', t('cannotDeleteMedia'));
    }
  };

  // ── Itinerary CRUD ──────────────────────────────────────────────
  const addItineraryStop = async () => {
    setItineraryLoading(true);
    try {
      const newStop = await catalogApi.createItineraryStop(id, {
        stopOrder: itinerary.length + 1,
        title: `Stop ${itinerary.length + 1}`,
      });
      setItinerary((prev) => [...prev, newStop]);
      showMessage('success', t('stopAdded'));
    } catch {
      showMessage('error', t('cannotAddStop'));
    } finally {
      setItineraryLoading(false);
    }
  };

  const updateItineraryStop = async (stopId: string, data: Partial<TourItineraryStop>) => {
    try {
      const updated = await catalogApi.updateItineraryStop(stopId, data);
      setItinerary((prev) => prev.map((s) => (s.id === stopId ? updated : s)));
    } catch {
      showMessage('error', t('cannotUpdateStop'));
    }
  };

  const deleteItineraryStop = async (stopId: string) => {
    if (!confirm(t('confirmDeleteStop'))) return;
    try {
      await catalogApi.deleteItineraryStop(stopId);
      setItinerary((prev) => prev.filter((s) => s.id !== stopId));
      showMessage('success', t('stopDeleted'));
    } catch {
      showMessage('error', t('cannotDeleteStop'));
    }
  };

  const moveItineraryStop = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= itinerary.length) return;
    const newOrder = [...itinerary];
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    try {
      await Promise.all([
        catalogApi.updateItineraryStop(newOrder[index].id, { stopOrder: index + 1 }),
        catalogApi.updateItineraryStop(newOrder[target].id, { stopOrder: target + 1 }),
      ]);
      setItinerary(newOrder.map((s, i) => ({ ...s, stopOrder: i + 1 })));
    } catch {
      showMessage('error', t('cannotReorderStops'));
    }
  };

  // ── Handle form submit ──────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'default') {
      handleSaveDefault();
    } else {
      handleSaveTranslation(activeTab);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 dark:text-gray-400">{tc('loading')}</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/profile/supplier/tours')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('editTourTitle')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {title || t('noTitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Language Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('default')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'default'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('defaultTab')}{defaultLanguageCode ? ` (${languages.find(l => l.code === defaultLanguageCode)?.name || defaultLanguageCode})` : ''}
          {activeTab === 'default' && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        {translationTabs.map((code) => {
          const lang = languages.find((l) => l.code === code);
          const isActive = activeTab === code;
          return (
            <div key={code} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => setActiveTab(code)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <RiGlobalLine className="h-3.5 w-3.5" />
                {lang?.name || code}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLanguageTab(code);
                }}
                className="absolute -right-1 -top-1 hidden rounded-full bg-red-100 p-0.5 text-red-600 hover:bg-red-200 group-hover:block dark:bg-red-900/30 dark:text-red-400"
                title={t('deleteTranslation')}
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </div>
          );
        })}

        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setShowLanguagePicker(!showLanguagePicker)}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <RiAddLine className="h-4 w-4" />
            {t('addLanguage')}
          </button>

          {showLanguagePicker && availableTranslationLanguages.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-60 min-w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {availableTranslationLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => addLanguageTab(lang.code)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <RiGlobalLine className="h-4 w-4 text-gray-400" />
                  {lang.name}
                  <span className="ml-auto text-xs text-gray-400">{lang.code}</span>
                </button>
              ))}
            </div>
          )}

          {showLanguagePicker && availableTranslationLanguages.length === 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('allLanguagesAdded')}</p>
            </div>
          )}
        </div>
      </div>

      {showLanguagePicker && (
        <div className="fixed inset-0 z-10" onClick={() => setShowLanguagePicker(false)} />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ═══════════════ DEFAULT TAB ═══════════════ */}
        {activeTab === 'default' && (
          <>
            {/* Basic Information */}
            <Card>
              <CardHeader title={tc('basicInfo')} description={t('basicInfoDesc')} />
              <div className="space-y-4">
                <Input
                  label={t('labelTitle')}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSlug(generateSlug(e.target.value));
                  }}
                  placeholder={t('placeholderTitle')}
                  required
                />
                <Input
                  label={tc('slug')}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="tour-slug"
                  required
                />
                <Select
                  label={t('labelDefaultLanguage')}
                  value={defaultLanguageCode}
                  onChange={(e) => setDefaultLanguageCode(e.target.value)}
                  options={languages.map((l) => ({ value: l.code, label: l.name }))}
                  placeholder={t('placeholderDefaultLanguage')}
                />
                <Textarea
                  label={t('labelShortDesc')}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder={t('placeholderShortDesc')}
                  rows={3}
                />
                <Textarea
                  label={t('labelFullDesc')}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder={t('placeholderFullDesc')}
                  rows={6}
                />
              </div>
            </Card>

            {/* Location & Settings */}
            <Card>
              <CardHeader title={t('locationSettings')} description={t('locationSettingsDesc')} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label={t('labelCity')}
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  options={cities.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder={t('placeholderCity')}
                />
                <Input
                  label={t('labelMeetingPoint')}
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder={t('placeholderMeetingPoint')}
                />
                <Input
                  label={t('labelDuration')}
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="120"
                  min={1}
                />
                <Input
                  label={t('labelMaxGroupSize')}
                  type="number"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(e.target.value)}
                  placeholder="20"
                  min={1}
                />
              </div>
            </Card>

            {/* Categories & Tags */}
            <Card>
              <CardHeader title={t('categoriesAndTags')} description={t('categoriesAndTagsDesc')} />
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('categoriesTitle')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const selected = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            setSelectedCategoryIds((prev) =>
                              selected ? prev.filter((x) => x !== cat.id) : [...prev, cat.id],
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                    {categories.length === 0 && (
                      <p className="text-sm text-gray-500">{t('noCategories')}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('tagsTitle')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            setSelectedTagIds((prev) =>
                              selected ? prev.filter((x) => x !== tag.id) : [...prev, tag.id],
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                    {tags.length === 0 && (
                      <p className="text-sm text-gray-500">{t('noTags')}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tour Options */}
            <Card>
              <CardHeader
                title={t('tourOptions')}
                description={t('tourOptionsDesc')}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTourOptions((prev) => [
                        ...prev,
                        { name: '', description: '', isActive: true },
                      ])
                    }
                  >
                    <RiAddLine className="h-4 w-4" />
                    {t('addOption')}
                  </Button>
                }
              />
              {tourOptions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noOptionsHint')}</p>
              ) : (
                <div className="space-y-4">
                  {tourOptions.map((opt, idx) => (
                    <div
                      key={opt.id || `new-${idx}`}
                      className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('optionNumber', { number: idx + 1 })}
                          {opt.id && (
                            <span className="ml-2 text-xs text-gray-400">({t('saved')})</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (opt.id) {
                              setDeletedOptionIds((prev) => [...prev, opt.id!]);
                            }
                            setTourOptions((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-500 hover:text-red-700"
                          title={tc('delete')}
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          label={tc('name')}
                          value={opt.name}
                          onChange={(e) => {
                            const next = [...tourOptions];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setTourOptions(next);
                          }}
                          placeholder={t('optionNamePlaceholder')}
                        />
                        <Input
                          label={t('maxParticipants')}
                          type="number"
                          value={opt.maxParticipants ?? ''}
                          onChange={(e) => {
                            const next = [...tourOptions];
                            next[idx] = {
                              ...next[idx],
                              maxParticipants: e.target.value ? Number(e.target.value) : undefined,
                            };
                            setTourOptions(next);
                          }}
                          placeholder="20"
                          min={1}
                        />
                      </div>
                      <div className="mt-3">
                        <Textarea
                          label={tc('description')}
                          value={opt.description ?? ''}
                          onChange={(e) => {
                            const next = [...tourOptions];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setTourOptions(next);
                          }}
                          placeholder={t('optionDescPlaceholder')}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Departure Slots */}
            <Card>
              <CardHeader
                title={t('departureSlots')}
                description={t('departureSlotsDesc')}
              />
              {tourOptions.filter(o => o.id && !o.id.startsWith('new-')).length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">{t('saveOptionsFirst')}</p>
              ) : (
                <div className="space-y-4 px-6 pb-6">
                  {tourOptions.filter(o => o.id && !o.id.startsWith('new-')).map((opt) => {
                    const summary = depSummary[opt.id!];
                    const isLoading = depLoading[opt.id!];
                    const today = new Date().toISOString().split('T')[0];
                    const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
                    return (
                      <div key={opt.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{opt.name || t('untitledOption')}</h4>
                          {isLoading ? (
                            <span className="text-xs text-muted-foreground">{tc('loading')}…</span>
                          ) : summary ? (
                            <span className="text-xs text-muted-foreground">
                              {t('depSummary', { total: summary.total, active: summary.active })}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <label className="text-xs font-medium">{t('fromDate')}</label>
                            <Input type="date" id={`dep-start-${opt.id}`} defaultValue={today} className="w-40" />
                          </div>
                          <div>
                            <label className="text-xs font-medium">{t('toDate')}</label>
                            <Input type="date" id={`dep-end-${opt.id}`} defaultValue={in14} className="w-40" />
                          </div>
                          <div>
                            <label className="text-xs font-medium">{t('departureTimes')}</label>
                            <Input type="text" id={`dep-times-${opt.id}`} defaultValue="09:00, 14:00" placeholder="09:00, 14:00" className="w-36" />
                          </div>
                          <div>
                            <label className="text-xs font-medium">{t('capacity')}</label>
                            <Input type="number" id={`dep-cap-${opt.id}`} min={1} defaultValue={20} className="w-24" />
                          </div>
                          <Button type="button" size="sm" onClick={() => handleBulkGenerate(opt.id!)}>
                            {t('generate')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Tour Media */}
            <Card>
              <CardHeader
                title={t('tourMedia')}
                description={t('tourMediaDesc')}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('tour-media-input') as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={mediaUploading}
                  >
                    <RiAddLine className="h-4 w-4" />
                    {t('addImage')}
                  </Button>
                }
              />
              <input
                id="tour-media-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                multiple
                onChange={handleMediaFileChange}
                className="hidden"
              />

              {media.length === 0 && !mediaUploading ? (
                <div
                  onDrop={handleMediaDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => {
                    const input = document.getElementById('tour-media-input') as HTMLInputElement;
                    input?.click();
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-10 transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
                >
                  <RiImageAddLine className="mb-2 h-10 w-10 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('noMediaHint')}</span>
                  <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    JPEG, PNG, WebP, AVIF, GIF — max 10MB
                  </span>
                </div>
              ) : (
                <div onDrop={handleMediaDrop} onDragOver={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {media.map((m) => (
                      <div
                        key={m.id}
                        className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                          <img
                            src={m.url}
                            alt={m.altText || ''}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).className = 'hidden';
                            }}
                          />
                          {m.isCover && (
                            <span className="absolute left-1.5 top-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {t('isCover')}
                            </span>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                            {!m.isCover && (
                              <button
                                type="button"
                                onClick={() => setMediaCover(m.id)}
                                className="rounded-lg bg-white/90 p-1.5 text-yellow-600 shadow hover:bg-white"
                                title={t('setCover')}
                              >
                                <RiStarLine className="h-4 w-4" />
                              </button>
                            )}
                            {m.isCover && (
                              <span className="rounded-lg bg-white/90 p-1.5 text-yellow-500 shadow">
                                <RiStarFill className="h-4 w-4" />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteMedia(m.id)}
                              className="rounded-lg bg-white/90 p-1.5 text-red-600 shadow hover:bg-white"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="px-2 py-1.5">
                          <input
                            type="text"
                            value={m.altText || ''}
                            onChange={(e) =>
                              setMedia((prev) =>
                                prev.map((item) =>
                                  item.id === m.id ? { ...item, altText: e.target.value } : item,
                                ),
                              )
                            }
                            onBlur={() => updateMediaAltText(m.id, m.altText || '')}
                            placeholder={t('placeholderAltText')}
                            className="w-full border-0 bg-transparent p-0 text-xs text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-0 dark:text-gray-300 dark:placeholder-gray-500"
                          />
                        </div>
                      </div>
                    ))}

                    <div
                      onClick={() => {
                        const input = document.getElementById('tour-media-input') as HTMLInputElement;
                        input?.click();
                      }}
                      className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
                    >
                      {mediaUploading ? (
                        <RiUploadCloud2Line className="h-8 w-8 animate-pulse text-blue-500" />
                      ) : (
                        <>
                          <RiImageAddLine className="mb-1 h-6 w-6 text-gray-400" />
                          <span className="text-xs text-gray-400">{t('addImage')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Publishing */}
            <Card>
              <CardHeader title={t('publishing')} description={t('publishingDesc')} />
              <div className="space-y-4">
                <Select
                  label={tc('status')}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'DRAFT', label: t('statusDraft') },
                    { value: 'PUBLISHED', label: t('statusPublished') },
                    { value: 'PAUSED', label: t('statusPaused') },
                    { value: 'ARCHIVED', label: t('statusArchived') },
                  ]}
                />
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allowPayLater"
                    checked={allowPayLater}
                    onChange={(e) => setAllowPayLater(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="allowPayLater" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('labelPayLater')}
                  </label>
                </div>
              </div>
            </Card>

            {/* Cancellation Policy */}
            <Card>
              <CardHeader title={t('cancellationPolicy')} description={t('cancellationPolicyDesc')} />
              <div className="space-y-4">
                <Select
                  label={t('cancelType')}
                  value={cancelType}
                  onChange={(e) => setCancelType(e.target.value)}
                  options={[
                    { value: 'FREE', label: t('cancelTypeFree') },
                    { value: 'PARTIAL', label: t('cancelTypePartial') },
                    { value: 'NONE', label: t('cancelTypeNone') },
                  ]}
                />
                {cancelType !== 'NONE' && (
                  <Input
                    label={t('cancelHoursBefore')}
                    type="number"
                    value={cancelHours}
                    onChange={(e) => setCancelHours(e.target.value)}
                    placeholder="24"
                    min={1}
                  />
                )}
              </div>
            </Card>

            {/* Content details */}
            <Card>
              <CardHeader title={t('contentDetails')} description={t('contentDetailsDesc')} />
              <div className="space-y-4">
                <Textarea
                  label={t('labelAvailableLanguages')}
                  value={availableLanguagesText}
                  onChange={(e) => setAvailableLanguagesText(e.target.value)}
                  placeholder={'English\nFrench\nVietnamese'}
                  rows={3}
                />
                <Textarea
                  label={t('labelWhatToBring')}
                  value={whatToBringText}
                  onChange={(e) => setWhatToBringText(e.target.value)}
                  placeholder={'Passport or ID card\nSunscreen\nComfortable shoes'}
                  rows={3}
                />
                <Textarea
                  label={t('labelImportantInfo')}
                  value={importantInfoText}
                  onChange={(e) => setImportantInfoText(e.target.value)}
                  placeholder={'Not suitable for pregnant women\nMinimum age: 18'}
                  rows={3}
                />
              </div>
            </Card>

            {/* Itinerary */}
            <Card>
              <CardHeader
                title={t('itinerary')}
                description={t('itineraryDesc')}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItineraryStop}
                    disabled={itineraryLoading}
                  >
                    <RiAddLine className="h-4 w-4" />
                    {t('addStop')}
                  </Button>
                }
              />
              {itinerary.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noStopsHint')}</p>
              ) : (
                <div className="space-y-4">
                  {itinerary.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('stopNumber', { number: idx + 1 })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItineraryStop(idx, 'up')}
                            disabled={idx === 0}
                            className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <RiArrowUpLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItineraryStop(idx, 'down')}
                            disabled={idx === itinerary.length - 1}
                            className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <RiArrowDownLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItineraryStop(stop.id)}
                            className="rounded p-1 text-red-500 hover:text-red-700"
                          >
                            <RiDeleteBinLine className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          label={t('labelTitle')}
                          value={stop.title}
                          onChange={(e) =>
                            setItinerary((prev) =>
                              prev.map((s) =>
                                s.id === stop.id ? { ...s, title: e.target.value } : s,
                              ),
                            )
                          }
                          onBlur={() => updateItineraryStop(stop.id, { title: stop.title })}
                          placeholder={t('stopNamePlaceholder')}
                        />
                        <Input
                          label={t('labelDurationMinutes')}
                          type="number"
                          value={stop.durationMinutes ?? ''}
                          onChange={(e) =>
                            setItinerary((prev) =>
                              prev.map((s) =>
                                s.id === stop.id
                                  ? { ...s, durationMinutes: e.target.value ? Number(e.target.value) : undefined }
                                  : s,
                              ),
                            )
                          }
                          onBlur={() =>
                            updateItineraryStop(stop.id, { durationMinutes: stop.durationMinutes })
                          }
                          placeholder="75"
                          min={1}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Select
                          label={t('labelTransportMode')}
                          value={stop.transportMode || ''}
                          onChange={(e) => {
                            const val = e.target.value || undefined;
                            setItinerary((prev) =>
                              prev.map((s) =>
                                s.id === stop.id ? { ...s, transportMode: val } : s,
                              ),
                            );
                            updateItineraryStop(stop.id, { transportMode: val });
                          }}
                          options={[
                            { value: '', label: t('transportNone') },
                            { value: 'WALK', label: t('transportWalk') },
                            { value: 'VAN', label: t('transportVan') },
                            { value: 'BUS', label: t('transportBus') },
                            { value: 'BOAT', label: t('transportBoat') },
                            { value: 'CAR', label: t('transportCar') },
                            { value: 'TRAIN', label: t('transportTrain') },
                          ]}
                        />
                        <Input
                          label={t('labelTransportDuration')}
                          type="number"
                          value={stop.transportDurationMinutes ?? ''}
                          onChange={(e) =>
                            setItinerary((prev) =>
                              prev.map((s) =>
                                s.id === stop.id
                                  ? { ...s, transportDurationMinutes: e.target.value ? Number(e.target.value) : undefined }
                                  : s,
                              ),
                            )
                          }
                          onBlur={() =>
                            updateItineraryStop(stop.id, { transportDurationMinutes: stop.transportDurationMinutes })
                          }
                          placeholder="15"
                          min={1}
                        />
                      </div>
                      <div className="mt-3">
                        <Textarea
                          label={tc('description')}
                          value={stop.description ?? ''}
                          onChange={(e) =>
                            setItinerary((prev) =>
                              prev.map((s) =>
                                s.id === stop.id ? { ...s, description: e.target.value } : s,
                              ),
                            )
                          }
                          onBlur={() => updateItineraryStop(stop.id, { description: stop.description })}
                          placeholder={t('stopDescPlaceholder')}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ═══════════════ TRANSLATION TABS ═══════════════ */}
        {activeTab !== 'default' && translationForms[activeTab] && (
          <>
            {(() => {
              const langCode = activeTab;
              const lang = languages.find((l) => l.code === langCode);
              const form = translationForms[langCode];
              return (
                <Card>
                  <CardHeader
                    title={t('translationTitle', { name: lang?.name || langCode })}
                    description={t('translationDesc')}
                    action={
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeLanguageTab(langCode)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                        {t('deleteTranslation')}
                      </Button>
                    }
                  />
                  <div className="space-y-4">
                    <Input
                      label={t('labelTitle')}
                      value={form.title}
                      onChange={(e) => updateTranslationField(langCode, 'title', e.target.value)}
                      placeholder="Translated title"
                      required
                    />
                    <Textarea
                      label={t('labelShortDesc')}
                      value={form.shortDescription}
                      onChange={(e) => updateTranslationField(langCode, 'shortDescription', e.target.value)}
                      placeholder="Short description translation"
                      rows={3}
                    />
                    <Textarea
                      label={t('labelFullDesc')}
                      value={form.fullDescription}
                      onChange={(e) => updateTranslationField(langCode, 'fullDescription', e.target.value)}
                      placeholder="Full description translation"
                      rows={6}
                    />
                    <Textarea
                      label={t('labelHighlights')}
                      value={form.highlightsText}
                      onChange={(e) => updateTranslationField(langCode, 'highlightsText', e.target.value)}
                      placeholder={'Highlight 1\nHighlight 2\nHighlight 3'}
                      rows={4}
                    />
                    <Textarea
                      label={t('labelIncludedItems')}
                      value={form.includedItemsText}
                      onChange={(e) => updateTranslationField(langCode, 'includedItemsText', e.target.value)}
                      placeholder={'Included item 1\nIncluded item 2'}
                      rows={4}
                    />
                    <Textarea
                      label={t('labelExcludedItems')}
                      value={form.excludedItemsText}
                      onChange={(e) => updateTranslationField(langCode, 'excludedItemsText', e.target.value)}
                      placeholder={'Excluded item 1\nExcluded item 2'}
                      rows={4}
                    />
                    <Textarea
                      label={t('labelWhatToBring')}
                      value={form.whatToBringText}
                      onChange={(e) => updateTranslationField(langCode, 'whatToBringText', e.target.value)}
                      placeholder={'Passport or ID card\nSunscreen'}
                      rows={3}
                    />
                    <Textarea
                      label={t('labelImportantInfo')}
                      value={form.importantInfoText}
                      onChange={(e) => updateTranslationField(langCode, 'importantInfoText', e.target.value)}
                      placeholder={'Not suitable for pregnant women\nMinimum age: 18'}
                      rows={3}
                    />
                  </div>
                </Card>
              );
            })()}
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/profile/supplier/tours')}
          >
            {tc('cancel')}
          </Button>
          <Button type="submit" isLoading={saving}>
            <RiSaveLine className="h-4 w-4" />
            {activeTab === 'default' ? t('saveTour') : t('saveTranslation')}
          </Button>
        </div>
      </form>
    </div>
  );
}
