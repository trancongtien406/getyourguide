# Checklist SEO – GetYourGuide Frontend

## Đã triển khai

### Kỹ thuật
- **robots.txt** – `app/robots.ts`: cho phép index trang public, chặn admin/profile/checkout/api; khai báo sitemap và host.
- **Sitemap** – `app/sitemap.ts`: sitemap động (trang tĩnh + tours + blog), revalidate 1h.
- **Canonical** – Mỗi nhóm trang có canonical đúng (root, /tours, /blog, /tours/[slug], /blog/[slug]).
- **404** – `app/not-found.tsx`: metadata với `robots: noindex, follow` và title/description.

### Meta & share
- **Metadata gốc** – `app/layout.tsx`: title template, description, keywords, authors, metadataBase.
- **Open Graph** – type, locale, url, siteName, title, description, images (default từ `opengraph-image.tsx`).
- **Twitter Card** – summary_large_image, title, description.
- **Viewport & theme** – themeColor (light/dark), width, initialScale, maximumScale.

### Theo từng trang
- **Tours listing** – `app/(public)/tours/layout.tsx`: title, description, OG, canonical.
- **Blog listing** – `app/(public)/blog/layout.tsx`: title, description, OG, canonical.
- **Tour chi tiết** – `app/(public)/tours/[slug]/layout.tsx`: generateMetadata (title, description, OG image từ cover), canonical, BreadcrumbList JSON-LD.
- **Blog chi tiết** – `app/(public)/blog/[slug]/layout.tsx`: generateMetadata (seoTitle/seoDescription/excerpt, OG image từ coverImageUrl), canonical, BreadcrumbList JSON-LD, type article + publishedTime.

### Trang không index
- **Cart** – `app/(public)/cart/layout.tsx`: robots noindex, nofollow.
- **Checkout** – `app/(public)/checkout/layout.tsx`: robots noindex, nofollow.

### Structured data (JSON-LD)
- **WebSite** – root layout: name, url, description, SearchAction (tìm kiếm tours).
- **Organization** – root layout: name, url, logo, description.
- **BreadcrumbList** – layout tour/[slug] và blog/[slug]: Home → Tours/Blog → tên tour/post.

### Khác
- **Favicon** – `app/icon.tsx`: icon 32x32.
- **OG image mặc định** – `app/opengraph-image.tsx`: 1200×630.
- **Manifest** – `app/manifest.ts`: PWA (theme_color, icons; cần thêm icon-192.png, icon-512.png trong `public/` nếu dùng PWA đầy đủ).
- **RSS** – `app/(public)/blog/feed.xml/route.ts`: RSS 2.0 cho blog; link trong head root layout.

---

## Tùy chọn / sau này

1. **Google & Yandex verification**  
   Trong `app/layout.tsx`, bỏ comment và điền mã trong `metadata.verification`.

2. **Hreflang**  
   Khi có locale trong URL (vd: /en/tours, /vi/tours), thêm `metadata.alternates.languages` cho từng locale.

3. **PWA icons**  
   Thêm `public/icon-192.png` và `public/icon-512.png` để manifest dùng đủ kích thước.

4. **Schema theo nội dung**  
   - Trang tour: có thể thêm Product hoặc Event schema (tên, mô tả, hình, giá, rating).
   - Trang blog: Article schema (headline, image, datePublished, author).

5. **Core Web Vitals**  
   Giữ dùng next/image, font tối ưu, tránh layout shift (đã có với cấu hình hiện tại).

6. **Nội dung**  
   - Mỗi trang có đúng một H1, thứ tự H2 → H3 hợp lý.
   - Ảnh có thuộc tính `alt` phù hợp.

7. **Google Search Console**  
   Đăng ký domain, gửi sitemap: `https://your-domain.com/sitemap.xml`.
