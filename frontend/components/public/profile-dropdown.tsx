'use client';

import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineHeart,
    HiOutlineLogout,
    HiOutlineShieldCheck,
    HiOutlineStar,
    HiOutlineUser,
} from 'react-icons/hi';

export function ProfileDropdown() {
  const t = useTranslations('public');
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!user) return null;

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email[0].toUpperCase();

  const menuItems = [
    { href: '/profile', icon: HiOutlineUser, label: t('dropdownProfile') },
    { href: '/profile/bookings', icon: HiOutlineClipboardList, label: t('dropdownBookings') },
    { href: '/profile/favorites', icon: HiOutlineHeart, label: t('dropdownFavorites') },
    { href: '/profile/reviews', icon: HiOutlineStar, label: t('dropdownReviews') },
    { href: '/profile/settings', icon: HiOutlineCog, label: t('dropdownSettings') },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border-2 border-slate-200 dark:border-slate-700 px-1.5 py-1.5 hover:border-primary/50 hover:shadow-sm transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {user.firstName || user.lastName
                ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                : user.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <item.icon className="w-4.5 h-4.5 text-slate-400" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Admin link */}
          {isAdmin && (
            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <HiOutlineShieldCheck className="w-4.5 h-4.5" />
                {t('dropdownAdmin')}
              </Link>
            </div>
          )}

          {/* Logout */}
          <div className="border-t border-slate-100 dark:border-slate-800 py-1">
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <HiOutlineLogout className="w-4.5 h-4.5" />
              {t('dropdownLogout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
