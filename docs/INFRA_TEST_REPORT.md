# Báo cáo hạ tầng — CHƯA KIỂM THỬ RUNTIME

Người phụ trách: Phạm Việt Tiến. Ghi commit, ngày, máy chủ, phiên bản Docker/Mosquitto/PostgreSQL, cấu hình mạng và đường dẫn log.

| Ca thử | Điều kiện đạt | Kết quả |
|---|---|---|
| Auth/ACL | Anonymous/sai mật khẩu bị từ chối; thiết bị không truy cập chéo | Chưa thử |
| TLS | CA và SAN đúng thành công; sai CA/SAN bị từ chối | Chưa thử |
| PostgreSQL init | Schema được tạo trên data directory rỗng, restart giữ dữ liệu | Chưa thử |
| 50 kết nối | Ghi CPU/RAM, throughput, lỗi và latency | Chưa thử |
| Offline 10 sự kiện | Đủ 10 bản ghi duy nhất sau reconnect, ACK sau commit | Chưa thử |
| Mất ACK/restart | Retry cùng event_id không nhân bản sự kiện/webhook | Chưa thử |
| Queue đầy/cắt nguồn lúc ghi | Chính sách rõ ràng, không làm mất toàn queue | Chưa thử |
| Heartbeat | Đo 10 lần; ghi sai số của chu kỳ quét, mục tiêu ≤15 giây | Chưa thử |
| LWT | Đo riêng thời gian theo keepalive, không gộp với heartbeat | Chưa thử |

Thời gian mạng mất không có cảnh báo từ xa qua Wi-Fi. Phân biệt thời điểm ngã và thời điểm đồng bộ; không ghi đồng bộ bù là cảnh báo thời gian thực thành công.

Kiểm tra Compose tĩnh không thay thế các ca thử trong bảng.
