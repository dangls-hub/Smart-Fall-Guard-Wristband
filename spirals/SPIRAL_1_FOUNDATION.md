# KẾ HOẠCH CHI TIẾT SPIRAL 1: NỀN TẢNG PHẦN CỨNG, BROKER & THIẾT KẾ KIẾN TRÚC
* **Dự án:** Vòng tay thông minh cảnh báo té ngã (Smart Fall-Guard Wristband)
* **Nhóm thực hiện:** Nhóm 4 – GEHIHI
* **Thời gian thực hiện:** Tuần 1 (Từ ngày 01/11/2026 đến 07/11/2026)
* **Trạng thái:** Sẵn sàng triển khai

> Cập nhật thiết kế 26/10/2026: đây là kế hoạch, chưa có kết quả nghiệm thu. Tham chiếu `docs/ARCHITECTURE_REVIEW.md`, `docs/HARDWARE_BOM.md` và `docs/LATENCY_TEST_PLAN.md`. Chỉ đánh dấu hoàn thành khi có bằng chứng.

---

## 1. MỤC TIÊU CỐT LÕI CỦA SPIRAL 1
1. Hoàn thiện tài liệu kiến trúc tổng thể hệ thống 3 lớp (Edge Node $\rightarrow$ Cloud Broker & Backend $\rightarrow$ Dashboard).
2. Thiết kế xong sơ đồ nguyên lý phần cứng kết nối ESP32 với MPU6050, nút bấm và còi báo động.
3. Cài đặt và kích hoạt MQTT Broker (Mosquitto/EMQX) trên máy chủ/Docker, định nghĩa chuẩn cấu trúc Topic và Payload JSON.
4. Xây dựng Database Schema lưu trữ trạng thái thiết bị và dữ liệu telemetry.
5. Khởi tạo khung dự án Backend (Node.js/Express) và Frontend (React/Vite).

---

## 2. PHÂN TÍCH RỦI RO & PHƯƠNG ÁN GIẢM THIỂU (RISK MANAGEMENT)
| Rủi ro kỹ thuật phát hiện | Mức độ | Phương án xử lý trong Spiral 1 |
|---|:---:|---|
| MPU6050 bị nhiễu dây cáp I2C hoặc sai lệch địa chỉ I2C ($0x68$ vs $0x69$). | Trung bình | Kiểm tra chân AD0 (nối GND để cố định $0x68$). Viết script I2C Scanner trên ESP32 để phát hiện đúng địa chỉ trước khi code driver. |
| Xung đột phiên bản Node.js / thư viện MQTT khi chạy trên các máy khác nhau. | Thấp | Cung cấp file `docker-compose.yml` và chuẩn hóa phiên bản Node.js 22, file `.env.example`. |
| Chưa có thiết bị phần cứng thật để nhóm làm Frontend và Backend kiểm thử. | Cao | Tiến và Đăng thống nhất tạo payload JSON mẫu và mock dữ liệu ngay từ đầu tuần 1. |

---

## 3. PHÂN CÔNG NHIỆM VỤ CHI TIẾT THEO THÀNH VIÊN

### 🛠️ 1. Trần Đình Nam – Embedded & Firmware Lead
* **Task ID: SP1-HW-01**
  * **Nhiệm vụ:** Thiết kế Sơ đồ nguyên lý mạch điện phần cứng (Hardware Schematic).
  * **Các bước thực hiện:**
    1. Lựa chọn sơ đồ chân ESP32 NodeMCU 30-pin: GPIO 21 (SDA), GPIO 22 (SCL), GPIO 19 (Buzzer), GPIO 18 (Nút bấm kéo trở Pull-up), GPIO 23 (LED ngoài qua điện trở).
    2. Chạy USB trước; thiết kế pin Li-Po 1S có bảo vệ + sạc có power path + buck-boost 3,3 V. Chọn dòng sạc theo viên pin, thêm driver buzzer và kiểm tra cách ly nguồn khi nạp USB.
    3. Vẽ mạch trên Fritzing hoặc EasyEDA, xuất file sơ đồ mạch dạng PDF và PNG.
  * **File bàn giao:** `docs/hardware_schematic.pdf`, `docs/hardware_schematic.png`.
  * **Thời gian:** 01/11/2026 – 03/11/2026 (12 giờ làm việc).

