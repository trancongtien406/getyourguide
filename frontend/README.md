# Frontend (Admin-first)

Giai đoạn hiện tại ưu tiên triển khai **Admin UI**. Phần client/public sẽ làm sau.

## Setup

Tạo file `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Điều chỉnh URL nếu backend chạy cổng khác.

## Run

First, run the development server:

```bash
npm run dev
```

Mở [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

## Available admin pages

- `/admin` (dashboard)
- `/admin/users`
- `/admin/catalog-types`
- `/admin/promotions`
- `/admin/payments`
- `/admin/audit-logs`

## Notes

- Chỉ role `ADMIN` được đăng nhập admin frontend.
- FE tự động thử refresh token khi access token hết hạn.
- Các trang admin kết nối trực tiếp tới backend NestJS trong thư mục `backend/`.

