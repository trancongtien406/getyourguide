import type { Metadata } from 'next';
import { cache } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.getyourguide.com';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const siteName = 'GetYourGuide';

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

const getPost = cache(async (slug: string, locale?: string | null) => {
  try {
    const res = await fetch(`${apiUrl}/blog/posts/${slug}`, {
      next: { revalidate: 3600 },
      headers: locale ? { 'Accept-Language': locale } : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? data;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations('public');
  const locale = await getLocale();
  const { slug } = await params;
  const post = await getPost(slug, locale);
  if (!post) {
    return { title: t('metaPostNotFound'), alternates: { canonical: `${siteUrl}/blog/${slug}` } };
  }

  const title = post.seoTitle || post.title || t('metaBlogPostDefault');
  const description =
    post.seoDescription ||
    post.excerpt ||
    (typeof post.content === 'string'
      ? post.content.replace(/<[^>]+>/g, '').slice(0, 160)
      : undefined) ||
    `Read ${title} on ${siteName} travel blog.`;

  const canonical = post.canonicalUrl || `${siteUrl}/blog/${slug}`;
  const image = post.coverImageUrl;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title: `${title} | ${siteName}`,
      description: description.slice(0, 160),
      url: canonical,
      siteName,
      type: 'article',
      publishedTime: post.publishedAt,
      ...(image && {
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description: description.slice(0, 160),
    },
    alternates: { canonical: canonical.startsWith('http') ? canonical : `${siteUrl}${canonical}` },
  };
}

function BreadcrumbJsonLd({
  items,
}: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function BlogSlugLayout({ children, params }: Props) {
  const t = await getTranslations('public');
  const locale = await getLocale();
  const { slug } = await params;
  const post = await getPost(slug, locale);
  const breadcrumbs = [
    { name: t('breadcrumbHome'), url: siteUrl },
    { name: t('breadcrumbBlog'), url: `${siteUrl}/blog` },
    ...(post ? [{ name: post.title, url: `${siteUrl}/blog/${slug}` }] : []),
  ];
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  );
}
