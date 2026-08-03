# Payment Gateway Strategy (VN + International)

## 1) Đề xuất cổng thanh toán theo thị trường

- Thị trường Việt Nam (nội địa):
  - VNPay
  - MoMo
- Khách quốc tế:
  - Stripe (ưu tiên chính cho thẻ quốc tế và wallet)
  - PayPal (tuỳ chọn bổ sung cho một nhóm user quen dùng PayPal)

## 2) Lý do chọn

- VNPay/MoMo: phủ tốt kênh thanh toán nội địa VN.
- Stripe: SDK/API tốt, tài liệu đầy đủ, dễ mở rộng đa quốc gia, vận hành ổn định.
- PayPal: tăng conversion cho nhóm user không muốn nhập thẻ trực tiếp.

## 3) Yêu cầu “dễ triển khai / dễ vận hành”

- Nếu ưu tiên nhanh cho MVP:
  1. VNPay + MoMo + Stripe
  2. Thêm PayPal sau khi có dữ liệu conversion thực tế.
- Nếu ưu tiên tối giản tích hợp:
  - Dùng 1 aggregator có hỗ trợ cả local + global (tuỳ pháp nhân và điều kiện khu vực).

## 4) Admin bật/tắt cổng thanh toán

Đã có API cấu hình tại backend:

- Public checkout options: `GET /payments/options?countryCode=VN&currencyCode=VND`
- Admin xem cấu hình: `GET /payments/admin/settings`
- Admin cập nhật cấu hình: `PUT /payments/admin/settings`

API giao dịch thật đã tích hợp:

- Tạo phiên thanh toán VNPay (JWT): `POST /payments/vnpay/create`
- Tạo phiên thanh toán MoMo (JWT): `POST /payments/momo/create`
- VNPay IPN callback: `GET /payments/vnpay/ipn`
- MoMo IPN callback: `POST /payments/momo/ipn`

Payload tạo phiên thanh toán:

```json
{
  "bookingId": "<uuid>",
  "returnUrl": "https://your-frontend/checkout/return",
  "locale": "vi"
}
```

Khi callback thành công:

- `payments.status` -> `CAPTURED`
- `bookings.status` -> `CONFIRMED`

Khi callback thất bại:

- `payments.status` -> `FAILED`
- `bookings.status` -> `FAILED`
- `inventory_slots.booked_capacity` được rollback.

Quyền truy cập:

- `GET /payments/admin/settings`: ADMIN, OPERATOR
- `PUT /payments/admin/settings`: ADMIN

## 5) Dữ liệu cấu hình mẫu

```json
{
  "mode": "sandbox",
  "gateways": {
    "vnpay": { "enabled": true, "countries": ["VN"], "currencies": ["VND"] },
    "momo": { "enabled": true, "countries": ["VN"], "currencies": ["VND"] },
    "stripe": { "enabled": true, "countries": ["*"], "currencies": ["USD", "EUR", "GBP", "VND"] },
    "paypal": { "enabled": false, "countries": ["*"], "currencies": ["USD", "EUR", "GBP"] }
  }
}
```

## 6) Lưu ý tuân thủ

- Ký hợp đồng Merchant riêng với từng cổng (VNPay/MoMo/Stripe/PayPal).
- Webhook phải verify chữ ký và idempotency.
- Tách sandbox/live bằng cấu hình admin + secrets manager.
- Không lưu PAN thẻ trong hệ thống, tuân thủ PCI scope tối thiểu.

## 7) Biến môi trường bắt buộc

VNPay:

- `VNPAY_TMN_CODE`
- `VNPAY_HASH_SECRET`
- `VNPAY_PAYMENT_URL`
- `VNPAY_RETURN_URL`
- `VNPAY_IPN_URL`

MoMo:

- `MOMO_PARTNER_CODE`
- `MOMO_ACCESS_KEY`
- `MOMO_SECRET_KEY`
- `MOMO_ENDPOINT`
- `MOMO_REDIRECT_URL`
- `MOMO_IPN_URL`
