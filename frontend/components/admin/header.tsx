'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Modal } from '@/components/ui/modal';
import { ApiError, authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
    RiBellLine,
    RiLockPasswordLine,
    RiLogoutBoxRLine,
    RiMenuFoldLine,
    RiMenuUnfoldLine,
    RiMoonLine,
    RiSettingsLine,
    RiSunLine
} from 'react-icons/ri';

interface AdminHeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function AdminHeader({ isSidebarCollapsed, onToggleSidebar }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const t = useTranslations('header');
  const tc = useTranslations('common');
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Change password modal
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const openPasswordModal = () => {
    setMenuOpen(false);
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

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label={isSidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            {isSidebarCollapsed ? (
              <RiMenuUnfoldLine className="h-5 w-5" />
            ) : (
              <RiMenuFoldLine className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label={t('toggleDark')}
          >
            {isDarkMode ? (
              <RiSunLine className="h-5 w-5" />
            ) : (
              <RiMoonLine className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label={t('notifications')}
          >
            <RiBellLine className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User dropdown */}
          <div className="relative ml-2" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden text-sm font-medium text-gray-900 dark:text-white md:block">
                {user?.firstName || user?.email}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {/* User info */}
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <RiSettingsLine className="h-4 w-4" />
                    {t('settings')}
                  </Link>
                  <button
                    onClick={openPasswordModal}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <RiLockPasswordLine className="h-4 w-4" />
                    {t('changePassword')}
                  </button>
                  <button
                    onClick={toggleDarkMode}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {isDarkMode ? <RiSunLine className="h-4 w-4" /> : <RiMoonLine className="h-4 w-4" />}
                    {isDarkMode ? t('lightMode') : t('darkMode')}
                  </button>
                </div>

                <div className="border-t border-gray-200 py-1 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <RiLogoutBoxRLine className="h-4 w-4" />
                    {t('logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

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
    </>
  );
}
