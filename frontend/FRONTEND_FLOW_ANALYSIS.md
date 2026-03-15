# Phân tích luồng Frontend – GetYourGuide

## 1. Tổng quan kiến trúc

- **Stack**: Next.js 16 (App Router), React 19, next-intl, Tailwind CSS 4.
- **Cấu trúc thư mục**:
  - `app/` – routes: `(public)/` (trang công khai), `profile/` (user), `admin/` (admin).
  - `lib/` – API client, auth, guest cart, locale/currency, toast, theme.
  - `components/` – public (navbar, footer, auth-dialog), tours, profile, admin, ui.

---

## 2. Luồng hoạt động chính

### 2.1 Layout & Providers

| Route        | Layout chain | Providers |
|-------------|--------------|-----------|
| `/`, `/tours`, `/cart`, `/checkout`, … | Root → **(public)** | AuthProvider → GuestCartProvider → LocaleCurrencyProvider → Navbar + main + Footer |
| `/profile/*` | Root → **profile** | AuthProvider → LocaleCurrencyProvider → ThemeProvider → Navbar + SideNav + main + Footer |
| `/admin/*`  | Root → **admin**  | (Admin layout riêng) |

- **Root layout** (`app/layout.tsx`): NextIntlClientProvider, ToastProvider, theme script (dark mode), skip-link a11y.
- **Public layout**: Bọc toàn bộ trang công khai với Auth + GuestCart + LocaleCurrency. Navbar/Footer dùng chung.
- **Profile layout**: Bọc với Auth + LocaleCurrency + Theme; redirect về `/sign-in?returnUrl=...` nếu chưa đăng nhập.

### 2.2 Xác thực (Auth)

1. **Khởi tạo**: `AuthProvider` mount → đọc `cachedUser` từ localStorage (giảm nháy) → gọi `fetchUser()`.
2. **fetchUser**: Nếu có `accessToken` trong memory → gọi `/auth/me`; nếu 401 → xóa token, thử refresh. Nếu không có token → gọi `/auth/refresh` (cookie HttpOnly) → lấy accessToken mới → `/auth/me`.
3. **Login/Register**: Gọi API → lưu `accessToken` (chỉ trong memory), cache user vào localStorage → **sync guest cart lên server** → toast.
4. **Logout**: Gọi `/auth/logout`, xóa token và cache, toast.
- **API** (`lib/api.ts`): Token lưu trong biến module (không localStorage, hạn chế XSS). Mọi request 401 (trừ `/auth/refresh`) → `tryRefreshToken()` rồi retry 1 lần.

### 2.3 Giỏ hàng & Checkout

- **Guest**: `GuestCartProvider` lưu items trong `localStorage` key `guestCart`; add/update/remove chỉ cập nhật state + localStorage.
- **Đã đăng nhập**: Cart lấy/cập nhật qua `cartApi` (server).
- **Trang Cart** (`/cart`): Dựa vào `isAuthenticated` để hiển thị `serverCart` hoặc `guestCart.items`; thống nhất thành `displayItems`. Cập nhật số lượng / xóa / clear tương ứng (API hoặc guest context). Checkout:
  - **Đã đăng nhập**: `cartApi.checkout({})` → redirect `/checkout/{bookingId}` (dùng `result.id` hoặc `result.bookingId`).
  - **Guest**: Hiện form email/phone → `cartApi.guestCheckout({...})` → clear guest cart → redirect `/checkout/{id}` (hiện tại chỉ dùng `result.id`, nên hỗ trợ thêm `bookingId`).
- **Trang Checkout** (`/checkout/[bookingId]`): Guest gọi `getGuestBookingById(bookingId)`, user gọi `getBookingById(bookingId)` → hiển thị booking, chọn payment (VNPAY/MOMO) → initiate → redirect sang gateway.

### 2.4 Đa ngôn ngữ & Tiền tệ

- **i18n**: `next-intl`; locale từ cookie `locale` (mặc định `vi`), messages từ `messages/{locale}.json`; đổi locale = set cookie + `router.refresh()`.
- **LocaleCurrencyProvider**: Locale từ `useLocale()`; currency từ state + cookie `currency`; danh sách locales/currencies lấy từ reference API (cache localStorage). Cung cấp `formatPrice`, `formatDate`, `formatTime`, `switchLocale`, `switchCurrency`.

### 2.5 Trang chủ & Danh sách tour

