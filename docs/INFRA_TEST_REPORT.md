# Báo cáo hạ tầng — ĐÃ KIỂM THỬ MỘT PHẦN

Người phụ trách: Trần Đình Nam. Ghi commit, ngày, máy chủ, phiên bản Docker/Mosquitto/PostgreSQL, cấu hình mạng và đường dẫn log.

| Ca thử | Điều kiện đạt | Kết quả |
|---|---|---|
| Auth/ACL | Anonymous/sai mật khẩu bị từ chối; thiết bị không truy cập chéo | Xem nghiệm thu MQTT local 28/10 trong VALIDATION.md và kết quả TLS 24/11 bên dưới |
| TLS | CA và SAN đúng thành công; sai CA/SAN bị từ chối | Đã kiểm thử trên Mosquitto thật qua loopback ngày 24/11 |
| PostgreSQL init | Schema được tạo trên data directory rỗng, restart giữ dữ liệu | 04/11: kết nối và truy vấn trên volume hiện có. 24/11: image PostgreSQL 17 nạp schema qua init hook trên container thử mới. Chưa thử giữ dữ liệu qua restart |
| 50 kết nối | Ghi CPU/RAM, throughput, lỗi và latency | Chưa thử |
| Offline 10 sự kiện | Đủ 10 bản ghi duy nhất sau reconnect, ACK sau commit | Chưa thử |
| Mất ACK/restart | Retry cùng event_id không nhân bản sự kiện/webhook | Chưa thử |
| Queue đầy/cắt nguồn lúc ghi | Chính sách rõ ràng, không làm mất toàn queue | Chưa thử |
| Heartbeat | Đo 10 lần; ghi sai số của chu kỳ quét, mục tiêu ≤15 giây | Đã chuyển ONLINE/OFFLINE với PostgreSQL thật và thiết bị mô phỏng. Chưa đạt mục tiêu ≤15 giây trong lượt đo và chưa đo 10 lần trên bo |
| LWT | Đo riêng thời gian theo keepalive, không gộp với heartbeat | Chưa thử |

Thời gian mạng mất không có cảnh báo từ xa qua Wi-Fi. Phân biệt thời điểm ngã và thời điểm đồng bộ; không ghi đồng bộ bù là cảnh báo thời gian thực thành công.

Kiểm tra Compose tĩnh không thay thế các ca thử trong bảng.

Bằng chứng SP1-INF-02 ngày 04/11/2026: xem [VALIDATION.md](VALIDATION.md#sp1-inf-02--04112026). Bộ test PostgreSQL đọc schema và kiểm tra helper, không restart CSDL hoặc sửa dữ liệu bền vững.

## Spiral 2 — 24/11/2026

- Môi trường thử độc lập trên Linux, Node.js 22.22.1, Docker Engine 29.10.0, Compose 5.8.0, Mosquitto 2.1.4 và PostgreSQL 17 Alpine. TLS mở cổng 8883 trên loopback và PostgreSQL dùng cổng loopback riêng. Không dùng cơ sở dữ liệu hay chứng chỉ triển khai của nhóm.
- **SP2-INF-01.** Backend và hai tài khoản thiết bị kết nối được với CA và SAN đúng. Broker/client từ chối CA sai, SAN sai, sai mật khẩu và kết nối ẩn danh. Cả hai thiết bị gửi được năm loại bản tin lên backend và chỉ nhận lệnh/ACK của chính mình. Broker chặn ghi chéo, thiết bị phát lệnh/ACK và backend ghi vào nhánh thiết bị dành riêng cho tên backend. Chạy lại bằng `node --env-file=.env scripts/check-mqtt-tls.cjs`. Xem [DEPLOYMENT.md](DEPLOYMENT.md).
- **SP2-INF-02.** Express nhận heartbeat qua Mosquitto TLS thật, ghi ONLINE vào PostgreSQL, bỏ qua bản tin retained phát lại và bản tin có ID khác topic. Khi dừng gửi, CSDL chuyển sang OFFLINE sau **19,706 giây**. API khung vẫn phản hồi HTTP 501. `npm test` trong backend đạt **23/23**. Kiểm thử riêng với MQTT giả lập qua TCP và PostgreSQL thật đạt, quan sát OFFLINE sau **19,742 giây** và xác nhận giữ nguyên `last_seen`.
- Ngưỡng 15 giây và chu kỳ quét 5 giây cho khoảng phát hiện danh nghĩa 15–20 giây tính từ heartbeat cuối, cộng trễ xử lý và truy vấn. Giữ đồng hồ backend và PostgreSQL đồng bộ, và dùng UTC cho các giá trị `last_seen` đã lưu. Kiểm thử 10 lần trên bo và chỉ tiêu ≤15 giây vẫn thuộc nghiệm thu. Thời gian LWT cần được đo riêng khi triển khai Spiral 3.

Để chạy lại bài PostgreSQL, tạo database thử trên `127.0.0.1` với tiền tố `fallguard_heartbeat_` và nạp `database/schema.sql`. Từ `backend`, đặt `HEARTBEAT_TEST_DB` và `POSTGRES_DB` bằng tên database thử, đặt `DB_HOST=127.0.0.1` cùng cổng và thông tin đăng nhập tương ứng, rồi chạy `node --test test/heartbeat.integration.js`.
