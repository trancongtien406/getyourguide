import { API_URL, SITE_URL } from '@/lib/runtime-config';
import type { MetadataRoute } from 'next';

const baseUrl = SITE_URL;
const apiUrl = API_URL;

async function fetchAllTourSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(
        `${apiUrl}/catalog/tours?page=${page}&pageSize=${pageSize}&status=PUBLISHED`,
        { next: { revalidate: 3600 } }
      );
      const json = await res.json();
      const items = json?.data ?? json?.items ?? [];
      const meta = json?.meta ?? {};
      items.forEach((t: { slug?: string }) => {
        if (t?.slug) slugs.push(t.slug);
      });
      const totalPages = meta.totalPages ?? (Math.ceil((meta.total ?? 0) / pageSize) || 1);
      hasMore = page < totalPages;
      page += 1;
    } catch {
      break;
    }
  }
  return slugs;
}

async function fetchAllBlogSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(
        `${apiUrl}/blog/posts?page=${page}&pageSize=${pageSize}`,
        { next: { revalidate: 3600 } }
      );
      const json = await res.json();
      const items = json?.data ?? json?.items ?? [];
      const meta = json?.meta ?? {};
      items.forEach((p: { slug?: string }) => {
        if (p?.slug) slugs.push(p.slug);
      });
      const totalPages = meta.totalPages ?? (Math.ceil((meta.total ?? 0) / pageSize) || 1);
      hasMore = page < totalPages;
      page += 1;
    } catch {
      break;
    }
  }
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/tours`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/supplier-partners`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const [tourSlugs, blogSlugs] = await Promise.all([
    fetchAllTourSlugs(),
    fetchAllBlogSlugs(),
  ]);

  const tourEntries: MetadataRoute.Sitemap = tourSlugs.map((slug) => ({
    url: `${baseUrl}/tours/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...tourEntries, ...blogEntries];
}