* **Task ID: SP1-HW-02**
  * **Nhiệm vụ:** Viết chương trình kiểm tra I2C Scanner và kết nối Wi-Fi cơ bản.
  * **Các bước thực hiện:**
    1. Cài đặt môi trường Arduino IDE / PlatformIO cho vi điều khiển ESP32.
    2. Nạp code quét bus I2C để xác thực ESP32 giao tiếp tốt với MPU6050 tại địa chỉ `0x68`.
    3. Khởi tạo kết nối Wi-Fi sử dụng `WiFi.begin(ssid, password)` và kiểm tra in ra địa chỉ IP cục bộ qua Serial Monitor (115200 baud).
  * **File bàn giao:** `firmware/tests/i2c_scanner.ino`, `firmware/tests/wifi_test.ino`.
  * **Thời gian:** 04/11/2026 – 06/11/2026 (10 giờ làm việc).

---

### ☁️ 2. Phạm Việt Tiến – IoT Infrastructure & Cloud Lead
* **Task ID: SP1-INF-01**
  * **Nhiệm vụ:** Khởi tạo MQTT Broker Mosquitto và file cấu hình Docker Compose.
  * **Các bước thực hiện:**
    1. Viết file `docker-compose.yml` chứa service Mosquitto Broker và PostgreSQL.
    2. Cấu hình file `broker/mosquitto.conf` dùng 1883 có xác thực chỉ trên loopback; kết nối LAN dùng TLS 8883 qua override, không cần MQTT WebSockets.
    3. Thiết lập bảo mật cơ bản: tạo file `passwd` bằng `mosquitto_passwd` cấp tài khoản riêng theo `device_id` và `fallguard_backend`, áp ACL theo username.
  * **File bàn giao:** `docker-compose.yml`, `broker/mosquitto.conf`, `broker/acl.conf`.
  * **Thời gian:** 01/11/2026 – 03/11/2026 (10 giờ làm việc).

* **Task ID: SP1-INF-02**
  * **Nhiệm vụ:** Thiết kế Lược đồ Cơ sở dữ liệu và Cây Topic MQTT.
  * **Các bước thực hiện:**
    1. Soạn thảo tài liệu đặc tả cấu trúc Topic:
       * Telemetry: `fallguard/v1/devices/{device_id}/telemetry`
       * Cảnh báo: `fallguard/v1/devices/{device_id}/alert`
       * Trạng thái LWT: `fallguard/v1/devices/{device_id}/status`
    2. Viết file `database/schema.sql` khởi tạo 3 bảng chính: `devices`, `telemetry_logs`, `fall_events`.
    3. Viết module Node.js kết nối CSDL `database/db_helper.js`.
  * **File bàn giao:** `docs/MQTT_TOPICS_SPEC.md`, `database/schema.sql`, `database/db_helper.js`.
  * **Thời gian:** 04/11/2026 – 06/11/2026 (12 giờ làm việc).

---

### ⚡ 3. Nguyễn Hữu Chính – Backend Lead
* **Task ID: SP1-BE-01**
  * **Nhiệm vụ:** Khởi tạo Backend Server Express và kết nối MQTT Broker.
  * **Các bước thực hiện:**
    1. Khởi tạo dự án Node.js (`npm init -y`), cài đặt dependencies: `express`, `mqtt`, `dotenv`, `cors`, `pg`.
    2. Viết file `backend/server.js` cấu hình Express lắng nghe trên cổng 5000.
    3. Viết module `backend/services/mqttService.js` tự động kết nối Broker, subscribe topic `fallguard/v1/devices/+/+` và log dữ liệu nhận được ra console.
  * **File bàn giao:** `backend/package.json`, `backend/server.js`, `backend/services/mqttService.js`.
  * **Thời gian:** 02/11/2026 – 05/11/2026 (14 giờ làm việc).

