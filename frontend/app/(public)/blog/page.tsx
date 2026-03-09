'use client';

import { blogPublicApi, type BlogCategory, type BlogPost } from '@/lib/api';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { HiOutlineClock } from 'react-icons/hi';

const PAGE_SIZE = 12;

export default function BlogListingPage() {
  const t = useTranslations('public');
  const { formatDate } = useLocaleCurrency();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);

  // Fetch categories once
  useEffect(() => {
    blogPublicApi.listCategories({ pageSize: '20' }).then(res => {
      if (res?.data) setCategories(res.data);
    }).catch(() => {});
  }, []);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params: Record<string, string> = {
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      };
      if (selectedCategory) params.categoryId = selectedCategory;

      const res = await blogPublicApi.listPosts(params);
      if (res?.data) {
        if (append) {
          setPosts(prev => [...prev, ...res.data]);
        } else {
          setPosts(res.data);
        }
        setTotalPosts(res.meta?.total ?? res.data.length);
        setHasMore(pageNum < (res.meta?.totalPages ?? 1));
      }
    } catch {
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setPage(1);
    fetchPosts(1, false);
  }, [fetchPosts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 via-primary to-primary-500 py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            {t('blogTitle')}
          </h1>
          <p className="text-lg text-white/70 mb-8">
            {t('blogSubtitle')}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-[60px] z-30">
          <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-6 py-4">
              <button
                onClick={() => handleCategoryChange('')}
                className={`whitespace-nowrap text-sm font-medium pb-2 border-b-2 transition-colors ${
                  !selectedCategory
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('allPosts')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`whitespace-nowrap text-sm font-medium pb-2 border-b-2 transition-colors ${
                    selectedCategory === cat.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800/40 mb-4" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/40 rounded mb-2" />
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800/40 rounded mb-2" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800/40 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group cursor-pointer bg-white dark:bg-slate-800/40 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800/40">
                  <img
                    src={post.coverImageUrl || '/no_image.jpg'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = '/no_image.jpg'; }}
                  />
                </div>
                <div className="p-5">
                  {post.categoryId && (
                    <span className="text-primary font-bold text-xs uppercase">
                      {categories.find((c) => c.id === post.categoryId)?.name || 'Article'}
                    </span>
                  )}
                  <h3 className="text-lg font-bold mt-1 mb-2 text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    {post.readTimeMinutes && (
                      <span className="flex items-center gap-1">
                        <HiOutlineClock className="w-3.5 h-3.5" /> {post.readTimeMinutes} min read
                      </span>
                    )}
                    {post.publishedAt && (
                      <span>{formatDate(post.publishedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loadingMore ? t('loading') : t('loadMore')}
                </button>
              </div>
            )}

            {totalPosts > 0 && (
              <p className="text-center text-sm text-slate-500 mt-4">
                {t('showingResults', { shown: posts.length, total: totalPosts })}
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('noPosts')}</h2>
            <p className="text-slate-500">{t('noPostsDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
