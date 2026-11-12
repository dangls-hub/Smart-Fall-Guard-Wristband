# Linh kiện cần mua và đấu nối prototype

Danh sách phục vụ prototype thiết bị đeo cổ tay Smart Fall Guard. Sơ đồ nguyên lý cập nhật lưu tại `docs/hardware_schematic.pdf` và `docs/hardware_schematic.png` (nguồn thiết kế EasyEDA tại `docs/hardware/SmartFallGuard_RevB.json`).

## Giai đoạn 1: Chạy nguồn USB (Test cảm biến & Wi-Fi)

| Linh kiện | Số lượng | Yêu cầu kỹ thuật |
|---|---:|---|
| ESP8266 Wemos D1 Mini | 1 chính + 1 dự phòng | Mức logic 3,3 V; kiểm tra sẵn driver USB-UART (CH340) |
| MPU6050 breakout I²C (GY-521) | 1 chính + 1 dự phòng | Cấp nguồn 3,3 V (hoặc 5 V nếu qua LDO trên module); mức logic I²C 3,3 V |
| Buzzer piezo thụ động 3,3 V | 1 | Hỗ trợ phát xung PWM ~2 kHz |
| Nút nhấn thường hở (Tactile switch) | 2 | Một nút hủy cảnh báo (SOS/Cancel), một nút dự phòng |
| LED đỏ + điện trở 330 Ω–1 kΩ | 2 bộ | Nối tiếp hạn dòng bảo vệ chân GPIO |
| Breadboard, dây jumper, pin header | 1 bộ | Dây I²C ngắn (< 15 cm), nối đất (GND) chung |
| Cáp USB truyền dữ liệu | 1–2 | Cáp có đường dữ liệu D+/D- để nạp firmware, không dùng cáp chỉ sạc |
| Máy tính và Wi-Fi 2,4 GHz | Dùng sẵn | ESP8266 chỉ hỗ trợ băng tần Wi-Fi 2,4 GHz; máy chạy Mosquitto/Node.js/PostgreSQL |

### Quy hoạch sơ đồ chân (Pinout Wemos D1 Mini)
- **I²C MPU6050:** `D2` (GPIO4) = **SDA**, `D1` (GPIO5) = **SCL**.
- **Ngoại vi:** `D5` (GPIO14) = **Buzzer** (PWM), `D6` (GPIO12) = **Nút hủy cảnh báo**, `D7` (GPIO13) = **LED ngoài**.
- **Lý do chọn chân:** Tránh hoàn toàn các chân boot-strap nhạy cảm của ESP8266 (`D3`/GPIO0, `D4`/GPIO2, `D8`/GPIO15) để đảm bảo mạch khởi động và nạp code ổn định, không bị treo khi có tải ngoài.

### Quy tắc đấu nối Giai đoạn 1
- Nút nhấn nối giữa `D6` (GPIO12) và `GND`, cấu hình `INPUT_PULLUP` và xử lý chống dội (debounce) trong firmware.
- LED ngoài phải mắc nối tiếp điện trở hạn dòng `330 Ω – 1 kΩ` từ `D7` về `GND`.
- Buzzer thụ động nối chân tín hiệu vào `D5` (nếu dùng buzzer công suất lớn hoặc còi từ, cần thêm transistor kích low-side và diode dập xung).
- Mọi chân `GND` của Wemos D1 Mini, MPU6050 và ngoại vi phải nối chung.

---

## Giai đoạn 2: Chạy pin Li-Po 300 mAh và đóng gói

