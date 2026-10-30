# REST API — khung Spiral 1 và kế hoạch tiếp theo

SP1-BE-02 khai báo hai route GET qua controllers hiện có. **Route đã tồn tại nhưng chưa có truy vấn nghiệp vụ**: luôn trả HTTP **501** với JSON lỗi, không đọc CSDL, không trả dữ liệu giả hoặc danh sách rỗng thay cho kết quả truy vấn. Backend local mặc định `http://127.0.0.1:5000`, frontend `http://localhost:5173`.

## Hợp đồng hiện tại

| Method | URL | Mục đích dự kiến | Hiện tại |
|---|---|---|---|
| GET | `/api/devices` | Danh sách thiết bị người dùng được phép xem | 501, `error.code = NOT_IMPLEMENTED` |
| GET | `/api/events` | Lịch sử sự kiện người dùng được phép xem | 501, `error.code = NOT_IMPLEMENTED` |

Không cần request body. Query/filter/phân trang như `device_id`, `from`, `to`, `limit` chưa được hỗ trợ: không áp dụng và không được coi là đã lọc dữ liệu; request có query vẫn trả cùng 501. Hiện chưa có xác thực/phân quyền REST, đọc dữ liệu, thay đổi trạng thái hoặc downlink. CORS không thay thế xác thực.

Khởi động backend theo README với Node 22 và cấu hình MQTT hợp lệ; không cần CSDL để hai stub này phản hồi. Broker tạm thời không sẵn sàng cũng không chặn Express phục vụ. Ví dụ gọi từ PowerShell:

```powershell
curl.exe -i http://127.0.0.1:5000/api/devices
curl.exe -i http://127.0.0.1:5000/api/events
```

`GET /api/devices` trả `HTTP/1.1 501 Not Implemented`, `Content-Type: application/json; charset=utf-8`:

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "API danh sách thiết bị chưa được triển khai."
  }
}
```

`GET /api/events` trả cùng status/content type, với thông báo riêng:

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "API lịch sử sự kiện chưa được triển khai."
  }
}
```

**404 khác 501**: đường dẫn chưa khai báo, ví dụ `GET /api/not-a-route`, vẫn trả 404 mặc định của Express; chưa cam kết JSON envelope cho 404. Hai route trên đã được khai báo nên trả 501 thay vì 404. Không có response 200 hoặc kết quả đọc database từ hai handler hiện tại.

## Ví dụ thành công dự kiến ở Spiral 2 — chưa triển khai

Các ví dụ HTTP 200 bên dưới chỉ là **đề xuất hợp đồng để phối hợp**, không phải dữ liệu demo mà backend đang trả. Envelope `data`, quy tắc null, timezone, phân trang và quyền truy cập phải được chốt khi triển khai nghiệp vụ.

`GET /api/devices`, HTTP 200 dự kiến:

```json
{
  "data": [
    {
      "device_id": "esp32_001",
      "mac_address": null,
      "battery_level": 87,
      "status": "OFFLINE",
      "last_seen": "2026-11-08T10:00:00.000Z"
    }
  ]
}
```

Các trường tương ứng bảng `devices` trong `database/schema.sql`; status/last_seen cần được cập nhật từ luồng nhận dữ liệu khi luồng đó được triển khai, không suy trạng thái thật từ UI tĩnh hoặc retained status cũ.

`GET /api/events`, HTTP 200 dự kiến theo schema nền hiện có:

```json
{
  "data": [
    {
      "id": 1,
      "device_id": "esp32_001",
      "svm_peak": 3.42,
      "pitch_angle": 68.0,
      "is_resolved": false,
      "is_synced": false,
      "created_at": "2026-11-08T10:00:00.000Z"
    }
  ]
}
```

`id` ở ví dụ là khóa `SERIAL` của `fall_events`, không phải MQTT `event_id`. `pitch_angle` là tên cột schema hiện tại, chưa có mapping từ payload MQTT `pitch`. Các chuỗi thời gian UTC chỉ minh họa định dạng API dự kiến; các cột SQL hiện là `TIMESTAMP`, chưa có cơ chế chuẩn hóa timezone trong helper.

Theo `ARCHITECTURE_REVIEW.md` và `MQTT_TOPICS_SPEC.md`, ingest sau này cần `event_id`, `UNIQUE(device_id,event_id)`, thời điểm xảy ra/nhận và ACK sau commit. Những trường/migration đó **chưa có trong schema nền**, phải phối hợp Tiến ở task tương ứng trước khi hứa dedup/ACK hoặc truy vấn dữ liệu đó. BE-02 không sửa schema/helper và không triển khai persistence.

## Các endpoint Spiral sau — dự kiến, chưa khai báo

| Endpoint dự kiến | Mục đích | Điều kiện khi triển khai |
|---|---|---|
| GET `/api/devices/:id/telemetry` | Mẫu giám sát gần nhất | Kiểm tra quyền, giới hạn số điểm/phân trang |
| POST `/api/events/:id/resolve` | Ghi nhận hỗ trợ/báo nhầm | Xác thực, quyền, audit; không xóa sự kiện |
| POST `/api/devices/:id/command` | Gửi lệnh MQTT | Whitelist action/params; trả command_id và trạng thái chờ ACK |

Các route dự kiến trên hiện vẫn trả 404; không được tự xem là API đang hoạt động.

## Yêu cầu trước khi mở API ra ngoài

Trước khi mở LAN/Internet: xác thực phiên/token, kiểm tra quyền người giám hộ theo thiết bị trên mọi endpoint và Socket.io room, HTTPS/WSS, giới hạn payload/rate và truy vấn SQL có tham số. Không để frontend dùng credentials broker/backend. Giữ backend mặc định loopback khi các điều kiện này chưa được triển khai.

Socket event mục tiêu là `EMERGENCY_FALL_DETECTED`, vẫn chưa triển khai. Chỉ phát sau khi sự kiện được lưu; payload có event_id, device_id và thời điểm xảy ra/nhận. Cảnh báo gửi bù phải được nhận diện. Khi client reconnect, nạp lại sự kiện chưa xử lý từ REST để tránh chỉ phụ thuộc push. Không đánh dấu toàn bộ Spiral 1 hoàn thành từ việc có API stub.
