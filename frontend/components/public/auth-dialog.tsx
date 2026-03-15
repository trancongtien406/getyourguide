'use client';

import { Modal } from '@/components/ui/modal';
import { ApiError, authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
    HiOutlineArrowLeft,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineLockClosed,
    HiOutlineMail,
    HiOutlineUser,
} from 'react-icons/hi';

type Tab = 'login' | 'register' | 'forgot';
type ForgotStep = 'request' | 'reset';

// Seeded demo accounts from backend
const DEMO_ACCOUNTS = {
  admin: {
    label: 'Admin',
    email: 'admin@getyourguide.local',
    password: 'Admin@12345',
  },
  operator: {
    label: 'Operator',
    email: 'operator@getyourguide.local',
    password: 'Operator@12345',
  },
  supplierAdmin: {
    label: 'Supplier Admin',
    email: 'supplier.admin@getyourguide.local',
    password: 'SupplierAdmin@12345',
  },
  supplierStaff: {
    label: 'Supplier Staff',
    email: 'supplier.staff@getyourguide.local',
    password: 'SupplierStaff@12345',
  },
  customer: {
    label: 'Customer',
    email: 'customer@getyourguide.local',
    password: 'Customer@12345',
  },
} as const;

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export function AuthDialog({ isOpen, onClose, initialTab = 'login' }: AuthDialogProps) {
  const t = useTranslations('public');
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sync tab when initialTab changes (e.g. clicking login vs register button)
  useEffect(() => {
    setTab(initialTab);
    setForgotStep('request');
  }, [initialTab]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  const resetForm = () => {
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setLoginEmail('');
    setLoginPassword('');
    setRegEmail('');
    setRegPassword('');
    setRegPasswordConfirm('');
    setRegFirstName('');
    setRegLastName('');
    setForgotStep('request');
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
  };

  const handleTabSwitch = (newTab: Tab) => {
    setTab(newTab);
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    if (newTab === 'forgot') setForgotStep('request');
  };

  const handleClose = () => {
    resetForm();
    setTab(initialTab);
    setForgotStep('request');
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(t('authInvalidCredentials'));
      } else {
        setError(t('authErrorGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPassword.length < 8) {
      setError(t('authPasswordMin'));
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError(t('authPasswordMismatch'));
      return;
    }
    setIsLoading(true);
    try {
      await register({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName || undefined,
        lastName: regLastName || undefined,
      });
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(t('authEmailExists'));
        } else {
          setError(err.message || t('authErrorGeneric'));
        }
      } else {
        setError(t('authErrorGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setSuccessMessage(t('authForgotSent'));
      setForgotStep('reset');
    } catch (err) {
      setError(t('authForgotError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (forgotNewPassword.length < 8) {
      setError(t('authPasswordMin'));
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError(t('authPasswordMismatch'));
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword });
      setSuccessMessage(t('authForgotResetSuccess'));
      setTimeout(() => {
        setTab('login');
        setForgotStep('request');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      setError(t('authForgotResetError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async (email: string, password: string) => {
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(t('authInvalidCredentials'));
      } else {
        setError(t('authErrorGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="px-1">
        {/* Tabs or Forgot back */}
        {tab === 'forgot' ? (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <HiOutlineArrowLeft className="w-4 h-4" />
              {t('authForgotBackToLogin')}
            </button>
          </div>
        ) : (
          <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
            <button
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === 'login'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t('authLoginTab')}
            </button>
            <button
              onClick={() => handleTabSwitch('register')}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === 'register'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t('authRegisterTab')}
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authEmail')}
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authPassword')}
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('forgot')}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('authForgotLink')}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? t('authLoading') : t('authLoginBtn')}
            </button>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center space-y-2">
              <p>{t('authTestLoginHint')}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleTestLogin(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.password)}
                  disabled={isLoading}
                  className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 py-2 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {DEMO_ACCOUNTS.admin.label}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestLogin(DEMO_ACCOUNTS.operator.email, DEMO_ACCOUNTS.operator.password)}
                  disabled={isLoading}
                  className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 py-2 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {DEMO_ACCOUNTS.operator.label}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTestLogin(DEMO_ACCOUNTS.supplierAdmin.email, DEMO_ACCOUNTS.supplierAdmin.password)
                  }
                  disabled={isLoading}
                  className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 py-2 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {DEMO_ACCOUNTS.supplierAdmin.label}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTestLogin(DEMO_ACCOUNTS.supplierStaff.email, DEMO_ACCOUNTS.supplierStaff.password)
                  }
                  disabled={isLoading}
                  className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 py-2 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {DEMO_ACCOUNTS.supplierStaff.label}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestLogin(DEMO_ACCOUNTS.customer.email, DEMO_ACCOUNTS.customer.password)}
                  disabled={isLoading}
                  className="col-span-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 py-2 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {DEMO_ACCOUNTS.customer.label}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('authFirstName')}
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('authLastName')}
                </label>
                <input
                  type="text"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authEmail')}
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('authPassword')}
                </label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t('authPasswordHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('authPasswordConfirm')}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? t('authLoading') : t('authRegisterBtn')}
            </button>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center space-y-1">
              <p>{t('authRegisterCustomerNote')}</p>
              <p>
                {t('authRegisterSupplierCta')}{' '}
                <a
                  href="/supplier-partners"
                  className="text-primary font-semibold hover:underline"
                >
                  {t('authRegisterSupplierLink')}
                </a>
              </p>
            </div>
          </form>
        )}

        {/* Forgot password: request OTP */}
        {tab === 'forgot' && forgotStep === 'request' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('authForgotSubtitle')}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authEmail')}
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? t('authLoading') : t('authForgotSubmit')}
            </button>
          </form>
        )}

        {/* Forgot password: reset with OTP */}
        {tab === 'forgot' && forgotStep === 'reset' && (
          <form onSubmit={handleForgotReset} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('authForgotResetSubtitle')}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authEmail')}
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authForgotOtpLabel')}
              </label>
              <input
                type="text"
                required
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authForgotNewPasswordLabel')}
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('authPasswordHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('authPasswordConfirm')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? t('authLoading') : t('authForgotResetSubmit')}
            </button>
          </form>
        )}

        {/* Divider + switch */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
          {tab === 'forgot' ? (
            <button
              onClick={() => handleTabSwitch('login')}
              className="text-primary font-semibold hover:underline"
            >
              {t('authForgotBackToLogin')}
            </button>
          ) : tab === 'login' ? (
            <>
              {t('authNoAccount')}{' '}
              <button
                onClick={() => handleTabSwitch('register')}
                className="text-primary font-semibold hover:underline"
              >
                {t('authRegisterTab')}
              </button>
            </>
          ) : (
            <>
              {t('authHaveAccount')}{' '}
              <button
                onClick={() => handleTabSwitch('login')}
                className="text-primary font-semibold hover:underline"
              >
                {t('authLoginTab')}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
