# Hợp đồng MQTT mục tiêu

Backend subscribe `fallguard/v1/devices/+/+`, log topic/JSON và bỏ qua JSON lỗi. SP2-INF-02 ghi heartbeat ONLINE vào PostgreSQL khi bật `HEARTBEAT_ENABLED=true`. Các luồng lưu telemetry và sự kiện, chống trùng, ACK nghiệp vụ và firmware tương ứng vẫn là kế hoạch.

Prefix: fallguard/v1/devices/{device_id}. Username mỗi thiết bị bằng device_id; backend dùng fallguard_backend. ID chỉ dùng chữ, số, dấu gạch dưới/gạch ngang; không chứa /, +, #. Server phải đối chiếu ID trong payload với ID trong topic.

| Suffix | Chiều | QoS | Retain | Nội dung |
|---|---|---:|---|---|
| telemetry | Thiết bị → backend | 0 | Không | Mẫu giám sát mỗi 2 giây, khác tốc độ lấy mẫu 50 Hz |
| alert | Thiết bị → backend | 1 | Không | Sự kiện ngã mới xác nhận |
| sync | Thiết bị → backend | 1 | Không | Gửi lại từng sự kiện trong queue |
| event_ack | Backend → thiết bị | 1 | Không | Xác nhận lưu bền vững theo event_id |
| status | Thiết bị/LWT → backend | 1 | Có | ONLINE/OFFLINE. Thiết bị gửi heartbeat ONLINE mỗi 5 giây |
| commands | Backend → thiết bị | 1 | Không | command_id, action, params, thời hạn |
| command_ack | Thiết bị → backend | 1 | Không | command_id, trạng thái áp dụng/lỗi |

Alert và sync dùng cùng schema và cùng event_id khi retry:

```json
{
  "event_id": "4b5494d2-5518-4c9d-a60c-ae036179a413",
  "device_id": "esp32_001",
  "event": "FALL_CONFIRMED",
  "source": "hardware",
  "boot_id": "boot-001",
  "uptime_ms": 25000,
  "occurred_at": null,
  "svm_peak": 3.42,
  "pitch": 68.0
}
```

occurred_at là UTC ISO-8601 khi đồng hồ đã đồng bộ, hoặc null khi chưa biết. boot_id + uptime_ms giúp đối chiếu log; backend luôn ghi thời điểm nhận riêng. Sự kiện source=simulator không được trộn vào KPI phần cứng.

ACK: {"event_id":"...","status":"STORED"}. Backend cần UNIQUE(device_id,event_id), transaction commit rồi mới ACK. Khi nhận trùng, ACK lại mà không tạo sự kiện/cảnh báo mới. Thiết bị chỉ xóa queue sau ACK; mất kết nối, timeout ACK hoặc reboot phải retry cùng ID. Không xem MQTT PUBACK là bằng chứng CSDL đã lưu.

Queue lưu cả sự kiện online trước lần gửi đầu tiên, có giới hạn và chính sách khi đầy; không ghi telemetry 50 Hz vào flash. Chưa có bảo đảm cảnh báo từ xa trong thời gian mạng mất. Dashboard phân biệt occurred_at và received_at cho dữ liệu gửi bù.

Lệnh có action thuộc CANCEL_ALARM, FIND_DEVICE, CONFIG_THRESHOLD. Bắt buộc kiểm tra kiểu/khoảng params, command_id, thời hạn; từ chối retained command. Lệnh trùng không áp dụng lặp tác dụng phụ. CANCEL_ALARM tắt còi, không tự resolve sự kiện.

Heartbeat sử dụng `{"device_id":"esp32_001","status":"ONLINE"}`. Backend đối chiếu ID trong payload với ID trên topic, bỏ qua bản tin phát lại với cờ retained và lưu thời gian backend nhận bản tin mới vào `last_seen`. Bản tin ONLINE được broker chuyển trực tiếp tới subscriber hiện tại vẫn là heartbeat hợp lệ. Backend quét mỗi 5 giây và đánh dấu OFFLINE khi đã qua ít nhất 15 giây kể từ heartbeat cuối.

LWT OFFLINE thuộc Spiral 3. Khi triển khai, đo thời gian phát hiện của LWT riêng vì nó phụ thuộc MQTT keepalive.

Phải chọn MQTT client firmware hỗ trợ publish QoS 1 và TLS. Xác nhận khả năng thư viện trước khi khóa dependencies; không suy ra QoS publish từ QoS subscribe. Với ESP-MQTT, cân nhắc enqueue để không chặn vòng cảm biến, và vẫn cần queue bền vững qua reboot.

Nguồn: [ESP-MQTT publish/enqueue](https://docs.espressif.com/projects/esp-mqtt/en/latest/esp32/).
