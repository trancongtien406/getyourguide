# Database Blueprint (GetYourGuide-like OTA)

Tài liệu này mô tả schema PostgreSQL đầy đủ cho nền tảng đặt tour du lịch, tối ưu theo hướng **chi phí thấp giai đoạn đầu** và **mở rộng dần khi user tăng**.

## 1) Mục tiêu thiết kế

- Hỗ trợ đầy đủ nghiệp vụ: catalog tour, lịch khởi hành, tồn chỗ, booking, payment, refund, review, promotion.
- Có sẵn domain tăng trưởng: blog SEO, tour yêu thích, nhắn tin, CMS/trang tĩnh và cấu hình hệ thống.
- Chống lỗi nghiệp vụ quan trọng: double-booking, double-charge.
- Phù hợp backend-first với NestJS modular monolith.
- Tối ưu chi phí ban đầu: chỉ cần Postgres + Redis + queue nhẹ.

## 2) File schema chính

- SQL khởi tạo đầy đủ: [database/schema.sql](../database/schema.sql)

## 3) Domain model cốt lõi

### A. Identity & Access

- `users`, `user_roles`, `user_oauth_accounts`, `user_sessions`
- Hỗ trợ role: customer, supplier admin/staff, operator, admin.

### B. Supplier / Merchant

- `suppliers`, `supplier_users`, `supplier_settlements`
- Quản lý đối tác vận hành tour và quyết toán.

### C. Catalog

- `tours`, `tour_options`, `departure_slots`, `option_pricing_rules`
- Phụ trợ: `categories`, `tour_categories`, `tour_media`, `tour_translations`, `tour_tags`.

### D. Inventory & Booking

- `inventory_slots`, `inventory_holds`
- `booking_carts`, `booking_cart_items`
- `bookings`, `booking_items`, `booking_travelers`, `booking_events`, `booking_vouchers`

### E. Payment & Refund

- `payment_methods`, `payments`, `payment_webhook_events`, `refunds`, `invoices`

### F. Promotion

- `promotions`, `promotion_scopes`, `promotion_redemptions`

### G. Review & Notification

- `reviews`, `review_media`, `review_votes`
- `notification_templates`, `notifications`

### H. Blog / SEO

- `blog_categories`, `blog_tags`, `blog_posts`, `blog_post_translations`, `blog_post_tags`, `blog_post_related_tours`

### I. Wishlist / Favorites

- `user_favorite_tours`

### J. Messaging / Inbox

- `conversations`, `conversation_participants`, `messages`, `message_attachments`

### K. CMS / System Config

- `cms_pages`, `cms_page_translations`
- `support_faq_categories`, `support_faq_items`
- `system_settings`

### L. Platform Reliability

- `idempotency_keys`, `outbox_events`, `api_keys`, `audit_logs`

## 4) Quy tắc dữ liệu quan trọng

- Idempotency cho booking/payment:
  - `bookings.idempotency_key` unique có điều kiện.
  - `payments.idempotency_key` unique có điều kiện.
  - Bảng `idempotency_keys` dùng cho endpoint critical.
- Chống overbooking:
  - `inventory_slots` có ràng buộc `held + booked <= capacity + oversell_limit`.
  - Lock cập nhật inventory bằng transaction + `FOR UPDATE` ở tầng application.
- Giá và tiền tệ:
  - Dùng `NUMERIC(12,2)` hoặc `NUMERIC(14,2)` cho money.
  - Lưu snapshot giá ở `booking_items` để chống thay đổi giá sau đặt.
- Audit + Event:
  - Log thay đổi quản trị ở `audit_logs`.
  - Dùng `outbox_events` cho publish event bất đồng bộ.

## 5) Query/index nóng đã có trong schema

- Tìm tour theo city + status.
- Lấy departure theo option + thời gian.
- Danh sách booking theo user/supplier/status + thời gian.
- Lấy review theo tour + trạng thái.
- Poll outbox pending events.
- Feed blog theo `status + published_at`.
- Inbox hội thoại theo `status + updated_at`.

## 6) Kế hoạch scale theo mốc tải

### Giai đoạn 1 (MVP, chi phí thấp)

- 1 Postgres primary.
- 1 Redis nhỏ (cache + queue + rate limit).
- Materialized view `tour_search_projection` cho search cơ bản.

### Giai đoạn 2 (tăng trưởng)

- Thêm read replica cho API đọc nặng.
- Tách search ra OpenSearch khi catalog lớn.
- Partition bảng lớn theo thời gian: `bookings`, `payments`, `audit_logs`, `outbox_events`.

### Giai đoạn 3 (quy mô lớn)

- Tách service `inventory/booking` độc lập.
- Event bus chuyên dụng (Kafka/RabbitMQ).
- Multi-region read + DR.

## 7) Triển khai vào NestJS (đề xuất)

- Bước 1: chọn ORM/migration tool (`Prisma` hoặc `TypeORM`) rồi convert schema SQL thành migration đầu tiên.
- Bước 2: triển khai module theo thứ tự:
  1. `auth`, `users`
  2. `suppliers`, `catalog`
  3. `inventory`, `bookings`
  4. `payments`, `refunds`
  5. `cms_pages`, `system_settings` (support/terms/policy)
  6. `blog`, `favorites`
  7. `messaging`
- Bước 3: viết e2e test cho 3 flow bắt buộc:
  - Hold slot thành công + tự hết hạn.
  - Confirm booking không overbook khi concurrent.
  - Payment webhook retry không tạo giao dịch trùng.

## 8) Những bảng có thể hoãn để tiết kiệm chi phí sớm

Nếu muốn ra MVP nhanh hơn, có thể tạm hoãn:

- `supplier_settlements`
- `review_media`, `review_votes`
- `notifications` đa kênh (giữ email trước)
- `exchange_rates` (nếu chỉ 1 currency lúc đầu)
- `api_keys`
- realtime messaging qua websocket (giữ inbox async trước)
- `blog_post_translations` (nếu chưa đa ngôn ngữ)

Khi user tăng, bật dần mà không cần phá schema lõi.

## 9) Ý kiến cho các phần bạn nêu

- Blog SEO: nên làm sớm sau booking core vì chi phí thấp và tác động traffic tự nhiên cao.
- Tour yêu thích: nên làm ngay, bảng nhẹ nhưng tăng conversion và remarketing.
- Nhắn tin: nên làm 2 pha, pha 1 inbox async; pha 2 websocket realtime khi lượng user tăng.
- CMS/support/terms/cấu hình: nên có ngay từ đầu để team vận hành tự cập nhật nội dung mà không cần deploy.

## 10) Validation checklist (DB-level)

- Email user: `users.email` là `UNIQUE` (case-insensitive do `CITEXT`) + regex check format.
- Email supplier: `suppliers.email` có regex check + unique index có điều kiện (`WHERE email IS NOT NULL`).
- Booking contact: `bookings.contact_email` + `bookings.contact_phone_e164` có format check.
- Phone E.164: `users.phone_e164` và `suppliers.phone_e164` có regex check `+` quốc tế.
- Promotion: ràng buộc giới hạn số âm, giới hạn `% <= 100`, giới hạn usage >= 0.
- Payment amount: `authorized/captured/refunded` không âm và không vượt `amount/captured`.
- Pricing rule: `amount >= 0`, `days_of_week` chỉ nhận 1..7 và không rỗng.
- Departure status: đã chuyển sang enum `departure_slot_status` để tránh nhập sai text.
- Country currency: `countries.currency_code` đã có foreign key sang `currencies(code)`.
