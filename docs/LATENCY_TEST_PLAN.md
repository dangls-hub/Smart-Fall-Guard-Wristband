# Quy trình đo độ trễ — chưa đo

Ghi commit, cấu hình mạng và log thô của ít nhất 30 lần thử online. Liên kết các mốc bằng event_id.

| Mốc | Vị trí | Ý nghĩa |
|---|---|---|
| A0 | ESP32 | Va chạm/khởi đầu ca ngã được đánh dấu |
| A1 | ESP32 | Chuyển CONFIRMED_FALL sau xét tư thế, bất động và 15 giây hủy |
| B | Backend | Nhận MQTT |
| D | Backend | Commit sự kiện trong CSDL |
| C | Browser | Hiển thị modal sau Socket.io |
| T | Kênh ngoài | Ghi riêng API trả thành công và thời điểm điện thoại thực nhận |

Mục tiêu A1→C ≤2 giây khi online. A0→C là tổng độ trễ người dùng thấy, có ít nhất 3 giây bất động + 15 giây chờ hủy theo thiết kế; không áp mục tiêu 2 giây cho A0→C.

Không trừ uptime ESP32 với timestamp server/browser. Ghi UTC đồng bộ và sai số đồng hồ; nếu không đồng bộ đủ tốt, dùng quay video cùng khung hình hoặc thiết bị ghi mốc chung. Dùng clock đơn điệu cho khoảng thời gian trong cùng thiết bị.

Ghi từng lần, trung bình, p95, tối đa, số lần timeout/mất cảnh báo và sai số đo. Tách ca gửi bù offline khỏi latency online. HTTP thành công từ Telegram/email chưa chứng minh người thân đã nhận.

LATENCY_TEST_RESULTS.xlsx hiện là tệp rỗng; chỉ thay bằng bảng dữ liệu thật sau đo.
