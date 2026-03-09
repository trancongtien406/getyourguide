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
    type Category,
    type City,
    type Language,
    type Tag,
    type TourStatus,
} from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiArrowDownLine,
    RiArrowLeftLine,
    RiArrowUpLine,
    RiDeleteBinLine,
    RiImageLine,
    RiSaveLine,
} from 'react-icons/ri';

// ─── Types ───────────────────────────────────────────────────────────

interface TourOption {
  name: string;
  description?: string;
  maxParticipants?: number;
  isActive: boolean;
}

interface ItineraryStopDraft {
  _key: number;
  title: string;
  description: string;
  durationMinutes?: number;
  transportMode?: string;
  transportDurationMinutes?: number;
}

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

// ─── Component ───────────────────────────────────────────────────────

export default function NewTourPage() {
  const router = useRouter();
  const t = useTranslations('catalog');
  const tc = useTranslations('common');

  // ── Main tour form state ────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [cityId, setCityId] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [maxGroupSize, setMaxGroupSize] = useState('');
  const [status, setStatus] = useState<TourStatus>('DRAFT');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);

  // ── New fields ──────────────────────────────────────────────────
  const [availableLanguagesText, setAvailableLanguagesText] = useState('');
  const [whatToBringText, setWhatToBringText] = useState('');
  const [importantInfoText, setImportantInfoText] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [badgeText, setBadgeText] = useState('');
  const [allowPayLater, setAllowPayLater] = useState(false);
  const [defaultLanguageCode, setDefaultLanguageCode] = useState('');
  const [cancelType, setCancelType] = useState('FREE');
  const [cancelHours, setCancelHours] = useState('24');

  // ── Itinerary (local drafts) ─────────────────────────────────────
  const [itinerary, setItinerary] = useState<ItineraryStopDraft[]>([]);
  const [itineraryKeySeq, setItineraryKeySeq] = useState(0);

  const addItineraryStop = () => {
    const key = itineraryKeySeq + 1;
    setItineraryKeySeq(key);
    setItinerary((prev) => [
      ...prev,
      { _key: key, title: `Stop ${prev.length + 1}`, description: '' },
    ]);
  };

  const moveItineraryStop = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= itinerary.length) return;
    const next = [...itinerary];
    [next[index], next[target]] = [next[target], next[index]];
    setItinerary(next);
  };

  // ── Reference data ──────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  // ── UI state ────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // ── Show message with auto-dismiss ──────────────────────────────
  const showMessage = useCallback(
    (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 4000);
    },
    [],
  );

  // ── Load reference data ─────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, tagRes, cityRes, langRes] = await Promise.all([
          catalogApi.listCategories({ pageSize: '200' }),
          catalogApi.listTags({ pageSize: '200' }),
          referenceDataApi.listCities({ pageSize: '200' }),
          referenceDataApi.listLanguages({ pageSize: '200' }),
        ]);
        setCategories(catRes.data || []);
        setTags(tagRes.data || []);
        setCities(cityRes.data || []);
        setLanguages(langRes.data || []);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      }
    }
    loadData();
  }, []);

  // ── Handle form submit ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId.trim()) {
      showMessage('error', t('validationSupplierId'));
      return;
    }
    if (!cityId) {
      showMessage('error', t('validationCity'));
      return;
    }

    setSaving(true);
    try {
      const tourPayload = {
        supplierId,
        cityId,
        title,
        slug,
        shortDescription: shortDescription || undefined,
        fullDescription: fullDescription || undefined,
        meetingPoint: meetingPoint || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        maxGroupSize: maxGroupSize ? Number(maxGroupSize) : undefined,
        status,
        availableLanguages: availableLanguagesText
          ? availableLanguagesText.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
        whatToBring: whatToBringText
          ? whatToBringText.split('\n').filter(Boolean)
          : undefined,
        importantInfo: importantInfoText
          ? importantInfoText.split('\n').filter(Boolean)
          : undefined,
        isFeatured,
        badgeText: badgeText || undefined,
        allowPayLater,
        defaultLanguageCode: defaultLanguageCode || undefined,
        cancellationPolicy: cancelType === 'NONE'
          ? { type: 'NONE' }
          : { type: cancelType, freeCancelHoursBefore: Number(cancelHours) || 24 },
      };

      const tour = await catalogApi.createTour(tourPayload);

      // Categories
      if (selectedCategoryIds.length > 0) {
        await catalogApi.setTourCategories(tour.id, selectedCategoryIds);
      }

      // Tags
      if (selectedTagIds.length > 0) {
        await catalogApi.setTourTags(tour.id, selectedTagIds);
      }

      // Tour options
      for (const opt of tourOptions) {
        await catalogApi.createTourOption(tour.id, {
          code: generateSlug(opt.name),
          title: opt.name,
          description: opt.description,
          maxParticipants: opt.maxParticipants,
          isActive: opt.isActive,
        });
      }

      // Itinerary stops
      for (let i = 0; i < itinerary.length; i++) {
        const stop = itinerary[i];
        await catalogApi.createItineraryStop(tour.id, {
          stopOrder: i + 1,
          title: stop.title,
          description: stop.description || undefined,
          durationMinutes: stop.durationMinutes,
          transportMode: stop.transportMode || undefined,
          transportDurationMinutes: stop.transportDurationMinutes,
        });
      }

      // Redirect to edit page so user can add translations
      router.push(`/admin/catalog/tours/${tour.id}/edit`);
    } catch (err) {
      if (err instanceof ApiError) {
        showMessage(
          'error',
          (err.data as { message?: string })?.message || t('cannotCreateTour'),
        );
      } else {
        showMessage('error', t('createTourError'));
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/catalog/tours')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RiArrowLeftLine className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('newTourTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('newTourSubtitle')}
          </p>
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader
            title={tc('basicInfo')}
            description={t('basicInfoDesc')}
          />
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
          <CardHeader
            title={t('locationSettings')}
            description={t('locationSettingsDesc')}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Supplier ID"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder={t('placeholderSupplierId')}
              required
            />
            <Select
              label={t('labelCity')}
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              options={cities.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder={t('placeholderCity')}
            />
            <Input
              label={t('labelMeetingPoint')}
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder={t('placeholderMeetingPoint')}
            />
            <div /> {/* spacer for grid */}
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
          <CardHeader
            title={t('categoriesAndTags')}
            description={t('categoriesAndTagsDesc')}
          />
          <div className="space-y-4">
            {/* Categories */}
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
                          selected
                            ? prev.filter((x) => x !== cat.id)
                            : [...prev, cat.id],
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
                  <p className="text-sm text-gray-500">
                    {t('noCategories')}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
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
                          selected
                            ? prev.filter((x) => x !== tag.id)
                            : [...prev, tag.id],
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
                  <p className="text-sm text-gray-500">{ t('noTags')}</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('noOptionsHint')}
            </p>
          ) : (
            <div className="space-y-4">
              {tourOptions.map((opt, idx) => (
                <div
                  key={`new-${idx}`}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('optionLabel', { index: idx + 1 })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTourOptions((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="text-red-500 hover:text-red-700"
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
                      placeholder={t('placeholderOptionName')}
                    />
                    <Input
                      label={t('labelMaxGroupSize')}
                      type="number"
                      value={opt.maxParticipants ?? ''}
                      onChange={(e) => {
                        const next = [...tourOptions];
                        next[idx] = {
                          ...next[idx],
                          maxParticipants: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        };
                        setTourOptions(next);
                      }}
                      placeholder="20"
                      min={1}
                    />
                  </div>
                  <div className="mt-3">
                    <Textarea
                      label={t('labelDescription')}
                      value={opt.description ?? ''}
                      onChange={(e) => {
                        const next = [...tourOptions];
                        next[idx] = {
                          ...next[idx],
                          description: e.target.value,
                        };
                        setTourOptions(next);
                      }}
                      placeholder={t('placeholderOptionDesc')}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
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
              onChange={(e) => setStatus(e.target.value as TourStatus)}
              options={[
                { value: 'DRAFT', label: t('statusDraft') },
                { value: 'PUBLISHED', label: t('statusPublished') },
                { value: 'PAUSED', label: t('statusPaused') },
                { value: 'ARCHIVED', label: t('statusArchived') },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="isFeatured"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t('labelFeatured')}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowPayLater"
                  checked={allowPayLater}
                  onChange={(e) => setAllowPayLater(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="allowPayLater"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t('labelPayLater')}
                </label>
              </div>
            </div>
            <Input
              label="Badge text"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="VD: Top rated, Best seller..."
            />
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

        {/* Tour Media (info) */}
        <Card>
          <CardHeader
            title={t('tourMedia')}
            description={t('tourMediaDesc')}
          />
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <RiImageLine className="h-5 w-5 flex-shrink-0" />
            {t('mediaAfterCreate')}
          </div>
        </Card>

        {/* Content Details */}
        <Card>
          <CardHeader
            title={t('contentDetails')}
            description={t('contentDetailsDesc')}
          />
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
              >
                <RiAddLine className="h-4 w-4" />
                {t('addStop')}
              </Button>
            }
          />
          {itinerary.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('noStopsHint')}
            </p>
          ) : (
            <div className="space-y-4">
              {itinerary.map((stop, idx) => (
                <div
                  key={stop._key}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('stopLabel', { index: idx + 1 })}
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
                        onClick={() =>
                          setItinerary((prev) => prev.filter((_, i) => i !== idx))
                        }
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
                      onChange={(e) => {
                        const next = [...itinerary];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setItinerary(next);
                      }}
                      placeholder={t('placeholderStopName')}
                    />
                    <Input
                      label={t('labelDurationMinutes')}
                      type="number"
                      value={stop.durationMinutes ?? ''}
                      onChange={(e) => {
                        const next = [...itinerary];
                        next[idx] = {
                          ...next[idx],
                          durationMinutes: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        };
                        setItinerary(next);
                      }}
                      placeholder="75"
                      min={1}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Select
                      label={t('labelTransport')}
                      value={stop.transportMode || ''}
                      onChange={(e) => {
                        const next = [...itinerary];
                        next[idx] = {
                          ...next[idx],
                          transportMode: e.target.value || undefined,
                        };
                        setItinerary(next);
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
                      onChange={(e) => {
                        const next = [...itinerary];
                        next[idx] = {
                          ...next[idx],
                          transportDurationMinutes: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        };
                        setItinerary(next);
                      }}
                      placeholder="15"
                      min={1}
                    />
                  </div>
                  <div className="mt-3">
                    <Textarea
                      label={t('labelDescription')}
                      value={stop.description}
                      onChange={(e) => {
                        const next = [...itinerary];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setItinerary(next);
                      }}
                      placeholder={t('placeholderStopDesc')}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/catalog/tours')}
          >
            {tc('cancel')}
          </Button>
          <Button type="submit" isLoading={saving}>
            <RiSaveLine className="h-4 w-4" />
            {t('createTour')}
          </Button>
        </div>
      </form>
    </div>
  );
}
