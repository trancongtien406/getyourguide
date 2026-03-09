# Upload + CDN + Load Balancer Blueprint

## 1) Luồng upload chuẩn production

1. Frontend gọi `POST /uploads/presign` (đã login).
2. Backend tạo presigned URL PUT vào Object Storage (S3-compatible).
3. Frontend upload file trực tiếp lên Object Storage bằng URL đã ký.
4. Frontend lưu `key` hoặc `cdnUrl` vào entity (tour/blog/media).
5. Ảnh/tệp được đọc qua CDN domain (`CDN_BASE_URL`) thay vì gọi trực tiếp API backend.

## 2) Tại sao đúng chuẩn

- Backend không nhận file binary => giảm tải CPU/RAM.
- API server stateless => scale ngang dễ sau Load Balancer.
- CDN cache edge => giảm latency và egress từ origin.

## 3) Cấu hình cần có

- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ENDPOINT` (để trống nếu dùng AWS S3 chuẩn)
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`
- `OBJECT_STORAGE_FORCE_PATH_STYLE` (`true` nếu dùng MinIO/Cloudflare R2 path-style)
- `CDN_BASE_URL` (ví dụ `https://cdn.example.com`)

## 4) Gợi ý hạ tầng

- LB: Application Load Balancer hoặc Nginx Ingress.
- Backend: nhiều instance NestJS sau LB.
- Storage: S3/R2/MinIO cluster.
- CDN: CloudFront/Cloudflare/Akamai trỏ về bucket hoặc storage endpoint.

## 5) Bảo mật bắt buộc

- Presigned URL thời gian ngắn (10 phút).
- Chỉ cấp content type hợp lệ (allow-list): `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`, `video/mp4`, `application/pdf`.
- Không cho public write trực tiếp không qua presign.
- CORS bucket chỉ cho domain frontend.
- Bật malware scanning async nếu cần compliance.
