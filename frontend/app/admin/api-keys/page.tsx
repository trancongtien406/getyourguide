'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination, Table } from '@/components/ui/table';
import { apiKeysApi, type ApiKey } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiCloseCircleLine, RiEditLine, RiFileCopyLine } from 'react-icons/ri';

export default function ApiKeysPage() {
  const t = useTranslations('apiKeys');
  const tc = useTranslations('common');

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [rawKey, setRawKey] = useState('');
  const [form, setForm] = useState({ name: '', ownerType: 'user', ownerId: '', scopes: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const pageSize = 20;

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (search) params.search = search;
      const res = await apiKeysApi.listApiKeys(params);
      setKeys(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const resetForm = () => setForm({ name: '', ownerType: 'user', ownerId: '', scopes: '', expiresAt: '' });

  const handleCreate = async () => {
    if (!form.name || !form.ownerId) return;
    setSaving(true);
    try {
      const res = await apiKeysApi.createApiKey({
        name: form.name,
        ownerType: form.ownerType,
        ownerId: form.ownerId,
        scopes: form.scopes ? form.scopes.split(',').map(s => s.trim()) : [],
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      if (res.rawKey) {
        setRawKey(res.rawKey);
      }
      setShowCreate(false);
      resetForm();
      fetchKeys();
    } catch { /* empty */ } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiKeysApi.updateApiKey(editTarget.id, {
        name: form.name || undefined,
        scopes: form.scopes ? form.scopes.split(',').map(s => s.trim()) : undefined,
      });
      setEditTarget(null);
      resetForm();
      fetchKeys();
    } catch { /* empty */ } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await apiKeysApi.revokeApiKey(revokeTarget.id);
      setRevokeTarget(null);
      fetchKeys();
    } catch { /* empty */ }
  };

  const openEdit = (key: ApiKey) => {
    setForm({ name: key.name, ownerType: key.ownerType, ownerId: key.ownerId, scopes: key.scopes.join(', '), expiresAt: '' });
    setEditTarget(key);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
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
          { key: 'name', header: t('colName'), render: (k: ApiKey) => <span className="font-medium">{k.name}</span> },
          { key: 'keyPrefix', header: t('colPrefix'), render: (k: ApiKey) => <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{k.keyPrefix}...</code> },
          { key: 'owner', header: t('colOwner'), render: (k: ApiKey) => <span className="text-xs text-gray-500">{k.ownerType}:{k.ownerId.slice(0, 8)}</span> },
          { key: 'scopes', header: t('colScopes'), render: (k: ApiKey) => (
            <div className="flex flex-wrap gap-1">
              {k.scopes.length > 0 ? k.scopes.slice(0, 2).map(s => (
                <span key={s} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{s}</span>
              )) : <span className="text-xs text-gray-400">—</span>}
              {k.scopes.length > 2 && <span className="text-xs text-gray-400">+{k.scopes.length - 2}</span>}
            </div>
          )},
          { key: 'status', header: t('colStatus'), render: (k: ApiKey) => <Badge variant={k.isActive ? 'success' : 'danger'}>{k.isActive ? tc('active') : tc('inactive')}</Badge> },
          { key: 'lastUsed', header: t('colLastUsed'), render: (k: ApiKey) => <span className="text-xs text-gray-500">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : t('neverUsed')}</span> },
          { key: 'createdAt', header: t('colCreated'), render: (k: ApiKey) => new Date(k.createdAt).toLocaleDateString() },
          { key: 'actions', header: '', className: 'w-24', render: (k: ApiKey) => (
            <div className="flex gap-1">
              {k.isActive && (
                <>
                  <button onClick={() => openEdit(k)} className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title={tc('edit')}>
                    <RiEditLine className="h-4 w-4" />
                  </button>
                  <button onClick={() => setRevokeTarget(k)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={t('revokeTitle')}>
                    <RiCloseCircleLine className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )},
        ]}
        data={keys}
        keyExtractor={(k) => k.id}
        isLoading={loading}
        emptyMessage={t('empty')}
      />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={pageSize} onPageChange={setPage} />
      )}

      {/* Raw Key Display Modal */}
      <Modal isOpen={!!rawKey} onClose={() => setRawKey('')} title={t('createTitle')}>
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
            <p className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">{t('rawKeyWarning')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 text-sm dark:bg-gray-900 break-all">{rawKey}</code>
              <button onClick={() => copyToClipboard(rawKey)} className="rounded p-2 hover:bg-yellow-100 dark:hover:bg-yellow-800">
                <RiFileCopyLine className="h-5 w-5" />
              </button>
            </div>
            {copied && <p className="mt-1 text-xs text-green-600">Copied!</p>}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setRawKey('')}>OK</Button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('createTitle')}>
        <div className="space-y-4">
          <Input label={t('labelName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Integration" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('labelOwnerType')}</label>
              <select value={form.ownerType} onChange={(e) => setForm({ ...form, ownerType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="user">User</option>
                <option value="supplier">Supplier</option>
                <option value="system">System</option>
              </select>
            </div>
            <Input label={t('labelOwnerId')} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} />
          </div>
          <Input label={t('labelScopes')} value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} placeholder="read, write, admin" />
          <Input label={t('labelExpiresAt')} type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{tc('cancel')}</Button>
            <Button onClick={handleCreate} isLoading={saving}>{tc('create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={t('editTitle')}>
        <div className="space-y-4">
          <Input label={t('labelName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t('labelScopes')} value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>{tc('cancel')}</Button>
            <Button onClick={handleEdit} isLoading={saving}>{tc('save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal isOpen={!!revokeTarget} onClose={() => setRevokeTarget(null)} title={t('revokeTitle')}>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('revokeConfirm')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRevokeTarget(null)}>{tc('cancel')}</Button>
          <Button variant="danger" onClick={handleRevoke}>{tc('confirm')}</Button>
        </div>
      </Modal>
    </div>
  );
}
