'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination, Table } from '@/components/ui/table';
import { referenceDataApi, type ExchangeRate } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiDeleteBinLine } from 'react-icons/ri';

export default function ExchangeRatesPage() {
  const t = useTranslations('exchangeRates');
  const tc = useTranslations('common');

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRate | null>(null);
  const [form, setForm] = useState({ baseCurrency: '', quoteCurrency: '', rate: '', effectiveAt: '' });
  const [saving, setSaving] = useState(false);
  const pageSize = 20;

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (search) params.search = search;
      const res = await referenceDataApi.listExchangeRates(params);
      setRates(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const handleCreate = async () => {
    if (!form.baseCurrency || !form.quoteCurrency || !form.rate || !form.effectiveAt) return;
    setSaving(true);
    try {
      await referenceDataApi.createExchangeRate({
        baseCurrency: form.baseCurrency.toUpperCase(),
        quoteCurrency: form.quoteCurrency.toUpperCase(),
        rate: parseFloat(form.rate),
        effectiveAt: new Date(form.effectiveAt).toISOString(),
      });
      setShowCreate(false);
      setForm({ baseCurrency: '', quoteCurrency: '', rate: '', effectiveAt: '' });
      fetchRates();
    } catch { /* empty */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await referenceDataApi.deleteExchangeRate(deleteTarget.id);
      setDeleteTarget(null);
      fetchRates();
    } catch { /* empty */ }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <RiAddLine className="mr-2 h-4 w-4" /> {t('addButton')}
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Table
        columns={[
          { key: 'baseCurrency', header: t('colBaseCurrency'), render: (r: ExchangeRate) => <span className="font-mono font-medium">{r.baseCurrency}</span> },
          { key: 'quoteCurrency', header: t('colQuoteCurrency'), render: (r: ExchangeRate) => <span className="font-mono font-medium">{r.quoteCurrency}</span> },
          { key: 'rate', header: t('colRate'), render: (r: ExchangeRate) => <span className="font-mono">{Number(r.rate).toFixed(6)}</span> },
          { key: 'effectiveAt', header: t('colEffectiveAt'), render: (r: ExchangeRate) => new Date(r.effectiveAt).toLocaleDateString() },
          { key: 'createdAt', header: t('colCreated'), render: (r: ExchangeRate) => new Date(r.createdAt).toLocaleDateString() },
          { key: 'actions', header: '', className: 'w-16', render: (r: ExchangeRate) => (
            <button onClick={() => setDeleteTarget(r)} className="text-red-500 hover:text-red-700" title={tc('delete')}>
              <RiDeleteBinLine className="h-4 w-4" />
            </button>
          )},
        ]}
        data={rates}
        keyExtractor={(r) => r.id}
        isLoading={loading}
        emptyMessage={t('empty')}
      />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={pageSize} onPageChange={setPage} />
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('createTitle')}>
        <div className="space-y-4">
          <Input label={t('labelBaseCurrency')} value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })} placeholder="USD" />
          <Input label={t('labelQuoteCurrency')} value={form.quoteCurrency} onChange={(e) => setForm({ ...form, quoteCurrency: e.target.value })} placeholder="VND" />
          <Input label={t('labelRate')} type="number" step="0.000001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="25000" />
          <Input label={t('labelEffectiveAt')} type="datetime-local" value={form.effectiveAt} onChange={(e) => setForm({ ...form, effectiveAt: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{tc('cancel')}</Button>
            <Button onClick={handleCreate} isLoading={saving}>{tc('create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('deleteTitle')}>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('deleteConfirm')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
          <Button variant="danger" onClick={handleDelete}>{tc('delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}
