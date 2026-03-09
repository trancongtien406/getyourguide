'use client';

import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    RiArrowDownSLine,
    RiArticleLine,
    RiBellLine,
    RiCloseLine,
    RiCouponLine,
    RiDashboardLine,
    RiDatabase2Line,
    RiFlagLine,
    RiHistoryLine,
    RiKey2Line,
    RiLogoutBoxRLine,
    RiMapPinLine,
    RiMenuLine,
    RiMoneyDollarCircleLine,
    RiSettings4Line,
    RiShoppingCartLine,
    RiStarLine,
    RiUserLine,
} from 'react-icons/ri';

type NavItem = {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { name: string; href: string }[];
  adminOnly?: boolean; // Only shown to ADMIN
};

function getNavigation(t: (key: string) => string): NavItem[] {
  return [
    { name: t('dashboard'), href: '/admin', icon: RiDashboardLine },
    { name: t('users'), href: '/admin/users', icon: RiUserLine, adminOnly: true },
    {
      name: t('tourCatalog'),
      icon: RiMapPinLine,
      children: [
        { name: t('tours'), href: '/admin/catalog/tours' },
        { name: t('categories'), href: '/admin/catalog/categories' },
        { name: t('tags'), href: '/admin/catalog/tags' },
      ],
    },
    { name: t('bookings'), href: '/admin/bookings', icon: RiShoppingCartLine },
    { name: t('payments'), href: '/admin/payments', icon: RiMoneyDollarCircleLine },
    {
      name: t('blog'),
      icon: RiArticleLine,
      children: [
        { name: t('blogPosts'), href: '/admin/blog/posts' },
        { name: t('blogCategories'), href: '/admin/blog/categories' },
        { name: t('blogTags'), href: '/admin/blog/tags' },
      ],
    },
    {
      name: t('referenceData'),
      icon: RiDatabase2Line,
      children: [
        { name: t('countries'), href: '/admin/reference-data/countries' },
        { name: t('cities'), href: '/admin/reference-data/cities' },
        { name: t('languages'), href: '/admin/reference-data/languages' },
        { name: t('currencies'), href: '/admin/reference-data/currencies' },
        { name: t('exchangeRates'), href: '/admin/reference-data/exchange-rates' },
        { name: t('faqCategories'), href: '/admin/reference-data/faq-categories' },
        { name: t('faqItems'), href: '/admin/reference-data/faq-items' },
      ],
    },
    { name: t('reviews'), href: '/admin/reviews', icon: RiStarLine },
    { name: t('reports'), href: '/admin/reviews/reports', icon: RiFlagLine },
    { name: t('promotions'), href: '/admin/promotions', icon: RiCouponLine },
    { name: t('notifications'), href: '/admin/notifications', icon: RiBellLine },
    { name: t('apiKeys'), href: '/admin/api-keys', icon: RiKey2Line, adminOnly: true },
    { name: t('auditLogs'), href: '/admin/audit-logs', icon: RiHistoryLine },
    { name: t('settings'), href: '/admin/settings', icon: RiSettings4Line },
  ];
}

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const t = useTranslations('nav');
  const allNavigation = getNavigation(t);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Filter navigation by role: OPERATOR sees everything except adminOnly items
  const navigation = allNavigation.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
  const isChildActive = (children: { href: string }[]) =>
    children.some((child) => pathname === child.href || pathname.startsWith(child.href + '/'));

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold flex-shrink-0">
          G
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            GetYourGuide
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const hasChildren = 'children' in item;
            const isExpanded = expandedItems.includes(item.name);
            const active = hasChildren
              ? isChildActive(item.children!)
              : isActive(item.href!);

            return (
              <li key={item.name}>
                {hasChildren ? (
                  <>
                    {/* Expanded sidebar: toggle children list */}
                    {!collapsed && (
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                          ${
                            active
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.name}</span>
                        <RiArrowDownSLine
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}
                    {/* Collapsed sidebar: icon with hover flyout */}
                    {collapsed && (
                      <div className="group relative">
                        <div
                          className={`flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer
                            ${
                              active
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                        </div>
                        {/* Flyout popover on hover */}
                        <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-full top-0 ml-2 w-48 rounded-lg bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 transition-all">
                          <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {item.name}
                          </p>
                          {item.children!.map((child) => (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`block px-3 py-2 text-sm transition-colors
                                ${
                                  isActive(child.href)
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                                }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {isExpanded && !collapsed && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {item.children!.map((child) => (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={`block rounded-lg px-3 py-2 text-sm transition-colors
                                ${
                                  isActive(child.href)
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                                }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href!}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${collapsed ? 'justify-center' : ''}
                      ${
                        active
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className={`flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white flex-shrink-0">
            {user?.firstName?.[0] || user?.email[0].toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName
                    ? `${user.firstName} ${user.lastName || ''}`
                    : user?.email}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user?.roles.map((r) => typeof r === 'string' ? r : r.role).join(', ')}
                </p>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title="Logout"
              >
                <RiLogoutBoxRLine className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button - shown in header now */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden dark:bg-gray-900"
      >
        <RiMenuLine className="h-6 w-6 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform lg:hidden dark:bg-gray-900
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute right-4 top-4"
        >
          <RiCloseLine className="h-6 w-6 text-gray-500" />
        </button>
        <SidebarContent collapsed={false} />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-300 lg:block dark:border-gray-800 dark:bg-gray-900 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}
