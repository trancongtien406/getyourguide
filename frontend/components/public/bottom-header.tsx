'use client';

import { blogPublicApi, catalogApi, type BlogPost, type Tour } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const PREVIEW_SIZE = 10;

const discoverItems: { href: string; labelKey: string }[] = [
  { href: '/', labelKey: 'megaHome' },
  { href: '/tours', labelKey: 'megaBrowseTours' },
  { href: '/blog', labelKey: 'megaBlog' },
];

/** Chunk array into N columns for mega menu grid */
function chunkColumns<T>(arr: T[], cols: number): T[][] {
  const result: T[][] = Array.from({ length: cols }, () => []);
  arr.forEach((item, i) => result[i % cols].push(item));
  return result;
}

export function BottomHeader() {
  const t = useTranslations('public');
  const pathname = usePathname();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tours, setTours] = useState<Tour[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    catalogApi
      .listTours({ pageSize: String(PREVIEW_SIZE), page: '1' })
      .then((res) => {
        if (res?.data) setTours(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingTours(false));
  }, []);

  useEffect(() => {
    blogPublicApi
      .listPosts({ pageSize: String(PREVIEW_SIZE), page: '1' })
      .then((res) => {
        if (res?.data) setPosts(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpenIndex(null), 120);
  }, [clearCloseTimer]);

  const handleEnter = useCallback((index: number) => {
    clearCloseTimer();
    setOpenIndex(index);
  }, [clearCloseTimer]);

  const handleLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  const linkClass = (active: boolean) =>
    `block py-2 text-sm transition-colors text-left w-full rounded-lg px-3 -mx-3 ${
      active
        ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
    }`;

  const MEGA_COLS = 3;

  const menuPanels = [
    /* Discover – mega: 3 cột ngang */
    {
      labelKey: 'navDiscover',
      content: (
        <div className="grid grid-cols-3 gap-x-12 gap-y-1">
          {discoverItems.map((item) => (
            <Link
              key={item.href + item.labelKey}
              href={item.href}
              role="menuitem"
              className={linkClass(isActive(item.href))}
              onClick={() => setOpenIndex(null)}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      ),
    },
    /* Tours – mega: nhiều cột + view all */
    {
      labelKey: 'navToursAndActivities',
      content: (
        <div className="max-h-[360px] overflow-y-auto">
          {loadingTours ? (
            <div className="py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
              {t('loading')}
            </div>
          ) : tours.length === 0 ? (
            <Link
              href="/tours"
              role="menuitem"
              className={linkClass(isActive('/tours'))}
              onClick={() => setOpenIndex(null)}
            >
              {t('megaAllTours')}
            </Link>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-x-12 gap-y-1">
                {chunkColumns(tours, MEGA_COLS).map((column, colIndex) => (
                  <div key={colIndex} className="flex flex-col">
                    {column.map((tour) => (
                      <Link
                        key={tour.id}
                        href={`/tours/${tour.slug}`}
                        role="menuitem"
                        className={linkClass(pathname === `/tours/${tour.slug}`)}
                        onClick={() => setOpenIndex(null)}
                      >
                        {tour.title}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                <Link
                  href="/tours"
                  role="menuitem"
                  className={`${linkClass(isActive('/tours'))} font-semibold inline-block w-auto`}
                  onClick={() => setOpenIndex(null)}
                >
                  {t('megaViewAllTours')} →
                </Link>
              </div>
            </>
          )}
        </div>
      ),
    },
    /* Blog – mega: nhiều cột + view all */
    {
      labelKey: 'navBlog',
      content: (
        <div className="max-h-[360px] overflow-y-auto">
          {loadingPosts ? (
            <div className="py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
              {t('loading')}
            </div>
          ) : posts.length === 0 ? (
            <Link
              href="/blog"
              role="menuitem"
              className={linkClass(isActive('/blog'))}
              onClick={() => setOpenIndex(null)}
            >
              {t('megaAllPosts')}
            </Link>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-x-12 gap-y-1">
                {chunkColumns(posts, MEGA_COLS).map((column, colIndex) => (
                  <div key={colIndex} className="flex flex-col">
                    {column.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        role="menuitem"
                        className={linkClass(pathname === `/blog/${post.slug}`)}
                        onClick={() => setOpenIndex(null)}
                      >
                        {post.title}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                <Link
                  href="/blog"
                  role="menuitem"
                  className={`${linkClass(isActive('/blog'))} font-semibold inline-block w-auto`}
                  onClick={() => setOpenIndex(null)}
                >
                  {t('megaViewAllPosts')} →
                </Link>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <header
      aria-label="Section navigation"
      className="relative border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50"
      onMouseLeave={handleLeave}
    >
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center gap-1 py-2.5" role="navigation">
          {menuPanels.map((panel, index) => (
            <div
              key={panel.labelKey}
              className="relative"
              onMouseEnter={() => handleEnter(index)}
            >
              <button
                type="button"
                aria-expanded={openIndex === index}
                aria-haspopup="true"
                aria-controls={`mega-menu-${index}`}
                id={`mega-trigger-${index}`}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${openIndex === index
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }
                `}
              >
                {t(panel.labelKey)}
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Mega menu panel: full width, bên dưới nav */}
      {openIndex !== null && (
        <div
          id={`mega-menu-${openIndex}`}
          role="menu"
          aria-labelledby={`mega-trigger-${openIndex}`}
          className="absolute left-0 right-0 top-full z-50 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseEnter={clearCloseTimer}
        >
          <div className="max-w-7xl mx-auto px-4 py-6">
            {menuPanels[openIndex].content}
          </div>
        </div>
      )}
    </header>
  );
}
