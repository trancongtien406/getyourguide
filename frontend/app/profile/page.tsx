'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profileApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { RiUserLine } from 'react-icons/ri';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const { user } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneE164: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneE164: user.phoneE164 || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileApi.updateProfile({
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phoneE164: form.phoneE164 || undefined,
      });
      setSuccess(t('saveSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const roles = user?.roles.map((r) => (typeof r === 'string' ? r : r.role)).join(', ') || '';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || <RiUserLine />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{roles}</p>
          </div>
        </div>

        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">{t('personalInfoTitle')}</h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t('personalInfoDesc')}</p>

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label={t('labelEmail')}
            value={user?.email || ''}
            disabled
            className="bg-slate-50 dark:bg-slate-700"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('labelFirstName')}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <Input
              label={t('labelLastName')}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <Input
            label={t('labelPhone')}
            value={form.phoneE164}
            onChange={(e) => setForm({ ...form, phoneE164: e.target.value })}
            placeholder="+84 xxx xxx xxx"
          />
          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={saving}>{tc('saveChanges')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
