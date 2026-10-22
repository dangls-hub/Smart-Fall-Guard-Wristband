# KẾ HOẠCH CHI TIẾT SPIRAL 2: THUẬT TOÁN NHẬN DIỆN TÉ NGÃ & GIAO TIẾP THỜI GIAN THỰC
* **Dự án:** Vòng tay thông minh cảnh báo té ngã (Smart Fall-Guard Wristband)
* **Nhóm thực hiện:** Nhóm 4 – GEHIHI
* **Thời gian thực hiện:** Tuần 2 (Từ ngày 08/11/2026 đến 14/11/2026)
* **Trạng thái:** Kế hoạch thực hiện

---

## 1. MỤC TIÊU CỐT LÕI CỦA SPIRAL 2
1. Viết mã nguồn ESP32 thu thập gia tốc 3 trục ($a_x, a_y, a_z$) và con quay hồi chuyển ($\omega_x, \omega_y, \omega_z$) ở tần số lấy mẫu 50Hz.
2. Cài đặt thuật toán nhận diện té ngã 4 giai đoạn dựa trên giá trị gia tốc tổng hợp $SVM$ và góc nghiêng cơ thể.
3. Cài đặt còi Buzzer cảnh báo tại chỗ và nút bấm vật lý hủy báo động trong 15 giây.
4. Triển khai luồng truyền dữ liệu thời gian thực: ESP32 $\rightarrow$ MQTT Broker $\rightarrow$ Backend Server $\rightarrow$ WebSocket Gateway (Socket.io) $\rightarrow$ Web Dashboard với độ trễ $\le 2s$.
5. Hoàn thiện đồ thị Telemetry hiển thị gia tốc 3 trục trực tiếp trên giao diện Dashboard.

---

## 2. PHÂN TÍCH RỦI RO & PHƯƠNG ÁN GIẢM THIỂU (RISK MANAGEMENT)
| Rủi ro kỹ thuật phát hiện | Mức độ | Phương án xử lý trong Spiral 2 |
|---|:---:|---|
| Tỷ lệ báo động giả cao khi vung tay mạnh hoặc ngồi nhanh xuống ghế. | Cao | Bắt buộc kiểm tra đồng thời cả 4 pha: Rơi tự do ($SVM < 0.5g$), Va chạm ($SVM > 2.8g$), Đổi hướng góc nghiêng ($> 45^\circ$) và Nằm yên bất động ($3s$). |
| Tần số lấy mẫu 50Hz gây tràn bộ nhớ đệm hoặc nghẽn mạng Wi-Fi nếu gửi liên tục. | Cao | Chỉ tính toán thuật toán nội bộ ở tần số 50Hz trên ESP32; chỉ đẩy Telemetry định kỳ 2s/lần hoặc gửi ngay lập tức khi phát hiện va chạm. |
| Độ trễ WebSocket bị chậm do đường truyền hoặc xử lý CSDL đồng bộ. | Trung bình | Xử lý bất đồng bộ (Asynchronous): Khi nhận gói tin cảnh báo, phát ngay sự kiện Socket.io cho Client trước, sau đó mới ghi vào CSDL. |

---

## 3. PHÂN CÔNG NHIỆM VỤ CHI TIẾT THEO THÀNH VIÊN

### 🛠️ 1. Trần Đình Nam – Embedded & Firmware Lead
* **Task ID: SP2-HW-01**
  * **Nhiệm vụ:** Viết Driver đọc MPU6050 tần số 50Hz và tính toán thông số vector chuyển động.
  * **Các bước thực hiện:**
    1. Lập trình đọc thanh ghi cảm biến MPU6050 qua I2C mỗi 20ms ($50Hz$) sử dụng bộ đếm `millis()`.
    2. Chuẩn hóa giá trị gia tốc về đơn vị $g$: $a_x = \frac{\text{RawAcX}}{4096.0}$, $a_y = \frac{\text{RawAcY}}{4096.0}$, $a_z = \frac{\text{RawAcZ}}{4096.0}$.
    3. Tính gia tốc tổng hợp: $SVM = \sqrt{a_x^2 + a_y^2 + a_z^2}$.
    4. Tính góc nghiêng cơ thể dựa trên bộ lọc bù (Complementary Filter): $\text{Pitch} = \arctan\left(\frac{a_x}{\sqrt{a_y^2 + a_z^2}}\right) \times \frac{180}{\pi}$.
  * **File bàn giao:** `firmware/mpu6050_driver.h`, `firmware/mpu6050_driver.cpp`.
  * **Thời gian:** 08/11/2026 – 10/11/2026 (14 giờ làm việc).