| Linh kiện | Số lượng | Tiêu chí & Lưu ý kỹ thuật |
|---|---:|---|
| Pin Li-Po 1S 3,7 V – 300 mAh (có mạch bảo vệ BMS) | 1–2 | Dòng sạc an toàn ≤ 0,5C–1C (150 mA – 300 mA); kiểm tra đúng cực `+/-` trước khi hàn |
| Module sạc TP4056 (loại có IC bảo vệ DW01A + 8205A) | 1–2 | **Bắt buộc thay điện trở `Rprog` (chân 2 TP4056)** từ `1,2 kΩ` (1000 mA) sang **`4,7 kΩ`** (~250 mA) hoặc **`5,1 kΩ`** (~230 mA) để tránh làm phồng/hỏng pin 300 mAh |
| Module ổn áp 3,3 V (Buck-Boost TPS63070) *(Tùy chọn tối ưu)* | 1 | Duy trì áp 3,3 V ổn định khi pin giảm từ 4,2 V xuống 3,0 V và chịu được xung dòng ~300 mA khi ESP8266 phát Wi-Fi |
| Công tắc gạt (Toggle switch) + đầu nối pin | 1 bộ | Ngắt hoàn toàn nguồn pin khi cắm cáp USB vào Wemos D1 Mini để nạp code/debug |
| Điện trở đo áp pin (`100 kΩ`) | 1 | Wemos D1 Mini có sẵn cầu chia áp `220 kΩ / 100 kΩ` trên chân `A0` (dải 0–3,3 V); nối thêm `100 kΩ` nối tiếp từ `B+` vào `A0` để mở rộng dải đo lên `4,2 V` |
| Tụ lọc nguồn (100 µF + 100 nF) | 1 bộ | Đặt sát chân nguồn `3V3`/`5V` và `GND` của Wemos D1 Mini để chống sụt áp tức thời khi truyền gói tin MQTT |
| Vỏ cách điện + dây đeo cổ tay | 1 bộ | Cố định chắc chắn cảm biến MPU6050 theo trục tọa độ chuẩn, chừa khe cắm sạc TP4056 và nút bấm hủy |

### Kiến trúc đường nguồn & Cảnh báo an toàn
1. **Sơ đồ cấp nguồn:**
   - **Phương án 1 (Tối ưu dung lượng pin):** `Cổng sạc TP4056 ↔ Pin 300 mAh (B+/B-) → OUT+/OUT- → Công tắc gạt → Buck-Boost 3,3 V → chân 3V3 của Wemos D1 Mini + VCC MPU6050`.
   - **Phương án 2 (Tối giản linh kiện cho prototype):** `OUT+ TP4056 → Công tắc gạt → chân 5V của Wemos D1 Mini` (tận dụng LDO ME6211 3,3 V có sẵn trên bo; lưu ý mạch sẽ sụt áp và tự reset sớm khi pin xuống dưới ~3,5–3,6 V lúc phát Wi-Fi).
2. **Hạn chế của TP4056 (Không có Power Path):**
   - Mạch TP4056 không có tính năng chia tải (power path). Khi sạc pin, **gạt công tắc sang OFF** để ngắt tải ESP8266; nếu vừa sạc vừa bật Wi-Fi, dòng tiêu thụ của ESP8266 sẽ làm IC TP4056 hiểu nhầm dòng sạc và không tự ngắt khi pin đầy 4,2 V.
3. **Cách ly khi nạp code qua USB:**
   - **Tuyệt đối tắt công tắc pin** trước khi cắm cáp USB trực tiếp vào cổng của Wemos D1 Mini để tránh xung đột nguồn giữa cổng USB máy tính và ngõ ra `OUT+` của TP4056.
4. **Dự toán thời lượng pin 300 mAh:**
   - Ở chế độ Wi-Fi hoạt động liên tục (~75–85 mA trung bình, xung đỉnh ~300 mA), pin `300 mAh` vận hành được khoảng **3 – 3,5 giờ**. Để kéo dài thời gian đeo thực tế ở các giai đoạn sau, cần bật chế độ tiết kiệm năng lượng (`WiFi.setSleepMode(WIFI_MODEM_SLEEP)`).

---

## Tài liệu tham chiếu kỹ thuật
- [ESP8266 Wemos D1 Mini Pinout & Schematic](https://www.wemos.cc/en/latest/d1/d1_mini.html)
- [TP4056 Datasheet (Bảng tính dòng sạc theo điện trở Rprog)](https://dlnmh9ip6v2uc.cloudfront.net/datasheets/Prototyping/TP4056.pdf)
- [MPU6050 Product Specification](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet.pdf)
- [TPS63070 Buck-Boost Converter Datasheet](https://www.ti.com/lit/ds/symlink/tps63070.pdf)