* **Task ID: SP1-BE-02**
  * **Nhiệm vụ:** Thiết kế khung REST API sơ bộ.
  * **Các bước thực hiện:**
    1. Xây dựng cấu trúc thư mục MVC: `routes/`, `controllers/`, `services/`.
    2. Viết router `backend/routes/api.js` khai báo các endpoint rỗng: `GET /api/devices`, `GET /api/events`.
    3. Viết tài liệu `docs/API_DOCUMENTATION.md` định dạng request/response chuẩn RESTful.
  * **File bàn giao:** `backend/routes/api.js`, `docs/API_DOCUMENTATION.md`.
  * **Thời gian:** 05/11/2026 – 07/11/2026 (8 giờ làm việc).

---

### 🖥️ 4. Đỗ Hải Đăng – Frontend & UI/UX Lead
* **Task ID: SP1-FE-01**
  * **Nhiệm vụ:** Thiết kế Mockup giao diện Dashboard & Khởi tạo dự án React Vite.
  * **Các bước thực hiện:**
    1. Thiết kế bản vẽ bố cục (Layout Wireframe) trên Figma phong cách hiện đại: Dark Mode, bảng điều khiển thẻ card bo góc, tông màu chủ đạo Neon Cyan & Red Alert.
    2. Khởi tạo dự án bằng Vite (`npm create vite@latest frontend -- --template react`).
    3. Cài đặt các thư viện bổ trợ: `lucide-react` (icon), `recharts` / `chart.js` (đồ thị), `socket.io-client`.
  * **File bàn giao:** `docs/ui_wireframe.png`, `frontend/package.json`, `frontend/src/App.jsx`.
  * **Thời gian:** 01/11/2026 – 04/11/2026 (12 giờ làm việc).

* **Task ID: SP1-FE-02**
  * **Nhiệm vụ:** Dựng bộ khung Layout giao diện Web và các Card thông tin tĩnh.
  * **Các bước thực hiện:**
    1. Dựng Sidebar điều hướng, Header hiển thị thông tin nhóm GEHIHI và trạng thái kết nối Cloud.
    2. Dựng các Component rỗng: `DeviceCard.jsx` (Mức pin, địa chỉ MAC), `TelemetryChartCard.jsx`, `AlertHistoryTable.jsx`.
    3. Kiểm tra responsive trên cả màn hình Laptop và Tablet/Smartphone.
  * **File bàn giao:** `frontend/src/components/DeviceCard.jsx`, `frontend/src/components/TelemetryChartCard.jsx`.
  * **Thời gian:** 05/11/2026 – 07/11/2026 (10 giờ làm việc).

---

## 4. TIÊU CHÍ NGHIỆM THU SPIRAL 1 (DEFINITION OF DONE - DoD)
* [ ] Sơ đồ mạch điện phần cứng được duyệt, không bị tranh chấp chân GPIO.
* [ ] MPU6050 được phát hiện đúng địa chỉ `0x68` qua bus I2C.
* [ ] MQTT Broker khởi chạy thành công qua Docker, nhận và gửi được gói tin ping test.
* [ ] CSDL đã tạo đủ các bảng `devices`, `telemetry_logs`, `fall_events`.
* [ ] Server Express chạy ổn định, kết nối được với Broker và CSDL.
* [ ] Giao diện Web hiển thị được khung Dashboard hoàn chỉnh trên trình duyệt.

---

## 5. NHIỆM VỤ BÁO CÁO & HỌP ĐÁNH GIÁ CUỐI SPIRAL 1
* **Biên bản họp Spiral Review:** Thứ 7 ngày 07/11/2026 (Họp online 45 phút).
* **Nội dung:** Từng thành viên demo module của mình; đánh giá tồn đọng kỹ thuật.
* **Đầu ra văn bản:** **Báo cáo Đề cương Kỹ thuật & Đặc tả Kiến trúc IoT (Nộp GVHD)** do Nam và Tiến phụ trách tổng hợp.
