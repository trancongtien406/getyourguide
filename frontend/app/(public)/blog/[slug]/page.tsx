'use client';

import { blogPublicApi, type BlogPost } from '@/lib/api';
import { useLocaleCurrency } from '@/lib/locale-currency-context';
import DOMPurify from 'dompurify';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaFacebookF, FaXTwitter } from 'react-icons/fa6';
import {
    HiOutlineBookmark,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineShare
} from 'react-icons/hi';

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const t = useTranslations('public');
  const { formatDate } = useLocaleCurrency();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function fetchData() {
      try {
        setLoading(true);

        const postData = await blogPublicApi.getPostBySlug(slug).catch(() => null);

        if (postData) {
          setPost(postData);
        } else {
          setError('Post not found');
        }

        // Fetch related posts
        try {
          const relatedRes = await blogPublicApi.listPosts({ pageSize: '4' });
          if (relatedRes?.data) {
            setRelatedPosts(relatedRes.data.filter((p: BlogPost) => p.slug !== slug).slice(0, 3));
          }
        } catch {
          // silently fail
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6 max-w-3xl mx-auto">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800/40 rounded" />
          <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800/40 rounded" />
          <div className="h-[500px] bg-slate-200 dark:bg-slate-800/40 rounded-2xl" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-800/40 rounded" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800/40 rounded w-5/6" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800/40 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">📝</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Post not found</h1>
          <p className="text-slate-500">{error || 'The blog post you\'re looking for doesn\'t exist.'}</p>
          <Link href="/blog" className="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">
            {t('backToBlog')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Article */}
          <article className="lg:w-2/3">
            {/* Header */}
            <header className="mb-8">
              <div className="flex gap-2 mb-4">
                {post.seoKeywords?.slice(0, 2).map((kw, i) => (
                  <span
                    key={i}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      i === 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight text-slate-900 dark:text-white">
                {post.title}
              </h1>
              <div className="flex items-center justify-between border-y border-slate-100 dark:border-slate-700 py-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    ✍️
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{t('blogAuthor')}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <HiOutlineCalendar className="w-3.5 h-3.5" />
                          {formatDate(post.publishedAt, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                      {post.readTimeMinutes && (
                        <span className="flex items-center gap-1">
                          <HiOutlineClock className="w-3.5 h-3.5" /> {post.readTimeMinutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400')}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors"
                  >
                    <FaFacebookF className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, '_blank', 'width=600,height=400')}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    <FaXTwitter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: post.title, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                      }
                    }}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    <HiOutlineShare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* Cover Image */}
            {post.coverImageUrl && (
              <div className="mb-10">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="w-full h-[400px] md:h-[500px] object-cover rounded-2xl shadow-xl"
                  onError={(e) => { e.currentTarget.src = '/no_image.jpg'; }}
                />
              </div>
            )}

            {/* Content */}
            <div
              className="prose prose-slate dark:prose-invert prose-lg max-w-none
                prose-headings:font-extrabold
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

            {/* Share Footer */}
            <div className="mt-12 py-8 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold uppercase text-slate-500">{t('shareGuide')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <FaFacebookF className="w-3.5 h-3.5" /> Facebook
                  </button>
                  <button
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, '_blank', 'width=600,height=400')}
                    className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    <FaXTwitter className="w-3.5 h-3.5" /> X
                  </button>
                </div>
              </div>
              <button className="flex items-center gap-2 text-primary font-bold hover:underline">
                <HiOutlineBookmark className="w-5 h-5" /> {t('saveForLater')}
              </button>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:w-1/3">
            <div className="sticky top-24 space-y-8">
              {/* Newsletter CTA */}
              <div className="bg-primary rounded-2xl p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">{t('getInspiration')}</h3>
                  <p className="text-primary-200 text-sm mb-4">{t('inspirationDesc')}</p>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 focus:ring-white mb-3"
                    placeholder="Your email"
                  />
                  <button className="w-full py-3 bg-white text-primary font-bold rounded-lg hover:bg-primary-50 transition-colors">
                    {t('subscribeNow')}
                  </button>
                </div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              </div>
            </div>
          </aside>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-20 pt-12 border-t border-slate-100 dark:border-slate-700">
            <h2 className="text-3xl font-extrabold mb-8 text-slate-900 dark:text-white">{t('youMightAlsoLike')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((rp) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`} className="group cursor-pointer">
                  <div className="relative h-48 mb-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/40">
                    <img
                      src={rp.coverImageUrl || '/no_image.jpg'}
                      alt={rp.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.src = '/no_image.jpg'; }}
                    />
                  </div>
                  <span className="text-primary font-bold text-xs uppercase">Article</span>
                  <h3 className="text-lg font-bold mt-1 text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
                    {rp.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
