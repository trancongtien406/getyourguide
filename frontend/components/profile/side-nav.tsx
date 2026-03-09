'use client';

import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    HiOutlineBell,
    HiOutlineChatAlt2,
    HiOutlineChevronDown,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineCollection,
    HiOutlineHeart,
    HiOutlineShieldCheck,
    HiOutlineStar,
    HiOutlineUser
} from 'react-icons/hi';

type NavItem = {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
  roles?: string[];
};

export function ProfileSideNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { user, hasRole } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const userRoles = user?.roles.map((r) => (typeof r === 'string' ? r : r.role)) || [];

  const navigation: NavItem[] = [
    { label: t('personalInfo'), href: '/profile', icon: HiOutlineUser },
    { label: t('security'), href: '/profile/security', icon: HiOutlineShieldCheck },
    { label: t('myBookings'), href: '/profile/bookings', icon: HiOutlineClipboardList, roles: ['CUSTOMER', 'SUPPLIER_ADMIN', 'SUPPLIER_STAFF'] },
    { label: t('myFavorites'), href: '/profile/favorites', icon: HiOutlineHeart, roles: ['CUSTOMER'] },
    { label: t('myReviews'), href: '/profile/reviews', icon: HiOutlineStar, roles: ['CUSTOMER'] },
    { label: t('notifications'), href: '/profile/notifications', icon: HiOutlineBell },
    { label: t('messages'), href: '/profile/messages', icon: HiOutlineChatAlt2 },
    {
      label: t('supplierDashboard'),
      icon: HiOutlineCollection,
      roles: ['SUPPLIER_ADMIN'],
      children: [
        { label: t('supplierTours'), href: '/profile/supplier/tours' },
        { label: t('supplierBookings'), href: '/profile/supplier/bookings' },
      ],
    },
    { label: t('settings'), href: '/profile/settings', icon: HiOutlineCog },
  ];

  const visibleNav = navigation.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => userRoles.includes(role as never));
  });

  const isActive = (href: string) =>
    pathname === href || (href !== '/profile' && pathname.startsWith(href + '/'));
  const isChildActive = (children: { href: string }[]) =>
    children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  return (
    <nav className="rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
      {/* User info header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {user?.firstName && user?.lastName
              ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
              : user?.email[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <div className="p-2">
        {visibleNav.map((item) => {
          const hasChildren = !!item.children;
          const isExpanded = expandedGroups.includes(item.label);
          const active = hasChildren
            ? isChildActive(item.children!)
            : isActive(item.href!);

          return (
            <div key={item.label}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/8 text-primary dark:bg-primary/15'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <HiOutlineChevronDown
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {(isExpanded || active) && (
                    <div className="ml-9 mt-0.5 mb-1 space-y-0.5">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? 'bg-primary/8 text-primary font-medium dark:bg-primary/15'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href!}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/8 text-primary dark:bg-primary/15'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
