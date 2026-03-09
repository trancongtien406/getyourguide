'use client';

import { useTheme } from '@/lib/theme-context';
import { useTranslations } from 'next-intl';
import { RiMoonLine, RiSunLine } from 'react-icons/ri';

export default function ProfileSettingsPage() {
  const t = useTranslations('profile');
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('appearanceTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('appearanceToggleDesc')}</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDarkMode ? (
              <RiMoonLine className="h-6 w-6 text-primary" />
            ) : (
              <RiSunLine className="h-6 w-6 text-yellow-500" />
            )}
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {isDarkMode ? t('darkModeLabel') : t('lightModeLabel')}
              </p>
              <p className="text-sm text-slate-500">{t('appearanceToggleDesc')}</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDarkMode ? 'bg-primary' : 'bg-slate-300'
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