* **Task ID: SP2-HW-02**
  * **Nhiệm vụ:** Cài đặt thuật toán nhận diện té ngã 4 giai đoạn & Cảnh báo tại chỗ 15s.
  * **Các bước thực hiện:**
    1. Triển khai máy trạng thái (FSM - Finite State Machine): `IDLE` $\rightarrow$ `FREE_FALL` $\rightarrow$ `IMPACT` $\rightarrow$ `INACTIVITY` $\rightarrow$ `LOCAL_ALARM` $\rightarrow$ `CONFIRMED_FALL`.
    2. Cài đặt ngưỡng: Pha 1 ($SVM < 0.5g$), Pha 2 ($SVM > 2.8g$ trong 500ms), Pha 3 ($\Delta \text{Angle} > 45^\circ$), Pha 4 (Biến thiên $SVM < 0.2g$ trong $3s$).
    3. Kích hoạt còi hú Buzzer (tần số 2kHz ngắt quãng) và nhấp nháy LED đỏ.
    4. Lắng nghe nút bấm GPIO 18 (sử dụng ngắt `attachInterrupt` chống dội phím). Nếu người dùng ấn nút trong 15s $\rightarrow$ Hủy còi và trở về `IDLE`.
    5. Hết 15s không bấm $\rightarrow$ Chuyển sang `CONFIRMED_FALL` và gọi hàm phát gói tin MQTT.
  * **File bàn giao:** `firmware/fall_detection.h`, `firmware/fall_detection.cpp`, `firmware/SmartFallGuard.ino`.
  * **Thời gian:** 11/11/2026 – 14/11/2026 (16 giờ làm việc).

---

### ☁️ 2. Phạm Việt Tiến – IoT Infrastructure & Cloud Lead
* **Task ID: SP2-INF-01**
  * **Nhiệm vụ:** Cấu hình bảo mật MQTT Broker qua TLS/SSL (Port 8883) & Quản lý User/Password.
  * **Các bước thực hiện:**
    1. Tạo khóa và chứng chỉ bảo mật tự ký (Self-signed CA, Server Certificate, Server Key) bằng OpenSSL.
    2. Cấu hình file `mosquitto.conf` kích hoạt port 8883 với đường dẫn chứng chỉ `ca.crt`, `server.crt`, `server.key`.
    3. Thiết lập quyền ACL: tài khoản `esp32_device` chỉ được quyền PUBLISH lên `fallguard/v1/devices/{device_id}/#` và SUBSCRIBE vào `commands`.
  * **File bàn giao:** `certs/ca.crt`, `certs/server.crt`, `broker/mosquitto.conf`, `broker/acl.conf`.
  * **Thời gian:** 08/11/2026 – 10/11/2026 (12 giờ làm việc).

* **Task ID: SP2-INF-02**
  * **Nhiệm vụ:** Xây dựng script kiểm tra Heartbeat định kỳ của thiết bị.
  * **Các bước thực hiện:**
    1. Viết script `services/heartbeat_daemon.js` chạy nền bằng Node.js.
    2. Cứ mỗi 5s truy vấn bảng `devices` kiểm tra trường `last_seen`.
    3. Nếu thời gian hiện tại trừ `last_seen` vượt quá 15 giây $\rightarrow$ Ghi log thiết bị mất kết nối và chuyển `status = 'OFFLINE'`.
  * **File bàn giao:** `services/heartbeat_daemon.js`.
  * **Thời gian:** 11/11/2026 – 13/11/2026 (10 giờ làm việc).

---

### ⚡ 3. Nguyễn Hữu Chính – Backend Lead
* **Task ID: SP2-BE-01**
  * **Nhiệm vụ:** Triển khai WebSocket Gateway bằng Socket.io kết nối với Express Server.
  * **Các bước thực hiện:**
    1. Cài đặt thư viện `socket.io` trên Backend Server.
    2. Khởi tạo `socketService.js` lắng nghe các kết nối từ Web Client và quản lý phòng (Rooms) theo `device_id`.
    3. Khi MQTT Subscriber nhận được topic `fallguard/v1/devices/{id}/alert` $\rightarrow$ Ngay lập tức broadcast sự kiện `EMERGENCY_FALL_DETECTED` qua Socket.io kèm payload chi tiết (Lực va chạm, thời gian).
    4. Đo thời gian xử lý đảm bảo từ lúc nhận gói tin MQTT đến khi phát socket mất $< 100ms$.
  * **File bàn giao:** `backend/services/socketService.js`, `backend/server.js`.
  * **Thời gian:** 08/11/2026 – 11/11/2026 (14 giờ làm việc).

