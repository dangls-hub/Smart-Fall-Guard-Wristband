# KẾ HOẠCH CHI TIẾT SPIRAL 3: TỐI ƯU BỘ ĐỆM NGOẠI TUYẾN, CẢNH BÁO ĐA KÊNH & BỘ MÔ PHỎNG ẢO
* **Dự án:** Vòng tay thông minh cảnh báo té ngã (Smart Fall-Guard Wristband)
* **Nhóm thực hiện:** Nhóm 4 – GEHIHI
* **Thời gian thực hiện:** Tuần 3 (Từ ngày 15/11/2026 đến 21/11/2026)
* **Trạng thái:** Kế hoạch thực hiện

---

## 1. MỤC TIÊU CỐT LÕI CỦA SPIRAL 3
1. Cài đặt cơ chế lưu trữ ngoại tuyến (Offline Buffer) vào bộ nhớ Flash ESP32 bằng SPIFFS/LittleFS khi mất kết nối Wi-Fi.
2. Xây dựng cơ chế tự động gửi bù (Sync Telemetry/Alert) ngay khi kết nối Wi-Fi được khôi phục, đảm bảo không mất mát dữ liệu sự cố.
3. Hoàn thiện tính năng truyền lệnh hai chiều (Downlink): Gửi lệnh từ Web Dashboard xuống vòng tay (`CANCEL_ALARM`, `FIND_DEVICE`, `CONFIG_THRESHOLD`).
4. Tích hợp Webhook cảnh báo khẩn cấp đa kênh: Tự động gửi tin nhắn báo động kèm thông số lực va chạm tới Telegram Bot và Email của người thân.
5. Xây dựng bộ mô phỏng phần cứng **Virtual ESP32 Simulator** trên Web giúp giả lập đầy đủ các kịch bản ngã và báo giả để phục vụ kiểm thử và thuyết trình.

---

## 2. PHÂN TÍCH RỦI RO & PHƯƠNG ÁN GIẢM THIỂU (RISK MANAGEMENT)
| Rủi ro kỹ thuật phát hiện | Mức độ | Phương án xử lý trong Spiral 3 |
|---|:---:|---|
| Bộ nhớ Flash SPIFFS bị đầy hoặc hao mòn nếu ghi liên tục dữ liệu telemetry. | Cao | Chỉ lưu các gói tin quan trọng vào SPIFFS khi mất mạng: Gói tin Cảnh báo té ngã (`/alert`) và trạng thái pin; không lưu telemetry định kỳ vào Flash. |
| Người dùng bấm nút hủy từ Web Dashboard nhưng vòng tay không nhận được do độ trễ mạng. | Trung bình | Sử dụng cơ chế MQTT QoS 1 cho topic lệnh `commands` đảm bảo gói tin được gửi đến vòng tay ít nhất 1 lần (At least once). |
| API gửi Telegram Bot hoặc SMS bị chặn rate limit hoặc mất kết nối ngoài internet. | Thấp | Bọc cơ chế Try-Catch và hàng đợi (Queue), log lỗi vào database và ưu tiên phát WebSocket trong mạng nội bộ trước. |

---

## 3. PHÂN CÔNG NHIỆM VỤ CHI TIẾT THEO THÀNH VIÊN

### 🛠️ 1. Trần Đình Nam – Embedded & Firmware Lead
* **Task ID: SP3-HW-01**
  * **Nhiệm vụ:** Lập trình Bộ đệm ngoại tuyến bằng bộ nhớ Flash SPIFFS (Offline Data Buffer).
  * **Các bước thực hiện:**
    1. Khởi tạo phân vùng `SPIFFS.begin(true)` trên ESP32.
    2. Viết hàm `saveEventToOfflineBuffer(jsonPayload)`: Khi kiểm tra `WiFi.status() != WL_CONNECTED` hoặc `!mqttClient.connected()`, ghi nối gói tin vào file `/offline_events.json`.
    3. Định kỳ kiểm tra kết nối mạng trong hàm `loop()`. Khi mạng online trở lại, đọc tuần tự từng dòng trong file, gửi lên topic `fallguard/v1/devices/{id}/sync` và xóa file đệm sau khi gửi thành công.
  * **File bàn giao:** `firmware/spiffs_buffer.h`, `firmware/spiffs_buffer.cpp`.
  * **Thời gian:** 15/11/2026 – 17/11/2026 (12 giờ làm việc).

