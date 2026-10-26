# Kiểm tra bản cập nhật thiết kế — 26/10/2026

## Đã chạy

- `git diff --check`: không có lỗi whitespace.
- `node --check backend/server.js`: cú pháp hợp lệ.
- `docker compose --env-file .env.example config --quiet`: cấu hình local hợp lệ.
- `docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.tls.yml config --quiet`: cấu hình TLS hợp lệ.
- Kiểm tra JSON Compose sau merge: bản local chỉ map MQTT 1883; bản TLS chỉ map 8883, có đúng một mount cấu hình broker và PostgreSQL giữ loopback.
- Kiểm tra đường dẫn Markdown nội bộ và hai bản kế hoạch Spiral: hợp lệ, nội dung hai thư mục khớp nhau.
- Cài dependencies backend với `--ignore-scripts`; tạo package-lock.json.
- Smoke test backend bằng tiến trình riêng và cổng tạm: khởi động thành công, đọc HOST/PORT từ môi trường, CORS preflight trả 204 với origin cấu hình; API chưa triển khai trả 404. Tiến trình thử đã được dừng.

## Chưa thể xác nhận

Docker Engine chưa chạy nên chưa khởi động Mosquitto/PostgreSQL, chưa thử xác thực/ACL/TLS thực tế hoặc chạy SQL init. Chứng chỉ hiện có vẫn là placeholder; cần tạo cert và passwd thật theo DEPLOYMENT.md.

Chưa có phép đo phần cứng, pin, độ chính xác hoặc độ trễ đầu-cuối. Việc kiểm tra cấu hình và backend khung không thay thế nghiệm thu các chức năng đó.
