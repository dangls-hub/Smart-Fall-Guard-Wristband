# Báo cáo pin — CHƯA ĐO

Người phụ trách: Trần Đình Nam. Mục tiêu mong muốn ≥24 giờ; chưa chốt dung lượng để bảo đảm mục tiêu.

Ghi: ngày thử, commit firmware, mã bo/IMU/charger/converter, pin và dung lượng danh định, điện áp cắt, chu kỳ telemetry, mức Wi-Fi, chế độ sleep, số lần còi và nhiệt độ môi trường.

| Chế độ | Điện áp pin | Dòng trung bình | Dòng đỉnh / sụt áp | Thời gian quan sát |
|---|---|---|---|---|
| Lấy mẫu + MQTT online | Chưa đo | Chưa đo | Chưa đo | — |
| Mất Wi-Fi + reconnect | Chưa đo | Chưa đo | Chưa đo | — |
| Còi + truyền cảnh báo | Chưa đo | Chưa đo | Chưa đo | — |
| Sleep theo firmware thực | Chưa đo | Chưa đo | Chưa đo | — |

Đo dòng tại phía pin cho toàn bộ hệ thống. Đo runtime từ sạc đầy đến cutoff với firmware nghiệm thu; lưu log voltage/time, reset/brownout và số mẫu bị trễ. USB meter đo đường 5 V không thay thế phép đo runtime từ pin.

Ước lượng lý tưởng 400 mAh / 24 h = 16,7 mA; hiệu suất converter, dòng tĩnh, dung lượng hữu dụng và dự phòng làm giảm runtime. Không dùng dòng deep sleep làm trung bình của ứng dụng lấy mẫu 50 Hz.

Kết quả runtime: **chưa đo**. Link log thô và kết luận: **chưa có**.
