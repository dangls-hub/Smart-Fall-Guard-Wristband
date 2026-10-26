# API dự kiến — chưa triển khai

Express hiện chỉ mount router rỗng; các endpoint dưới đây chưa hoạt động. Backend local ở 127.0.0.1:5000, frontend ở localhost:5173. CORS không thay thế xác thực.

| Endpoint | Mục đích | Điều kiện khi triển khai |
|---|---|---|
| GET /api/devices | Danh sách thiết bị | Chỉ thiết bị được người dùng giám hộ |
| GET /api/devices/:id/telemetry | Mẫu giám sát gần nhất | Kiểm tra quyền, giới hạn số điểm/phân trang |
| GET /api/events | Lịch sử sự kiện | Lọc thời gian và quyền theo thiết bị, phân trang |
| POST /api/events/:id/resolve | Ghi nhận hỗ trợ/báo nhầm | Xác thực, quyền, audit; không xóa sự kiện |
| POST /api/devices/:id/command | Gửi lệnh MQTT | Whitelist action/params; trả command_id và trạng thái chờ ACK |

Trước khi mở LAN/Internet: xác thực phiên/token, kiểm tra quyền trên mọi endpoint và Socket.io room, HTTPS/WSS, giới hạn payload/rate và truy vấn SQL có tham số. Không để frontend dùng credentials broker/backend.

Socket event thống nhất: EMERGENCY_FALL_DETECTED. Chỉ phát sau khi sự kiện được lưu; payload có event_id, device_id và thời điểm xảy ra/nhận. Cảnh báo gửi bù phải được nhận diện. Khi client reconnect, nạp lại sự kiện chưa xử lý từ REST để tránh chỉ phụ thuộc push.

Schema CSDL hiện là bản nền; cần migration theo ARCHITECTURE_REVIEW.md trước khi triển khai chống trùng và ACK.
