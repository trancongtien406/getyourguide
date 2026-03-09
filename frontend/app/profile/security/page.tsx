'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profileApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { RiLockLine, RiMoonLine, RiSunLine } from 'react-icons/ri';

export default function SecurityPage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await profileApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Cannot change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('securityTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('securityDesc')}</p>
      </div>

      {/* Change Password */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-4 flex items-center gap-3">
          <RiLockLine className="h-5 w-5 text-slate-500" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('changePassword')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('changePasswordDesc')}</p>
          </div>
        </div>

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
            label="Current Password *"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <Input
            label="New Password *"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm New Password *"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} isLoading={saving}>{t('changePassword')}</Button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">{t('appearanceTitle')}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDarkMode ? <RiMoonLine className="h-5 w-5 text-slate-500" /> : <RiSunLine className="h-5 w-5 text-slate-500" />}
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {isDarkMode ? t('darkModeLabel') : t('lightModeLabel')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('appearanceToggleDesc')}</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDarkMode ? 'bg-primary' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