* **Task ID: SP3-HW-02**
  * **Nhiệm vụ:** Xử lý lệnh Downlink nhận từ MQTT Broker và cấu hình ngưỡng động.
  * **Các bước thực hiện:**
    1. Viết callback `mqttCallback(topic, payload)` lắng nghe topic `fallguard/v1/devices/{id}/commands`.
    2. Xử lý lệnh `CANCEL_ALARM`: Ngắt ngay lập tức còi Buzzer và tắt đèn LED đỏ.
    3. Xử lý lệnh `FIND_DEVICE`: Kích hoạt còi kêu bíp bíp 3 lần và nháy đèn xanh để người thân tìm thấy vị trí vòng tay trong phòng.
    4. Xử lý lệnh `CONFIG_THRESHOLD`: Cho phép cập nhật giá trị ngưỡng va chạm (ví dụ: thay đổi từ $2.8g$ sang $3.0g$) mà không cần nạp lại code.
  * **File bàn giao:** `firmware/SmartFallGuard.ino`.
  * **Thời gian:** 18/11/2026 – 20/11/2026 (12 giờ làm việc).

---

### ☁️ 2. Phạm Việt Tiến – IoT Infrastructure & Cloud Lead
* **Task ID: SP3-INF-01**
  * **Nhiệm vụ:** Cấu hình MQTT Last Will and Testament (LWT) & Tối ưu hóa Topic Downlink.
  * **Các bước thực hiện:**
    1. Thiết lập gói tin LWT khi ESP32 kết nối Broker: Payload `{"status": "OFFLINE", "reason": "UNEXPECTED_DISCONNECT"}` với `Retain = true` tại topic `/status`.
    2. Khi Broker phát hiện ESP32 mất tín hiệu KeepAlive đột ngột (sau 15s), Broker tự động publish gói tin LWT cho Server.
    3. Kiểm tra đồng bộ cơ sở dữ liệu khi nhận gói tin từ topic `/sync`, đảm bảo các sự kiện ngoại tuyến được đánh dấu cờ `is_synced = true` và sắp xếp đúng mốc thời gian `created_at`.
  * **File bàn giao:** `broker/mosquitto.conf`, `database/schema.sql` (Cập nhật cột `is_synced`).
  * **Thời gian:** 15/11/2026 – 17/11/2026 (10 giờ làm việc).