- **Home** (`/`): Hero + CitySearchDropdown, sections Destinations (cities), Attractions (categories), Reviews (reviews thật từ tours), Featured tours, tab links (categories), **Newsletter form (chưa gửi API)**.
- **Tours** (`/tours`): Query params `q`, `city`, `category`; filter chips + panel (city, category, sort); list tours (search hoặc list), load more; **Newsletter form (chưa gửi API)**. Favorites: nếu đã đăng nhập thì fetch và toggle qua `favoritesApi`.

### 2.6 Chi tiết tour & Đặt chỗ

- **Tour detail** (`/tours/[slug]`): Lấy tour by slug, reviews; tabs Overview / Itinerary / Details / Reviews; sidebar booking: chọn option, date, travelers → add to cart (guest hoặc auth) qua `TourBookingSidebar` (guestCart.addItem hoặc cartApi.addItem).

---

## 3. Ưu điểm

1. **Bảo mật**: Access token chỉ trong memory; refresh token HttpOnly cookie; auto refresh 401 và retry.
2. **Trải nghiệm**: Cache user trong localStorage giảm nháy; guest cart sync lên server khi login/register.
3. **Tách bạch**: Guest cart vs server cart được gom chung ở Cart page qua `displayItems`; checkout hỗ trợ cả guest và user.
4. **API tập trung**: Một hàm `api()` xử lý headers (Authorization, locale, currency), wrapper response, refresh token.
5. **i18n & đa tiền tệ**: next-intl + locale/currency từ API, format thống nhất.
6. **Cấu trúc rõ**: Layout theo từng nhóm route; components tách public / profile / admin / tours.

---

## 4. Nhược điểm & Cần hoàn thiện

1. **Guest checkout redirect**: Trang cart dùng `result.id` sau `guestCheckout`; backend có thể trả `bookingId` → nên dùng `result?.id || result?.bookingId` để redirect đúng.
2. **Navbar không hiển thị số lượng giỏ hàng guest**: Chỉ có icon cart, không có badge số item khi dùng guest cart.
3. **Trang Tours – nhãn Sort**: Ô "Sort by" luôn hiển thị "Recommended" dù đã chọn sort khác (price_asc, rating_desc, …).
4. **Form Newsletter**: Ở Home và Tours có form subscribe nhưng không `onSubmit`, không gọi API `/newsletter/subscribe`; chưa có `newsletterApi` trong `lib/api.ts`.
5. **Home – Tab section**: Các tab (Top Attractions, Top Destinations, …) chỉ là UI, không đổi nội dung theo tab.
6. **Profile layout – AuthProvider tách**: Profile dùng AuthProvider riêng so với public; khi chuyển từ public sang profile sẽ chạy lại fetchUser (vẫn đúng nhưng không dùng chung một cây provider).

---

## 5. Thứ tự hoàn thiện đề xuất

1. **Sửa guest checkout redirect** – hỗ trợ cả `id` và `bookingId` từ response.
2. **Hiển thị số lượng giỏ hàng guest trên Navbar** – dùng `useGuestCart().itemCount` khi chưa đăng nhập.
3. **Sửa nhãn Sort By trên trang Tours** – hiển thị đúng giá trị sort đang chọn.
4. **Newsletter**: Thêm `newsletterApi.subscribe` trong `lib/api.ts` và gắn submit form ở Home + Tours (loading, success/error toast).
5. (Tùy chọn) Tab section trang chủ: gắn state tab và nội dung tương ứng hoặc ẩn/bỏ nếu không dùng.

---

## 6. Sơ đồ luồng ngắn gọn

```
[Root] → ToastProvider, next-intl, theme script
   ├── (public) → AuthProvider → GuestCartProvider → LocaleCurrencyProvider → Navbar + main + Footer
   │      ├── /, /tours, /tours/[slug], /cart, /checkout/[id], /sign-in, ...
   ├── profile → AuthProvider → LocaleCurrencyProvider → ThemeProvider → Navbar + SideNav + main + Footer
   │      └── /profile/* (redirect to sign-in if not auth)
   └── admin → Admin layout
```

**Auth**: Mount → cache user (optional) → fetchUser (token hoặc refresh) → login/register → sync guest cart.  
**Cart**: Guest = localStorage + GuestCartProvider; Auth = cartApi. Cart page hợp nhất → checkout → redirect /checkout/[bookingId].  
**Checkout**: Load booking (guest hoặc auth API) → chọn payment → initiate → redirect gateway.
