'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ApiError, authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { RiMoonLine, RiSunLine } from 'react-icons/ri';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Change password modal
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const openPasswordModal = () => {
    setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwdError('');
    setPwdSuccess('');
    setPwdModalOpen(true);
  };

  const handleChangePassword = async () => {
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      setPwdError(t('pwdFillInfo'));
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdError(t('pwdMinLength'));
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError(t('pwdMismatch'));
      return;
    }
    setPwdSaving(true);
    setPwdError('');
    try {
      await authApi.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdSuccess(t('pwdSuccess'));
      setTimeout(() => setPwdModalOpen(false), 1500);
    } catch (error) {
      setPwdError(error instanceof ApiError ? error.message : t('pwdError'));
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader
          title={t('profileTitle')}
          description={t('profileDescription')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('labelEmail')}
            value={user?.email || ''}
            disabled
          />
          <Input
            label={t('labelRole')}
            value={user?.roles.map((r) => typeof r === 'string' ? r : r.role).join(', ') || ''}
            disabled
          />
          <Input
            label={t('labelFirstName')}
            value={user?.firstName || ''}
            disabled
          />
          <Input
            label={t('labelLastName')}
            value={user?.lastName || ''}
            disabled
          />
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader
          title={t('appearanceTitle')}
          description={t('appearanceDescription')}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              {isDarkMode ? (
                <RiMoonLine className="h-5 w-5 text-blue-500" />
              ) : (
                <RiSunLine className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {isDarkMode ? t('darkModeLabel') : t('lightModeLabel')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('appearanceToggleDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDarkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            aria-label="Toggle dark mode"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader
          title={t('securityTitle')}
          description={t('securityDescription')}
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('changePassword')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('changePasswordDesc')}
              </p>
            </div>
            <Button variant="outline" onClick={openPasswordModal}>{t('changePassword')}</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('twoFactorTitle')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('twoFactorDesc')}
              </p>
            </div>
            <Button variant="outline">{t('twoFactorEnable')}</Button>
          </div>
        </div>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader
          title={t('sessionsTitle')}
          description={t('sessionsDescription')}
        />
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('currentSession')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.lastLoginAt
                  ? t('lastLogin', { date: new Date(user.lastLoginAt).toLocaleString() })
                  : t('browser')}
              </p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {t('activeSession')}
            </span>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader
          title={t('dangerTitle')}
          description={t('dangerDescription')}
        />
        <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-900/50">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{t('logoutEverywhere')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('logoutEverywhereDesc')}
            </p>
          </div>
          <Button variant="danger">{t('logoutAllButton')}</Button>
        </div>
      </Card>

      {/* Change Password Modal */}
      <Modal
        isOpen={pwdModalOpen}
        onClose={() => setPwdModalOpen(false)}
        title={t('pwdModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPwdModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleChangePassword} disabled={pwdSaving}>
              {pwdSaving ? tc('processing') : t('changePassword')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {pwdError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              {pwdSuccess}
            </div>
          )}
          <Input
            label={t('pwdCurrentLabel')}
            type="password"
            value={pwdForm.currentPassword}
            onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
            placeholder={t('pwdCurrentPlaceholder')}
          />
          <Input
            label={t('pwdNewLabel')}
            type="password"
            value={pwdForm.newPassword}
            onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
            placeholder={t('pwdNewPlaceholder')}
          />
          <Input
            label={t('pwdConfirmLabel')}
            type="password"
            value={pwdForm.confirmPassword}
            onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
            placeholder={t('pwdConfirmPlaceholder')}
          />
        </div>
      </Modal>
    </div>
  );
}
