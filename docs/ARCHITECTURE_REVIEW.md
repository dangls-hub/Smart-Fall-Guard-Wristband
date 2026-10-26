# Rà soát kiến trúc — 26/10/2026

## Hiện trạng

Repo có khung thư mục, schema SQL, cấu hình broker, server Express tối thiểu và trang React tiêu đề. Driver cảm biến, FSM, buffer, MQTT consumer, CSDL helper, Socket.io, webhook và API còn thiếu phần triển khai. Các số liệu 92%, 28,5 giờ và độ trễ 0,85–1,45 giây trước đây không có log thử nghiệm đi kèm nên đã bỏ khỏi bảng kết quả.

## Quyết định thiết kế

| Hạng mục | Quyết định | Lý do / yêu cầu triển khai |
|---|---|---|
| Xử lý ngã | Tại ESP32, độc lập mạng | Mất broker không được ngừng lấy mẫu hoặc báo tại chỗ |
| Cảm biến | MPU6050 ±8 g, accel + gyro, 50 Hz | 4096 LSB/g chỉ đúng với dải này; kiểm tra saturation, offset, dt |
| Vị trí đeo | Cổ tay cho prototype | Không suy luận góc thân người trực tiếp từ góc cổ tay; cần dữ liệu thực |
| Thuật toán | FSM ngưỡng làm bản nền | Timeout từng pha; đánh giá ngã không có rơi tự do và báo giả do vung tay |
| Nguồn | USB trước; Li-Po 1S + power path + buck-boost sau | Loại phương án AMS1117 sau pin 1S; chốt pin bằng phép đo |
| CSDL | PostgreSQL | Phù hợp schema SERIAL/JSONB; bỏ phụ thuộc SQLite |
| Backend | Một tiến trình Express/MQTT/Socket.io/heartbeat | Quy mô đồ án chưa cần thêm daemon hay microservice |
| Broker | Mật khẩu + ACL theo username=device_id | Chỉ backend được phát lệnh tới các thiết bị |
| Truy cập LAN | MQTT TLS 8883; frontend qua backend | Không cần MQTT WebSocket 9001; CA và SAN phải được xác minh |
| Offline | Hàng đợi có giới hạn, event_id ổn định và ACK sau commit | QoS 1 không bảo đảm đúng một lần; mất ACK phải retry cùng ID |
| Cảnh báo | Lưu sự kiện trước, gửi Telegram/email sau | Lỗi nhà cung cấp không làm mất sự kiện; retry webhook có giới hạn |
| Mô phỏng | Payload có nguồn simulator; không trộn kết quả phần cứng | Demo UI không chứng minh thuật toán trên sensor thật |

## Các hợp đồng cần hoàn thiện

- Thêm vào fall_events khi triển khai ingest: event_id do thiết bị tạo, UNIQUE(device_id, event_id), thời điểm xảy ra và thời điểm server nhận. Schema hiện tại vẫn là bản nền, chưa có migration/dedup.
- Backend gửi event_ack chỉ sau transaction commit; sự kiện trùng cũng ACK để thiết bị dọn queue. Queue phải giữ sự kiện qua reboot, ghi atomic và có chính sách khi đầy.
- Dùng command_id và command_ack để phân biệt lệnh đã gửi/đã nhận/đã áp dụng/thất bại; ACK nhận MQTT không đồng nghĩa còi đã tắt.
- Giữ trạng thái cảnh báo và trạng thái hỗ trợ riêng: CANCEL_ALARM tắt còi; resolve đánh dấu xử lý; không được ngầm thay đổi lịch sử sự kiện.
- Chỉ persist sự kiện quan trọng, không ghi flash mỗi mẫu 20 ms. Thử cắt nguồn trong lúc ghi, trong lúc sync và khi nhận ACK.
- Không dùng timestamp Unix giả khi chưa đồng bộ thời gian: lưu boot_id + uptime_ms, thời gian UTC có thể null. NTP/TLS phải có trình tự khởi tạo rõ ràng.
- Backend xác thực phiên/token và quyền người giám hộ theo thiết bị cho REST, Socket.io room và resolve/commands. CORS không thay thế xác thực.
- Payload phải được kiểm tra kích thước, kiểu, khoảng giá trị và device_id từ topic; reject command chưa biết, không nhận retained command cũ.
- Heartbeat dự kiến 5 giây, timeout 15 giây; quét theo timer có sai số, cần đo thực. LWT phụ thuộc keepalive/broker, không cam kết giống timeout heartbeat.
- Giới hạn lưu telemetry và tạo index theo device_id/thời gian; đo 50 Hz tại biên nhưng telemetry mỗi 2 giây chỉ là mẫu giám sát. Muốn xem dạng sóng va chạm phải gửi cửa sổ mẫu theo lô.
- Web chỉ nhận cảnh báo sau khi mở và kết nối; kiểm thử quyền phát âm thanh của trình duyệt. Không xem Telegram/email là kênh luôn sẵn sàng.

## Thứ tự triển khai và điều kiện chuyển bước

1. USB + I²C scanner + cảm biến: đọc đúng ID/range, có raw log accel/gyro, đo chu kỳ và số mẫu trễ.
2. FSM + nút/còi: không chặn loop, có timeout và test log cho từng nhánh; bấm hủy ở sát 15 giây.
3. Broker + PostgreSQL + MQTT consumer: lưu và chống trùng sự kiện, xác thực quyền topic.
4. Dashboard + webhook: kiểm thử cảnh báo từ firmware thật, tách thời gian phát hiện và thời gian truyền.
5. Offline: retry, ACK sau commit, backend/broker/device reboot và queue đầy; phân biệt sự kiện gửi bù để tránh báo như ngã vừa xảy ra.
6. Pin + vỏ: kiểm tra brownout, nhiệt, dòng trung bình/đỉnh và runtime thực với cùng firmware dùng nghiệm thu.
7. Kiểm thử tách tập hiệu chỉnh và tập đánh giá, báo confusion matrix và báo giả/giờ.

## Nguồn kỹ thuật

- [ESP32 DevKitC: chỉ một đường cấp nguồn tại một thời điểm](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html).
- [ESP32-WROOM-32E: điện áp và dòng RF](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html).
- [MPU6050: dải đo và giới hạn điện](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet.pdf).
- [Mosquitto: listener, password_file, ACL và TLS](https://mosquitto.org/man/mosquitto-conf-5.html).
- [PostgreSQL official image: init scripts và volumes](https://hub.docker.com/_/postgres).
