'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { ApiError, paymentsApi, type GatewayConfig, type PaymentSettings } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

const defaultSettings: PaymentSettings = {
  mode: 'sandbox',
  gateways: {
    vnpay: {
      enabled: true,
      displayName: 'VNPay',
      domesticOnly: true,
      countries: ['VN'],
      currencies: ['VND'],
      channels: ['atm', 'napas_card', 'qr'],
    },
    momo: {
      enabled: true,
      displayName: 'MoMo',
      domesticOnly: true,
      countries: ['VN'],
      currencies: ['VND'],
      channels: ['wallet', 'qr'],
    },
    stripe: {
      enabled: false,
      displayName: 'Stripe',
      domesticOnly: false,
      countries: ['*'],
      currencies: ['USD', 'EUR', 'GBP', 'SGD', 'VND'],
      channels: ['card', 'apple_pay', 'google_pay'],
    },
    paypal: {
      enabled: false,
      displayName: 'PayPal',
      domesticOnly: false,
      countries: ['*'],
      currencies: ['USD', 'EUR', 'GBP'],
      channels: ['paypal_balance', 'card'],
    },
  },
};

function TagInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim().toUpperCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInputValue('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(value.filter(v => v !== tag))}
                className="hover:text-red-500 transition-colors"
              >
                &times;
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function GatewayCard({
  gatewayKey,
  config,
  onChange,
  readOnly,
  t,
}: {
  gatewayKey: string;
  config: GatewayConfig;
  onChange: (updated: GatewayConfig) => void;
  readOnly?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const isDisabled = readOnly || !config.enabled;
  return (
    <Card>
      <CardHeader
        title={config.displayName}
        description={t(`gatewayDesc_${gatewayKey}`)}
        action={
          <Toggle
            checked={config.enabled}
            onChange={(checked) => onChange({ ...config, enabled: checked })}
            size="sm"
            disabled={readOnly}
          />
        }
      />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('displayName')}
            value={config.displayName}
            onChange={e => onChange({ ...config, displayName: e.target.value })}
            disabled={isDisabled}
          />
          <div className="flex items-center gap-3 pt-5">
            <Toggle
              checked={config.domesticOnly}
              onChange={checked => onChange({ ...config, domesticOnly: checked })}
              size="sm"
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">{t('domesticOnly')}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TagInput
            label={t('countries')}
            value={config.countries}
            onChange={countries => onChange({ ...config, countries })}
            placeholder={t('countriesPlaceholder')}
            disabled={isDisabled}
          />
          <TagInput
            label={t('currencies')}
            value={config.currencies}
            onChange={currencies => onChange({ ...config, currencies })}
            placeholder={t('currenciesPlaceholder')}
            disabled={isDisabled}
          />
        </div>

        <TagInput
          label={t('channels')}
          value={config.channels}
          onChange={channels => onChange({ ...config, channels })}
          placeholder={t('channelsPlaceholder')}
          disabled={isDisabled}
        />
      </div>
    </Card>
  );
}

export default function PaymentsPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { isAdmin } = useAuth();
  const readOnly = !isAdmin;
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await paymentsApi.getSettings();
        setSettings({ ...defaultSettings, ...data, gateways: { ...defaultSettings.gateways, ...data.gateways } });
      } catch (error) {
        console.error('Failed to fetch payment settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateGateway = useCallback((key: string, config: GatewayConfig) => {
    setSettings(prev => ({
      ...prev,
      gateways: { ...prev.gateways, [key]: config },
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await paymentsApi.updateSettings(settings);
      setMessage({ type: 'success', text: t('saveSuccess') });
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage({
          type: 'error',
          text: (err.data as { message?: string })?.message || t('saveError'),
        });
      } else {
        setMessage({ type: 'error', text: t('saveError') });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const gatewayEntries = Object.entries(settings.gateways);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Read-only notice for OPERATOR */}
        {readOnly && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>{t('readOnlyTitle')}</strong>{' '}
              {t('readOnlyBody')}
            </p>
          </div>
        )}

        {/* Environment Mode */}
        <Card>
          <CardHeader title={t('modeTitle')} description={t('modeDescription')} />
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-2 ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="mode"
                value="sandbox"
                checked={settings.mode === 'sandbox'}
                onChange={() => setSettings(prev => ({ ...prev, mode: 'sandbox' }))}
                className="accent-blue-600"
                disabled={readOnly}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('modeSandbox')}
              </span>
            </label>
            <label className={`flex items-center gap-2 ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="mode"
                value="live"
                checked={settings.mode === 'live'}
                onChange={() => setSettings(prev => ({ ...prev, mode: 'live' }))}
                className="accent-blue-600"
                disabled={readOnly}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('modeLive')}
              </span>
            </label>
          </div>
        </Card>

        {/* Info Notice */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{t('envNoticeTitle')}</strong>{' '}
            {t('envNoticeBody')}
          </p>
        </div>

        {/* Gateway Cards */}
        {gatewayEntries.map(([key, config]) => (
          <GatewayCard
            key={key}
            gatewayKey={key}
            config={config}
            onChange={updated => updateGateway(key, updated)}
            readOnly={readOnly}
            t={t}
          />
        ))}

        {/* Submit — only ADMIN can save */}
        {!readOnly && (
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSaving}>
              {t('saveButton')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
