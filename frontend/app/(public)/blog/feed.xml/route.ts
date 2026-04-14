import { API_URL, SITE_NAME, SITE_URL } from '@/lib/runtime-config';
import { NextResponse } from 'next/server';

const siteUrl = SITE_URL;
const apiUrl = API_URL;
const siteName = SITE_NAME;

export async function GET() {
  try {
    const res = await fetch(
      `${apiUrl}/blog/posts?pageSize=50&page=1`,
      { next: { revalidate: 3600 } }
    );
    const json = await res.json();
    const items = json?.data ?? json?.items ?? [];
    const posts = Array.isArray(items) ? items : [];

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} - Travel Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Travel tips, destination guides, and inspiration for your next trip.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .map(
        (p: { slug: string; title: string; excerpt?: string; publishedAt?: string; updatedAt?: string }) =>
          `    <item>
      <title>${escapeXml(p.title || 'Post')}</title>
      <link>${siteUrl}/blog/${p.slug}</link>
      <description>${escapeXml((p.excerpt || '').slice(0, 300))}</description>
      <pubDate>${p.publishedAt ? new Date(p.publishedAt).toUTCString() : new Date().toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/blog/${p.slug}</guid>
    </item>`
      )
      .join('\n')}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return new NextResponse('<?xml version="1.0"?><rss></rss>', {
      status: 500,
      headers: { 'Content-Type': 'application/rss+xml' },
    });
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