* **Task ID: SP3-INF-02**
  * **Nhiệm vụ:** Quản lý cấu hình triển khai hệ thống tập trung (.env và Docker).
  * **Các bước thực hiện:**
    1. Chuẩn hóa toàn bộ biến môi trường của hệ thống vào file `.env.example`: `MQTT_HOST`, `MQTT_PORT`, `DB_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
    2. Kiểm tra container hóa toàn bộ hệ thống bằng lệnh `docker compose up -d` trên môi trường sạch để chuẩn bị bàn giao cho môn học.
  * **File bàn giao:** `docker-compose.yml`, `.env.example`.
  * **Thời gian:** 18/11/2026 – 20/11/2026 (8 giờ làm việc).

---

### ⚡ 3. Nguyễn Hữu Chính – Backend Lead
* **Task ID: SP3-BE-01**
  * **Nhiệm vụ:** Tích hợp Webhook thông báo người thân qua Telegram Bot & Email.
  * **Các bước thực hiện:**
    1. Tạo Telegram Bot thông qua `@BotFather`, lấy Token và Chat ID người giám hộ.
    2. Cài đặt thư viện `node-telegram-bot-api` và `nodemailer`.
    3. Viết module `backend/services/webhookAlert.js`: Khi phát hiện sự kiện té ngã khẩn cấp, tự động định dạng tin nhắn HTML có còi cảnh báo, vị trí, lực va chạm và gửi ngay tới nhóm Telegram của gia đình.
    4. Thêm nút tương tác Inline Keyboard trên tin nhắn Telegram: `[Đã hỗ trợ an toàn]` hoặc `[Báo nhầm]`.
  * **File bàn giao:** `backend/services/webhookAlert.js`.
  * **Thời gian:** 15/11/2026 – 18/11/2026 (14 giờ làm việc).

* **Task ID: SP3-BE-02**
  * **Nhiệm vụ:** Viết API Downlink điều khiển thiết bị từ xa.
  * **Các bước thực hiện:**
    1. Xây dựng endpoint `POST /api/devices/:id/command` nhận body `{ "action": "CANCEL_ALARM" | "FIND_DEVICE" | "CONFIG_THRESHOLD", "params": {...} }`.
    2. Gọi `mqttClient.publish("fallguard/v1/devices/{id}/commands", JSON.stringify(payload))` với `QoS = 1`.
    3. Lưu vết lịch sử các lệnh điều khiển vào bảng `command_logs` trong CSDL.
  * **File bàn giao:** `backend/controllers/deviceController.js`, `backend/routes/api.js`.
  * **Thời gian:** 19/11/2026 – 21/11/2026 (10 giờ làm việc).

---

### 🖥️ 4. Đỗ Hải Đăng – Frontend & UI/UX Lead
* **Task ID: SP3-FE-01**
  * **Nhiệm vụ:** Xây dựng bộ mô phỏng phần cứng **Virtual ESP32 Simulator** trên Web.
  * **Các bước thực hiện:**
    1. Tạo component `VirtualSimulator.jsx` có giao diện mô phỏng bo mạch ESP32 và cảm biến MPU6050.
    2. Thiết kế các nút bấm kịch bản mô phỏng trực tiếp:
       * Nút 1: *"Đi bộ / Vận động bình thường"* (Sinh dữ liệu $SVM \approx 1.0g \pm 0.2g$).
       * Nút 2: *"Ngã trượt chân đập mông/lưng"* (Sinh chuỗi rơi $0.3g \rightarrow$ va đập $3.4g \rightarrow$ bất động).
       * Nút 3: *"Ngã chúi về phía trước"* (Sinh chuỗi rơi $0.4g \rightarrow$ va đập $2.9g \rightarrow \Delta Pitch > 50^\circ$).
       * Nút 4: *"Vỗ tay mạnh / Vung tay nhanh (Báo giả)"* (Va đập ngắn nhưng không có rơi tự do và không bất động).
       * Nút 5: *"Giả lập rớt mạng Wi-Fi"* (Đưa dữ liệu vào hàng đợi đệm ảo).
    3. Gửi các gói tin JSON mô phỏng này trực tiếp tới Backend hoặc Broker để nhóm có thể demo mọi lúc mọi nơi kể cả khi không mang phần cứng thật.
  * **File bàn giao:** `frontend/src/components/VirtualSimulator.jsx`.
  * **Thời gian:** 15/11/2026 – 19/11/2026 (16 giờ làm việc).

* **Task ID: SP3-FE-02**
  * **Nhiệm vụ:** Bổ sung các nút bấm điều khiển Downlink trên Web Dashboard.
  * **Các bước thực hiện:**
    1. Thêm nút "Tìm vòng tay" (gọi API `FIND_DEVICE`) kèm hiệu ứng rung/âm thanh.
    2. Thêm modal cài đặt ngưỡng gia tốc (gọi API `CONFIG_THRESHOLD`) cho phép người dùng điều chỉnh độ nhạy theo thể trạng người đeo.
  * **File bàn giao:** `frontend/src/components/DeviceSettingsModal.jsx`.
  * **Thời gian:** 20/11/2026 – 21/11/2026 (8 giờ làm việc).

---

## 4. TIÊU CHÍ NGHIỆM THU SPIRAL 3 (DEFINITION OF DONE - DoD)
* [x] Rút dây mạng Wi-Fi: ESP32 vẫn phát hiện ngã, lưu vào Flash SPIFFS; khi cắm lại Wi-Fi, tự động gửi bù gói tin lên Server.
* [x] Rút nguồn đột ngột ESP32: Dashboard và Server phát hiện chuyển trạng thái `OFFLINE` trong vòng 15s nhờ MQTT Last Will.
* [x] Bấm nút "Tìm vòng tay" trên Web: Vòng tay nhận được lệnh và còi Buzzer kêu bíp bíp tức thì.
* [x] Khi xảy ra sự kiện ngã: Tin nhắn cảnh báo kèm thông số gửi về Telegram Bot người thân trong vòng $\le 3s$.
* [x] Bộ mô phỏng Web Virtual Simulator hoạt động độc lập, kích hoạt được cả 5 kịch bản kiểm thử trực quan.

---

## 5. NHIỆM VỤ BÁO CÁO & HỌP ĐÁNH GIÁ CUỐI SPIRAL 3
* **Biên bản họp Spiral Review:** Thứ 7 ngày 21/11/2026.
* **Nội dung:** Đánh giá tính sẵn sàng của toàn hệ thống; rà soát các trường hợp ngoại lệ (mất mạng, hết pin, ngã đa chiều).
* **Đầu ra văn bản:** **Bản thảo Chương 3, 4, 5 của Báo cáo Bài tập lớn (BTL)** do cả 4 thành viên cùng phối hợp hoàn thành.
