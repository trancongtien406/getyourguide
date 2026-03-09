'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import {
    ApiError,
    promotionsApi,
    type CreatePromotionData,
    type PromoScope,
    type Promotion,
    type PromoType,
} from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiCheckLine, RiCloseLine, RiEditLine, RiSearchLine } from 'react-icons/ri';

export default function PromotionsPage() {
  const t = useTranslations('promotions');
  const tc = useTranslations('common');

  const typeOptions = [
    { value: 'PERCENT', label: t('typePercent') },
    { value: 'FIXED_AMOUNT', label: t('typeFixedFull') },
  ];

  const typeFilterOptions = [
    { value: '', label: t('typeFilterAll') },
    { value: 'PERCENT', label: t('typePercent') },
    { value: 'FIXED_AMOUNT', label: t('typeFixedFull') },
  ];

  const scopeOptions = [
    { value: 'GLOBAL', label: t('scopeGlobal') },
    { value: 'SUPPLIER', label: t('scopeSupplier') },
    { value: 'TOUR', label: t('scopeTour') },
    { value: 'OPTION', label: t('scopeOption') },
  ];

  const scopeFilterOptions = [
    { value: '', label: t('scopeFilterAll') },
    { value: 'GLOBAL', label: t('scopeGlobal') },
    { value: 'SUPPLIER', label: t('scopeSupplier') },
    { value: 'TOUR', label: t('scopeTour') },
    { value: 'OPTION', label: t('scopeOption') },
  ];

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<CreatePromotionData>({
    code: '',
    name: '',
    promoType: 'PERCENT',
    promoScope: 'GLOBAL',
    value: 0,
    startsAt: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      if (search) params.q = search;
      if (typeFilter) params.promoType = typeFilter;
      if (scopeFilter) params.promoScope = scopeFilter;
      if (activeOnly) params.activeOnly = 'true';

      const response = await promotionsApi.listPromotions(params);
      setPromotions(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, typeFilter, scopeFilter, activeOnly]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPromotions();
  };

  const openCreateModal = () => {
    setEditingPromotion(null);
    setFormData({
      code: '',
      name: '',
      promoType: 'PERCENT',
      promoScope: 'GLOBAL',
      value: 0,
      startsAt: new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      code: promotion.code,
      name: promotion.name,
      promoType: promotion.promoType,
      promoScope: promotion.promoScope,
      value: Number(promotion.value),
      startsAt: promotion.startsAt.split('T')[0],
      endsAt: promotion.endsAt?.split('T')[0],
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingPromotion) {
        await promotionsApi.updatePromotion(editingPromotion.id, {
          name: formData.name,
          value: formData.value,
          endsAt: formData.endsAt,
        });
      } else {
        await promotionsApi.createPromotion({
          ...formData,
          startsAt: new Date(formData.startsAt).toISOString(),
          endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
        });
      }
      setIsModalOpen(false);
      fetchPromotions();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('saveError'));
      } else {
        setFormError(tc('errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (promotion: Promotion) => {
    try {
      await promotionsApi.updatePromotion(promotion.id, { isActive: !promotion.isActive });
      fetchPromotions();
    } catch (error) {
      console.error('Failed to update promotion:', error);
    }
  };

  const formatValue = (promo: Promotion) => {
    if (promo.promoType === 'PERCENT') {
      return `${promo.value}%`;
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(promo.value));
  };

  const columns = [
    {
      key: 'code',
      header: t('colCode'),
      render: (promo: Promotion) => (
        <span className="font-mono font-medium">{promo.code}</span>
      ),
    },
    {
      key: 'name',
      header: t('colName'),
      render: (promo: Promotion) => promo.name,
    },
    {
      key: 'type',
      header: t('colType'),
      render: (promo: Promotion) => (
        <Badge variant={promo.promoType === 'PERCENT' ? 'info' : 'purple'}>
          {promo.promoType === 'PERCENT' ? t('typePercent') : t('typeFixed')}
        </Badge>
      ),
    },
    {
      key: 'value',
      header: t('colValue'),
      render: (promo: Promotion) => formatValue(promo),
    },
    {
      key: 'scope',
      header: t('colScope'),
      render: (promo: Promotion) => (
        <Badge variant="default">{promo.promoScope}</Badge>
      ),
    },
    {
      key: 'validity',
      header: t('colValidity'),
      render: (promo: Promotion) => (
        <div className="text-sm">
          <p>{new Date(promo.startsAt).toLocaleDateString('vi-VN')}</p>
          <p className="text-gray-500">
            {promo.endsAt ? `${t('endPrefix')} ${new Date(promo.endsAt).toLocaleDateString('vi-VN')}` : t('noEnd')}
          </p>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: t('colStatus'),
      render: (promo: Promotion) => (
        <Badge variant={promo.isActive ? 'success' : 'default'}>
          {promo.isActive ? tc('active') : tc('inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (promo: Promotion) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(promo)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('tooltipEdit')}
          >
            <RiEditLine className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleActive(promo)}
            className={`rounded p-1.5 ${
              promo.isActive
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            title={promo.isActive ? t('tooltipDeactivate') : t('tooltipActivate')}
          >
            {promo.isActive ? (
              <RiCloseLine className="h-4 w-4" />
            ) : (
              <RiCheckLine className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <RiAddLine className="h-5 w-5" />
          {t('addButton')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={typeFilterOptions}
              wrapperClassName="sm:w-40 sm:flex-shrink-0"
            />
            <Select
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={scopeFilterOptions}
              wrapperClassName="sm:w-40 sm:flex-shrink-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <Toggle
              checked={activeOnly}
              onChange={setActiveOnly}
              label={t('activeOnly')}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                {tc('search')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setScopeFilter('');
                  setActiveOnly(false);
                  setCurrentPage(1);
                }}
              >
                {tc('clearFilters')}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={promotions}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyMessage={t('empty')}
        />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromotion ? t('editModalTitle') : t('createModalTitle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingPromotion ? tc('saveChanges') : tc('create')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('labelCode')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder={t('placeholderCode')}
              required
              disabled={!!editingPromotion}
            />
            <Input
              label={t('labelName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('placeholderName')}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label={t('labelType')}
              value={formData.promoType}
              onChange={(e) => setFormData({ ...formData, promoType: e.target.value as PromoType })}
              options={typeOptions}
              disabled={!!editingPromotion}
            />
            <Select
              label={t('labelScope')}
              value={formData.promoScope}
              onChange={(e) => setFormData({ ...formData, promoScope: e.target.value as PromoScope })}
              options={scopeOptions}
              disabled={!!editingPromotion}
            />
            <Input
              label={formData.promoType === 'PERCENT' ? t('labelPercentValue') : t('labelFixedValue')}
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              min={0}
              max={formData.promoType === 'PERCENT' ? 100 : undefined}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('labelStartDate')}
              type="date"
              value={formData.startsAt}
              onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              required
              disabled={!!editingPromotion}
            />
            <Input
              label={t('labelEndDate')}
              type="date"
              value={formData.endsAt || ''}
              onChange={(e) => setFormData({ ...formData, endsAt: e.target.value || undefined })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