* **Task ID: SP2-BE-02**
  * **Nhiệm vụ:** Hoàn thiện REST APIs truy xuất dữ liệu sự kiện và thiết bị.
  * **Các bước thực hiện:**
    1. Viết API `GET /api/devices`: Trả về danh sách vòng tay, phần trăm pin, trạng thái ONLINE/OFFLINE.
    2. Viết API `GET /api/devices/:id/telemetry`: Trả về 50 điểm đo gia tốc gần nhất để vẽ đồ thị ban đầu.
    3. Viết API `GET /api/events`: Lấy danh sách nhật ký các vụ ngã trong ngày.
    4. Viết API `POST /api/events/:id/resolve`: Đánh dấu sự kiện đã được cứu hộ xử lý an toàn.
  * **File bàn giao:** `backend/controllers/deviceController.js`, `backend/controllers/eventController.js`, `backend/routes/api.js`.
  * **Thời gian:** 12/11/2026 – 14/11/2026 (10 giờ làm việc).

---

### 🖥️ 4. Đỗ Hải Đăng – Frontend & UI/UX Lead
* **Task ID: SP2-FE-01**
  * **Nhiệm vụ:** Tích hợp WebSocket Client và biểu đồ gia tốc 3 trục thời gian thực.
  * **Các bước thực hiện:**
    1. Cài đặt `socket.io-client` trong React, tạo hook `useSocket(deviceId)` kết nối tới Backend.
    2. Sử dụng thư viện Recharts hoặc Chart.js dựng biểu đồ đường động (Dynamic Line Chart).
    3. Cập nhật đồ thị với cửa sổ trượt (Sliding Window 20 điểm dữ liệu): vẽ 4 đường tín hiệu ($a_x$ đỏ, $a_y$ xanh lá, $a_z$ xanh dương, $SVM$ vàng).
    4. Đảm bảo biểu đồ render mượt mà 60fps không bị giật lag giao diện.
  * **File bàn giao:** `frontend/src/components/RealtimeChart.jsx`, `frontend/src/hooks/useSocket.js`.
  * **Thời gian:** 08/11/2026 – 11/11/2026 (14 giờ làm việc).

* **Task ID: SP2-FE-02**
  * **Nhiệm vụ:** Xây dựng Modal Cảnh báo Khẩn cấp có âm thanh còi báo động.
  * **Các bước thực hiện:**
    1. Viết component `EmergencyModal.jsx` tự động bật toàn màn hình khi nhận sự kiện `EMERGENCY_FALL_DETECTED`.
    2. Thiết kế hiệu ứng hình ảnh cảnh báo: viền đỏ phát sáng nhấp nháy (Pulsing Glow), thông số va chạm $SVM$, thời gian xảy ra sự cố.
    3. Phát âm thanh còi cấp cứu tự động bằng Web Audio API (hoặc file `.mp3` âm lượng lớn).
    4. Thêm nút "Xác nhận đã hỗ trợ" và nút "Gọi cấp cứu / Người thân".
  * **File bàn giao:** `frontend/src/components/EmergencyModal.jsx`, `frontend/src/assets/alarm_sound.mp3`.
  * **Thời gian:** 12/11/2026 – 14/11/2026 (10 giờ làm việc).

---

## 4. TIÊU CHÍ NGHIỆM THU SPIRAL 2 (DEFINITION OF DONE - DoD)
* [x] ESP32 đọc được dữ liệu MPU6050 tần số 50Hz và tính chính xác công thức $SVM$.
* [x] Thuật toán phát hiện ngã kích hoạt được còi hú tại chỗ; ấn nút vật lý hủy còi thành công.
* [x] Khi hết 15s không bấm hủy, gói tin cảnh báo được gửi qua MQTT lên Backend.
* [x] Backend phát WebSocket tới Web Dashboard; Modal đỏ bật lên với âm thanh cảnh báo.
* [x] Tổng độ trễ từ lúc hết 15s đếm ngược đến khi Modal bật trên Web đạt $\le 2.0$ giây.
* [x] Biểu đồ gia tốc trên Web hiển thị các giá trị thay đổi khi lắc cảm biến.

---

## 5. NHIỆM VỤ BÁO CÁO & HỌP ĐÁNH GIÁ CUỐI SPIRAL 2
* **Biên bản họp Spiral Review:** Thứ 7 ngày 14/11/2026 (Họp trực tiếp tại phòng lab).
* **Nội dung:** Thử nghiệm ngã thực tế (thả rơi cảm biến vào nệm) để kiểm chứng luồng hoạt động End-to-End từ ESP32 lên Dashboard.
* **Đầu ra văn bản:** **Báo cáo Tiến độ Kỹ thuật Tuần 2 (kèm kết quả đo độ trễ và ảnh chụp giao diện)** do Chính và Đăng phụ trách tổng hợp.
