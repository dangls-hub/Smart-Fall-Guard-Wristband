# 🚨 Smart Fall-Guard Wristband (Vòng tay thông minh cảnh báo té ngã)

![Project Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![Methodology](https://img.shields.io/badge/Methodology-Spiral_Model_(4_Weeks)-blue)
![Hardware](https://img.shields.io/badge/Hardware-ESP32_%7C_MPU6050-orange)
![Stack](https://img.shields.io/badge/Tech_Stack-MQTT_%7C_Node.js_%7C_React_%7C_Docker-00d8ff)

> **Dự án Bài tập lớn IoT** thực hiện bởi **Nhóm 4 – GEHIHI**  
> **Thời gian triển khai:** 01/11/2026 – 30/11/2026 (Mô hình Xoắn ốc - 4 Spirals)

---

## 📖 1. Giới thiệu tổng quan (Overview)
**Smart Fall-Guard Wristband** là hệ thống IoT đầu-cuối (End-to-End) chuyên dụng giúp phát hiện sớm các sự cố té ngã ở người cao tuổi hoặc người cần giám hộ y tế. Hệ thống kết hợp xử lý tại biên (Edge Computing trên ESP32) với thuật toán nhận diện 4 giai đoạn, truyền tin thời gian thực qua giao thức MQTT bảo mật (TLS/SSL), cảnh báo đa kênh (Còi tại chỗ, Web Dashboard Realtime, Telegram Bot, Email) và hỗ trợ cơ chế lưu trữ ngoại tuyến (Offline SPIFFS Buffer) đảm bảo không mất mát dữ liệu ngay cả khi rớt mạng Wi-Fi.

### 🌟 Tính năng cốt lõi
- **Nhận diện té ngã 4 giai đoạn chính xác cao:** Kết hợp gia tốc tổng hợp ($SVM$) và góc nghiêng cơ thể ($	ext{Pitch/Roll}$) ở tần số lấy mẫu 50Hz.
- **Cơ chế hủy báo động giả tại chỗ (15s Local Grace Period):** Kích hoạt còi Buzzer và đèn LED tại vòng tay trong 15 giây; người đeo có thể bấm nút vật lý để hủy nếu chỉ là va chạm nhẹ.
- **Độ trễ thời gian thực cực thấp ($\le 2.0	ext{s}$):** Luồng dữ liệu `ESP32 -> Mosquitto MQTT -> Node.js Backend -> Socket.io -> React Dashboard`.
- **Chống mất dữ liệu ngoại tuyến (Offline Resilience):** Tự động ghi log sự cố vào bộ nhớ Flash `SPIFFS` khi mất Wi-Fi và đồng bộ bù (`sync`) ngay khi có mạng trở lại.
- **Điều khiển hai chiều (Downlink Commands):** Hỗ trợ tắt còi từ xa (`CANCEL_ALARM`), tìm thiết bị (`FIND_DEVICE`), và tinh chỉnh ngưỡng nhạy động (`CONFIG_THRESHOLD`) qua MQTT QoS 1.
- **Bộ mô phỏng phần cứng ảo (Virtual ESP32 Simulator):** Tích hợp trực tiếp trên Web giúp giả lập 5 kịch bản vận động/té ngã/mất mạng phục vụ kiểm thử và thuyết trình độc lập.

---

## 🏗️ 2. Kiến trúc Hệ thống 3 Lớp (System Architecture)

```
+-----------------------------------------------------------------------------------+
|                        LỚP 1: THIẾT BỊ BIÊN (EDGE NODE)                           |
|  [Cảm biến MPU6050] --(I2C: 0x68 @ 50Hz)--> [Vi điều khiển ESP32 NodeMCU]         |
|  [Nút bấm GPIO 18]  <--(Ngắt hủy 15s)----->  ├─ Thuật toán FSM 4 pha (SVM, Pitch) |
|  [Còi Buzzer GPIO19] <--(PWM 2kHz)-------->  └─ Bộ đệm Flash SPIFFS (Offline)     |
+-----------------------------------------------------------------------------------+
                                        │ ▲
                    MQTT over TLS (8883)│ │ Downlink Commands (QoS 1)
                    Telemetry / Alerts  ▼ │
+-----------------------------------------------------------------------------------+
|                   LỚP 2: HẠ TẦNG ĐÁM MÂY & BACKEND (CLOUD & SERVER)               |
|  [Mosquitto MQTT Broker] (Ports: 1883 TCP, 8883 TLS, 9001 WS | LWT & ACL)         |
|             │                                                                     |
|             ▼                                                                     |
|  [Node.js Express Backend] <---> [Heartbeat Daemon (Kiểm tra OFFLINE mỗi 5s)]     |
|     ├─ CSDL: PostgreSQL / SQLite (devices, telemetry_logs, fall_events)           |
|     ├─ WebSocket Gateway (Socket.io Rooms theo device_id)                         |
|     └─ Đa kênh Webhook: Telegram Bot API (Inline Keyboard) & Nodemailer           |
+-----------------------------------------------------------------------------------+
                                        │ ▲
                   Socket.io (< 100ms)  │ │ RESTful API
                   EMERGENCY_ALERT      ▼ │
+-----------------------------------------------------------------------------------+
|               LỚP 3: GIAO DIỆN GIÁM SÁT & ĐIỀU KHIỂN (PRESENTATION)               |
|  [React + Vite Dashboard] (Dark Mode, Neon Cyan & Red Alert UI)                   |
|     ├─ Biểu đồ gia tốc 3 trục & SVM thời gian thực (60fps Sliding Window)         |
|     ├─ Modal Cảnh báo khẩn cấp toàn màn hình + Còi hú Web Audio API               |
|     └─ Virtual ESP32 Simulator (Giả lập 5 kịch bản té ngã & báo giả)              |
+-----------------------------------------------------------------------------------+
```

---

## 🔬 3. Giải thuật Nhận diện Té ngã 4 Giai đoạn (4-Phase Fall Algorithm)

Hệ thống lấy mẫu từ cảm biến MPU6050 mỗi $20	ext{ms}$ ($50	ext{Hz}$), chuẩn hóa gia tốc về đơn vị $g$:
$$a_x = \frac{\text{RawAcX}}{4096.0}, \quad a_y = \frac{\text{RawAcY}}{4096.0}, \quad a_z = \frac{\text{RawAcZ}}{4096.0}$$

- **Gia tốc tổng hợp (Signal Vector Magnitude - SVM):**
  $$SVM = \sqrt{a_x^2 + a_y^2 + a_z^2}$$
- **Góc nghiêng cơ thể (Pitch Angle qua Complementary Filter):**
  $$\text{Pitch} = \arctan\left(\frac{a_x}{\sqrt{a_y^2 + a_z^2}}\right) \times \frac{180}{\pi}$$

### Chu trình Máy trạng thái hữu hạn (FSM):
1. `IDLE` $\rightarrow$ **Pha 1 - Rơi tự do (`FREE_FALL`):** Phát hiện khi $SVM < 0.5g$.
2. `FREE_FALL` $\rightarrow$ **Pha 2 - Va chạm mạnh (`IMPACT`):** Trong vòng $500	ext{ms}$ sau rơi tự do, xuất hiện đỉnh chấn động $SVM > 2.8g$.
3. `IMPACT` $\rightarrow$ **Pha 3 - Đổi hướng tư thế (`POSTURE_CHANGE`):** Độ lệch góc nghiêng cơ thể $\Delta \text{Angle} > 45^\circ$.
4. `POSTURE_CHANGE` $\rightarrow$ **Pha 4 - Bất động sau ngã (`INACTIVITY`):** Biến thiên gia tốc $\Delta SVM < 0.2g$ duy trì liên tục trong $3	ext{ giây}$.
5. `LOCAL_ALARM` (Đếm ngược 15 giây): Bật còi Buzzer 2kHz ngắt quãng và nháy LED đỏ. Nếu người dùng **bấm nút GPIO 18**, hủy báo động và quay về `IDLE`.
6. `CONFIRMED_FALL`: Sau 15 giây không có phản hồi hủy, lập tức phát gói tin khẩn cấp lên MQTT Topic `/alert` (hoặc lưu vào `SPIFFS` nếu mất Wi-Fi).

---

## 🔌 4. Sơ đồ Đấu nối Phần cứng (Hardware Pinout)

| Linh kiện | Chân Linh kiện | Chân ESP32 (NodeMCU 30-pin) | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Cảm biến MPU6050** | VCC / GND | 3.3V / GND | Cấp nguồn chuẩn 3.3V qua IC AMS1117 |
| **Cảm biến MPU6050** | SDA / SCL | **GPIO 21** / **GPIO 22** | Giao tiếp bus I2C chuẩn |
| **Cảm biến MPU6050** | AD0 | GND | Cố định địa chỉ I2C tại `0x68` |
| **Còi báo động (Buzzer)**| Positive (+) | **GPIO 19** | Điều khiển xung PWM tần số 2kHz |
| **Nút bấm Hủy (Button)** | Pin 1 | **GPIO 18** | Sử dụng trở kéo lên nội (`INPUT_PULLUP`), bắt ngắt `attachInterrupt` |
| **LED Trạng thái** | Anode (+) | **GPIO 2** | Báo trạng thái kết nối Wi-Fi và cảnh báo đỏ |
| **Khối nguồn** | Pin Li-Po 3.7V | VIN / 3.3V | Mạch sạc TP4056 + Pin 400mAh + Hạ áp AMS1117-3.3V |

---

## 📡 5. Đặc tả MQTT Topics & RESTful API

### 5.1. Cấu trúc Cây MQTT Topics
| Topic | Chiều truyền | QoS | Retain | Mô tả & Cấu trúc Payload JSON mẫu |
| :--- | :---: | :---: | :---: | :--- |
| `fallguard/v1/devices/{id}/telemetry` | ESP32 $ightarrow$ Broker | 0 | False | Định kỳ 2s/lần: `{"ax": 0.02, "ay": -0.05, "az": 0.98, "svm": 1.0, "pitch": 12.5, "battery": 88}` |
| `fallguard/v1/devices/{id}/alert` | ESP32 $ightarrow$ Broker | 1 | False | Khi xác nhận ngã: `{"event": "FALL_CONFIRMED", "svm_peak": 3.42, "pitch": 68.0, "timestamp": 1762000000}` |
| `fallguard/v1/devices/{id}/status` | ESP32 $ightarrow$ Broker | 1 | True | Heartbeat & LWT: `{"status": "ONLINE" \| "OFFLINE", "reason": "UNEXPECTED_DISCONNECT"}` |
| `fallguard/v1/devices/{id}/sync` | ESP32 $ightarrow$ Broker | 1 | False | Gửi bù dữ liệu từ bộ nhớ Flash `SPIFFS` sau khi có Wi-Fi trở lại |
| `fallguard/v1/devices/{id}/commands` | Backend $ightarrow$ ESP32 | 1 | False | Lệnh điều khiển: `{"action": "CANCEL_ALARM" \| "FIND_DEVICE" \| "CONFIG_THRESHOLD", "params": {"svm_limit": 3.0}}` |

### 5.2. Danh sách RESTful APIs (Backend Port `5000`)
- `GET /api/devices` — Lấy danh sách thiết bị vòng tay, phần trăm pin, trạng thái `ONLINE/OFFLINE`.
- `GET /api/devices/:id/telemetry` — Lấy 50 điểm đo gia tốc gần nhất để khởi tạo đồ thị thời gian thực.
- `GET /api/events` — Truy xuất lịch sử các sự kiện té ngã trong ngày.
- `POST /api/events/:id/resolve` — Đánh dấu sự cố đã được người thân/y tế hỗ trợ an toàn.
- `POST /api/devices/:id/command` — Gửi lệnh Downlink xuống vòng tay thông qua MQTT.

---

## 👥 6. Phân công Nhiệm vụ Chi tiết theo Thành viên & 4 Spirals

### Bảng tổng hợp vai trò cốt lõi (Nhóm 4 – GEHIHI)
| Thành viên | Vai trò chính (Lead Role) | Phụ trách Báo cáo BTL | Nhánh Git chuyên trách |
| :--- | :--- | :--- | :--- |
| **1. Trần Đình Nam** | 🛠️ **Embedded & Firmware Lead** | Chương 1 & Chương 3 + Đề cương | `feat/firmware-esp32` |
| **2. Phạm Việt Tiến** | ☁️ **IoT Infrastructure & Cloud Lead** | Chương 2 + Quay Video Demo + Đề cương | `feat/iot-infra-broker` |
| **3. Nguyễn Hữu Chính**| ⚡ **Backend & Webhook Lead** | Chương 4 + Tổng hợp Word toàn diện | `feat/backend-server` |
| **4. Đỗ Hải Đăng** | 🖥️ **Frontend, UI/UX & Simulator Lead**| Chương 5, Chương 6 + Slide + 50 Test Cases | `feat/frontend-dashboard` |

---

### 📅 Chi tiết Lộ trình 4 Tuần (4 Spirals)

#### 🔹 SPIRAL 1: Nền tảng Phần cứng, Broker & Thiết kế Kiến trúc (01/11/2026 – 07/11/2026)
- **Trần Đình Nam (`SP1-HW-01`, `SP1-HW-02`):**
  - Thiết kế sơ đồ nguyên lý mạch điện (ESP32, MPU6050, TP4056, AMS1117, Buzzer, Button) trên Fritzing/EasyEDA $ightarrow$ Xuất `docs/hardware_schematic.pdf` & `.png`.
  - Viết code kiểm tra bus I2C (`0x68`) và kết nối Wi-Fi cơ bản $ightarrow$ `firmware/tests/i2c_scanner.ino`, `firmware/tests/wifi_test.ino`.
- **Phạm Việt Tiến (`SP1-INF-01`, `SP1-INF-02`):**
  - Dựng `docker-compose.yml` (Mosquitto Broker + PostgreSQL/SQLite), mở port `1883` (TCP) và `9001` (WS), phân quyền `broker/mosquitto.conf`, `broker/acl.conf`.
  - Đặc tả cây MQTT Topic (`docs/MQTT_TOPICS_SPEC.md`), viết `database/schema.sql` (3 bảng: `devices`, `telemetry_logs`, `fall_events`) và `database/db_helper.js`.
- **Nguyễn Hữu Chính (`SP1-BE-01`, `SP1-BE-02`):**
  - Khởi tạo Node.js Express Server cổng `5000` (`backend/server.js`), kết nối MQTT (`backend/services/mqttService.js`) subscribe `fallguard/v1/devices/+/+`.
  - Thiết kế khung MVC, khai báo router `backend/routes/api.js` và tài liệu `docs/API_DOCUMENTATION.md`.
- **Đỗ Hải Đăng (`SP1-FE-01`, `SP1-FE-02`):**
  - Thiết kế Wireframe Dark Mode trên Figma (`docs/ui_wireframe.png`), khởi tạo React + Vite (`frontend/`).
  - Xây dựng bộ khung Layout và các Card tĩnh: `DeviceCard.jsx`, `TelemetryChartCard.jsx`, `AlertHistoryTable.jsx`.

#### 🔹 SPIRAL 2: Thuật toán Nhận diện Té ngã & Giao tiếp Thời gian thực (08/11/2026 – 14/11/2026)
- **Trần Đình Nam (`SP2-HW-01`, `SP2-HW-02`):**
  - Viết driver đọc MPU6050 tần số 50Hz (20ms), tính $SVM$ và góc nghiêng bộ lọc bù $ightarrow$ `firmware/mpu6050_driver.h/.cpp`.
  - Lập trình FSM nhận diện ngã 4 pha, kích hoạt còi hú 15s và ngắt nút bấm hủy GPIO 18 $ightarrow$ `firmware/fall_detection.h/.cpp`, `firmware/SmartFallGuard.ino`.
- **Phạm Việt Tiến (`SP2-INF-01`, `SP2-INF-02`):**
  - Tạo chứng chỉ tự ký OpenSSL (`certs/ca.crt`, `certs/server.crt`), bật TLS port `8883` cho Mosquitto.
  - Viết daemon kiểm tra Heartbeat mỗi 5s (`services/heartbeat_daemon.js`), đánh dấu `OFFLINE` nếu quá 15s không phản hồi.
- **Nguyễn Hữu Chính (`SP2-BE-01`, `SP2-BE-02`):**
  - Tích hợp WebSocket Gateway (`backend/services/socketService.js`), phát sự kiện `EMERGENCY_FALL_DETECTED` dưới $100	ext{ms}$.
  - Hoàn thiện Controllers (`deviceController.js`, `eventController.js`) cho các REST APIs.
- **Đỗ Hải Đăng (`SP2-FE-01`, `SP2-FE-02`):**
  - Viết custom hook `useSocket.js` và đồ thị đường động 60fps cửa sổ trượt 20 điểm (`RealtimeChart.jsx`) hiển thị $a_x, a_y, a_z, SVM$.
  - Xây dựng `EmergencyModal.jsx` tự động bật toàn màn hình kèm âm thanh còi hú (`alarm_sound.mp3`) khi có báo động.

#### 🔹 SPIRAL 3: Bộ đệm Ngoại tuyến, Cảnh báo Đa kênh & Bộ Mô phỏng Ảo (15/11/2026 – 21/11/2026)
- **Trần Đình Nam (`SP3-HW-01`, `SP3-HW-02`):**
  - Lập trình bộ đệm Flash `SPIFFS` (`firmware/spiffs_buffer.h/.cpp`) lưu sự cố vào `/offline_events.json` khi mất Wi-Fi và đồng bộ lên `/sync` khi có mạng lại.
  - Xử lý lệnh Downlink từ topic `/commands` (`CANCEL_ALARM`, `FIND_DEVICE`, `CONFIG_THRESHOLD`).
- **Phạm Việt Tiến (`SP3-INF-01`, `SP3-INF-02`):**
  - Cấu hình MQTT Last Will and Testament (LWT) với `Retain = true` và cập nhật cột `is_synced` trong `database/schema.sql`.
  - Chuẩn hóa `.env.example` và kiểm thử đóng gói toàn bộ hệ thống qua `docker compose up -d`.
- **Nguyễn Hữu Chính (`SP3-BE-01`, `SP3-BE-02`):**
  - Tích hợp Telegram Bot API (kèm nút Inline Keyboard `[Đã hỗ trợ an toàn]` / `[Báo nhầm]`) và Email qua `backend/services/webhookAlert.js`.
  - Xây dựng API `POST /api/devices/:id/command` gửi lệnh Downlink QoS 1 và lưu bảng `command_logs`.
- **Đỗ Hải Đăng (`SP3-FE-01`, `SP3-FE-02`):**
  - Xây dựng **Virtual ESP32 Simulator** (`VirtualSimulator.jsx`) giả lập 5 kịch bản (Đi bộ, Ngã đập lưng, Ngã chúi trước, Vỗ tay báo giả, Rớt mạng Wi-Fi).
  - Thêm giao diện điều khiển từ xa và cài đặt ngưỡng động (`DeviceSettingsModal.jsx`).

#### 🔹 SPIRAL 4: Kiểm thử 50 Kịch bản, Đo đạc KPIs & Hoàn thiện Nghiệm thu (22/11/2026 – 30/11/2026)
- **Trần Đình Nam (`SP4-HW-01`, `SP4-HW-02`):** Đo dòng tiêu thụ (Active vs Sleep), chạy kiểm thử pin 24h (`docs/BATTERY_BENCHMARK_REPORT.md`), viết Chương 1 & Chương 3.
- **Phạm Việt Tiến (`SP4-INF-01`, `SP4-INF-02`):** Kiểm thử tải 50 kết nối đồng thời, đo thời gian phát hiện mất nguồn LWT & đồng bộ SPIFFS (`docs/INFRA_TEST_REPORT.md`), viết Chương 2 & quay Video Demo.
- **Nguyễn Hữu Chính (`SP4-BE-01`, `SP4-BE-02`):** Đo độ trễ End-to-End 30 lần tại 3 điểm A-B-C (`docs/LATENCY_TEST_RESULTS.xlsx`), hoàn thiện tài liệu API, viết Chương 4 & ghép nối file Word tổng `IOT_BTL_Nhom4_GEHIHI.docx`.
- **Đỗ Hải Đăng (`SP4-FE-01`, `SP4-FE-02`):** Thống kê 50 ca kiểm thử thực tế (25 ca ngã thật + 25 ca sinh hoạt mạnh) và tính Confusion Matrix (`docs/TEST_CASES_50_FALLS.md`), viết Chương 5 & 6, làm Slide `IOT_BTL_Slide_Nhom4_GEHIHI.pptx`.

---

## 📊 7. Chỉ số Kỹ thuật Cam kết & Kết quả Thực nghiệm (KPIs)

| Chỉ số kỹ thuật (KPI) | Ngưỡng mục tiêu | Kết quả đạt được | Đánh giá |
| :--- | :---: | :---: | :---: |
| **1. Độ trễ cảnh báo đầu-cuối (End-to-End Latency)** | $\le 2.0	ext{ giây}$ | $0.85	ext{s} - 1.45	ext{s}$ | ✅ **ĐẠT** |
| **2. Độ chính xác nhận diện ngã (Sensitivity/Recall)** | $\ge 90\%$ | $92.0\%$ (23/25 ca) | ✅ **ĐẠT** |
| **3. Tỷ lệ báo động giả (False Alarm Rate)** | $< 10\%$ | $8.0\%$ (2/25 ca) | ✅ **ĐẠT** |
| **4. Tính bền bỉ ngoại tuyến (Offline Sync Rate)** | $100\%$ | $10/10$ gói tin đồng bộ bù | ✅ **ĐẠT** |
| **5. Thời lượng Pin hoạt động liên tục (400mAh)** | $\ge 24	ext{ giờ}$ | $28.5	ext{ giờ}$ | ✅ **ĐẠT** |
| **6. Thời gian phát hiện mất kết nối (LWT Heartbeat)**| $\le 15	ext{ giây}$ | $11.2	ext{ giây}$ | ✅ **ĐẠT** |

---

## 📂 8. Cấu trúc Thư mục Dự án (Repository Structure)

```text
Smart-Fall-Guard-Wristband-GEHIHI/
├── .env.example                        # File mẫu cấu hình biến môi trường hệ thống
├── .gitignore                          # Bỏ qua node_modules, .env, build artifacts
├── docker-compose.yml                  # Khởi chạy Mosquitto Broker & Database
├── README.md                           # Tài liệu tổng quan dự án (File hiện tại)
├── setup_git_branches.sh               # Script tự động tạo nhánh Git cho 4 thành viên (Linux/macOS/Git Bash)
├── setup_git_branches.bat              # Script tự động tạo nhánh Git cho 4 thành viên (Windows CMD/PowerShell)
│
├── firmware/                           # [Trần Đình Nam] Mã nguồn vi điều khiển ESP32
│   ├── SmartFallGuard.ino              # Chương trình chính kết nối FSM, MQTT & SPIFFS
│   ├── mpu6050_driver.h                # Header driver đọc cảm biến MPU6050 @ 50Hz
│   ├── mpu6050_driver.cpp              # Cài đặt công thức chuẩn hóa gia tốc, SVM, Pitch
│   ├── fall_detection.h                # Header máy trạng thái (FSM) nhận diện ngã 4 pha
│   ├── fall_detection.cpp              # Logic FSM & đếm ngược còi Buzzer 15s
│   ├── spiffs_buffer.h                 # Header quản lý bộ đệm ngoại tuyến Flash SPIFFS
│   ├── spiffs_buffer.cpp               # Đọc/ghi /offline_events.json & tự động đồng bộ bù
│   └── tests/
│       ├── i2c_scanner.ino             # Quét kiểm tra địa chỉ I2C 0x68 của MPU6050
│       └── wifi_test.ino               # Kiểm tra kết nối Wi-Fi và in IP qua Serial
│
├── broker/                             # [Phạm Việt Tiến] Cấu hình MQTT Broker Mosquitto
│   ├── mosquitto.conf                  # Cấu hình listeners 1883, 8883 (TLS), 9001 (WS)
│   └── acl.conf                        # Phân quyền truy cập Topic cho esp32 & backend
│
├── certs/                              # [Phạm Việt Tiến] Chứng chỉ bảo mật TLS/SSL
│   ├── ca.crt                          # Root Certificate Authority tự ký
│   ├── server.crt                      # Chứng chỉ máy chủ MQTT Broker
│   └── server.key.example              # Khóa bí mật mẫu của Broker
│
├── database/                           # [Phạm Việt Tiến] Cơ sở dữ liệu & Kết nối
│   ├── schema.sql                      # Lược đồ bảng devices, telemetry_logs, fall_events, command_logs
│   └── db_helper.js                    # Module kết nối và truy vấn CSDL
│
├── services/                           # [Phạm Việt Tiến] Dịch vụ chạy nền hệ thống
│   └── heartbeat_daemon.js             # Quét last_seen mỗi 5s để phát hiện thiết bị OFFLINE
│
├── backend/                            # [Nguyễn Hữu Chính] Máy chủ Node.js Express & WebSocket
│   ├── package.json                    # Khai báo dependencies: express, mqtt, socket.io, ...
│   ├── server.js                       # Điểm khởi chạy Express Server (Port 5000)
│   ├── routes/
│   │   └── api.js                      # Định tuyến RESTful APIs (/api/devices, /api/events)
│   ├── controllers/
│   │   ├── deviceController.js         # Xử lý thông tin thiết bị, telemetry & lệnh Downlink
│   │   └── eventController.js          # Xử lý truy xuất và xác nhận sự cố té ngã
│   └── services/
│       ├── mqttService.js              # MQTT Client kết nối Broker & lắng nghe Topics
│       ├── socketService.js            # WebSocket Gateway phát cảnh báo < 100ms
│       └── webhookAlert.js             # Gửi cảnh báo khẩn cấp qua Telegram Bot & Email
│
├── frontend/                           # [Đỗ Hải Đăng] Giao diện Web React + Vite & Simulator
│   ├── package.json                    # Khai báo dependencies: react, recharts, lucide-react, socket.io-client
│   ├── index.html                      # Trang HTML gốc
│   ├── vite.config.js                  # Cấu hình bundler Vite
│   └── src/
│       ├── main.jsx                    # Điểm gắn kết ứng dụng React
│       ├── App.jsx                     # Bố cục Dashboard chính (Sidebar, Header, Cards)
│       ├── hooks/
│       │   └── useSocket.js            # Custom Hook quản lý kết nối thời gian thực Socket.io
│       ├── components/
│       │   ├── DeviceCard.jsx          # Thẻ hiển thị trạng thái vòng tay, Pin, địa chỉ MAC
│       │   ├── TelemetryChartCard.jsx  # Khung chứa biểu đồ gia tốc
│       │   ├── AlertHistoryTable.jsx   # Bảng nhật ký các sự kiện té ngã trong ngày
│       │   ├── RealtimeChart.jsx       # Đồ thị đường động 60fps (ax, ay, az, SVM)
│       │   ├── EmergencyModal.jsx      # Modal đỏ cảnh báo toàn màn hình + Còi hú khẩn cấp
│       │   ├── VirtualSimulator.jsx    # Bộ mô phỏng ESP32 ảo 5 kịch bản kiểm thử
│       │   └── DeviceSettingsModal.jsx # Modal điều khiển từ xa & cấu hình ngưỡng nhạy
│       └── assets/
│           └── alarm_sound.mp3         # File âm thanh còi báo động khẩn cấp
│
└── docs/                               # Tài liệu kỹ thuật, Báo cáo kiểm thử & Kế hoạch Spiral
    ├── MQTT_TOPICS_SPEC.md             # Đặc tả chi tiết Topic & JSON Payload
    ├── API_DOCUMENTATION.md            # Tài liệu hướng dẫn tích hợp REST APIs
    ├── BATTERY_BENCHMARK_REPORT.md     # Báo cáo đo kiểm dòng điện & thời lượng Pin 24h
    ├── INFRA_TEST_REPORT.md            # Báo cáo kiểm thử tải Broker, LWT & đồng bộ SPIFFS
    ├── TEST_CASES_50_FALLS.md          # Nhật ký 50 kịch bản thực nghiệm & Confusion Matrix
    ├── LATENCY_TEST_RESULTS.xlsx       # Bảng đo độ trễ End-to-End 30 lần thử
    ├── hardware_schematic.pdf          # Sơ đồ nguyên lý mạch điện (PDF)
    ├── hardware_schematic.png          # Sơ đồ nguyên lý mạch điện (Ảnh)
    ├── ui_wireframe.png                # Bản thiết kế giao diện Figma Wireframe
    └── spirals/                        # Hồ sơ kế hoạch 4 tuần (Spiral 1 -> Spiral 4)
        ├── SPIRAL_1_FOUNDATION.md
        ├── SPIRAL_2_CORE_ALGORITHM_REALTIME.md
        ├── SPIRAL_3_RESILIENCE_ALERT_SIMULATOR.md
        └── SPIRAL_4_TESTING_KPIS_FINAL_DELIVERY.md
```

---

## 🚀 9. Hướng dẫn Cài đặt & Khởi chạy Nhanh (Quick Start)

### Bước 1: Khởi chạy Hạ tầng MQTT Broker & Database bằng Docker
```bash
cp .env.example .env
docker compose up -d
```

### Bước 2: Khởi chạy Backend Server (Port `5000`)
```bash
cd backend
npm install
npm start
```

### Bước 3: Khởi chạy Frontend Dashboard (Port `5173`)
```bash
cd frontend
npm install
npm run dev
```

### Bước 4: Nạp Firmware cho ESP32
1. Mở thư mục `firmware/SmartFallGuard.ino` bằng **Arduino IDE** hoặc **PlatformIO**.
2. Cài đặt thư viện `PubSubClient`, `ArduinoJson`, và `Adafruit MPU6050`.
3. Cập nhật thông tin `WIFI_SSID`, `WIFI_PASSWORD`, và địa chỉ `MQTT_SERVER` trong code.
4. Chọn board **ESP32 Dev Module** và nạp chương trình.

---

## 🌿 10. Quy trình Phân nhánh Git & Làm việc Nhóm (Git Workflow)

Để khởi tạo kho lưu trữ và đẩy toàn bộ cấu trúc phân nhánh lên GitHub nhóm, chạy script tự động đi kèm:

- **Trên Windows (Git Bash / Linux / macOS):**
  ```bash
  chmod +x setup_git_branches.sh
  ./setup_git_branches.sh https://github.com/<org-hoac-user>/<ten-repo>.git
  ```
- **Trên Windows (CMD / PowerShell):**
  ```cmd
  setup_git_branches.bat https://github.com/<org-hoac-user>/<ten-repo>.git
  ```

### Danh sách các nhánh được tạo tự động:
- `main` — Nhánh sản phẩm ổn định (Production Release).
- `develop` — Nhánh tích hợp chung của cả nhóm sau mỗi Spiral Review.
- `feat/firmware-esp32` — Nhánh làm việc của **Trần Đình Nam** (Embedded & Firmware).
- `feat/iot-infra-broker` — Nhánh làm việc của **Phạm Việt Tiến** (Broker, Docker, DB, Heartbeat).
- `feat/backend-server` — Nhánh làm việc của **Nguyễn Hữu Chính** (Express API, Socket.io, Webhook).
- `feat/frontend-dashboard` — Nhánh làm việc của **Đỗ Hải Đăng** (React UI, Realtime Chart, Virtual Simulator).
