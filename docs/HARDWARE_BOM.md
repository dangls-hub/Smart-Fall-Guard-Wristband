# Linh kiện và đấu nối prototype D1 mini ESP8266

Cập nhật 10/11/2026 theo ảnh bo đã mua: **D1 mini dạng tương thích WEMOS/LOLIN, dùng ESP8266 với module ESP-12F**. Chưa xác minh nhà sản xuất, dung lượng flash, USB-UART hoặc mạch regulator. Chỉ bo này đã được xác nhận qua ảnh; các linh kiện khác bên dưới là yêu cầu thiết kế, chưa xác nhận đã mua.

Dùng [sơ đồ Rev C](hardware/README.md) và [hướng dẫn bắt đầu](../firmware/README.md). Rev A/B là sơ đồ ESP32 cũ, chỉ giữ làm lịch sử.

## Giai đoạn 1: chạy USB

| Linh kiện | Số lượng | Yêu cầu |
|---|---:|---|
| D1 mini ESP8266/ESP-12F | 1 đã có theo ảnh | Có D1, D2, D5, D6, D7, 3V3, G; kiểm tra cổng USB và chip USB-UART thực |
| MPU6050 breakout I²C | 1 chính + 1 dự phòng tùy ngân sách | Xác minh hoạt động với nguồn và logic 3,3 V; kiểm tra pull-up/regulator |
| Buzzer piezo thụ động 3,3 V | 1 | Phù hợp PWM 2 kHz; phạm vi sơ đồ là tải tối đa 20 mA |
| Transistor NPN điều khiển buzzer | 1 bộ | Chọn theo dòng tải và GPIO 3,3 V; xác minh B/C/E, R base 1 kΩ, R base-emitter 10 kΩ |
| Nút nhấn thường hở | 2 | Một nút hủy, một dự phòng; dễ thao tác khi đeo |
| LED đỏ + điện trở 330 Ω–1 kΩ | 2 bộ | Sơ đồ dùng 330 Ω; kiểm tra dòng theo LED thực |
| Breadboard, jumper, pin header | 1 bộ | Dây I²C ngắn, GND chung; hàn header tiếp xúc chắc với bo |
| Cáp USB dữ liệu | 1–2 | Đúng cổng bo, không chỉ hỗ trợ sạc |
| Máy tính và Wi-Fi 2,4 GHz | Dùng sẵn | Máy chạy Docker/Node.js; Internet nếu gửi Telegram/email |
| Đồng hồ vạn năng | 1 | Đo nguồn/cực tính; đo dòng nối tiếp ở đúng thang/cổng |

### Bảng đấu dây hiện hành

| Chức năng | Nhãn trên D1 mini | GPIO / nối tiếp |
|---|---|---|
| MPU6050 VCC | 3V3 | Xác minh breakout hỗ trợ cấp 3,3 V |
| MPU6050 GND và AD0 | G | GND chung; AD0 thấp chọn địa chỉ 0x68 |
| MPU6050 SDA | D2 | GPIO4 |
| MPU6050 SCL | D1 | GPIO5 |
| Nút hủy | D5 | GPIO14 → nút → GND; INPUT_PULLUP và debounce |
| Driver buzzer | D6 | GPIO12 → R 1 kΩ → base Q1; xem Rev C |
| LED ngoài | D7 | GPIO13 → R 330 Ω → anode LED; cathode → GND |

MPU6050 INT/XDA/XCL để hở trong bản đọc polling này. R4/R5 4,7 kΩ chỉ lắp nếu breakout chưa có pull-up phù hợp lên 3,3 V. Không kéo SDA/SCL lên 5 V. Buzzer đi qua driver low-side; nếu đổi sang còi điện từ/motor, phải chọn lại driver và diode dập xung theo tải.

**D1 là GPIO5, D2 là GPIO4; số D không phải số GPIO.** D3/GPIO0, D4/GPIO2 và D8/GPIO15 liên quan chế độ boot nên không dùng cho nút/còi/LED ngoài trong sơ đồ này. D0/GPIO16 và RX/TX chưa dùng. GPIO hoạt động ở mức 3,3 V.

Chạy bằng USB của D1 mini trước, chưa nối pin hoặc nguồn ngoài. Bo không tích hợp sẵn bộ sạc Li-Po chỉ vì có chân 5V/3V3.

## Giai đoạn 2: pin và vỏ đeo

| Linh kiện | Số lượng | Tiêu chí |
|---|---:|---|
| Pin Li-Po 1S có bảo vệ | 1–2 | Chọn kích thước/dung lượng sau đo dòng; đúng cực đầu nối; dòng sạc tối đa 500 mA theo thiết kế và phải giảm nếu pin không cho phép |
| Module sạc có power path, ví dụ BQ24074 | 1 | Đặt dòng sạc theo viên pin; bảo vệ pin và power path là hai chức năng riêng |
| Buck-boost 3,3 V, ví dụ TPS63070 | 1 | Dải vào bao phủ pin và SYS; dòng thực ≥500 mA ở toàn dải dùng, đáp ứng tải Wi-Fi |
| Công tắc, JP1, đầu nối và dây | 1 bộ | Ngắt nguồn ngoài khi nạp/debug, tránh cắm ngược |
| Mạch đo pin qua A0 hoặc fuel gauge | 1 | Xác minh cầu chia áp/giới hạn A0 của đúng bo; không dùng sơ đồ ADC1 của ESP32 |
| Tụ decoupling/bulk | Theo module | Theo datasheet và phép đo sụt áp thực |
| Thiết bị ghi dòng/power analyzer | Mượn hoặc mua 1 | Đo dòng trung bình và xung; USB meter không đại diện hoàn toàn khi chạy pin |
| Vỏ cách điện + dây đeo + PCB hàn | 1 bộ | Cố định cảm biến, che chân dẫn điện, chừa anten và nút hủy |

Đường nguồn dự kiến Rev C: USB sạc → charger power path ↔ pin; SYS → SW2 → buck-boost 3,3 V → JP1 → rail 3V3 của D1 mini + IMU. Đây là thiết kế mở rộng, chưa xác nhận module nguồn đã mua hoặc tương thích bo thực tế. Không cấp SYS trực tiếp vào 3V3. Tắt SW2 và mở JP1 trước khi cắm USB của D1 mini; không cấp USB và 3V3 ngoài đồng thời khi chưa xác minh mạch cách ly/regulator.

Không dùng Li-Po 1S → AMS1117-3.3 V vì thiếu headroom khi pin giảm áp. TP4056 đơn thuần không thay thế power path. Không nối pin 3,7–4,2 V vào 3V3 hoặc A0. ADC của chip ESP8266 trần có dải 0–1,0 V; D1 mini tham chiếu có cầu chia áp cho A0 đến 3,2 V, nhưng phải kiểm tra bo đang dùng trước khi tính mạch đo pin.

D1 mini có LED, USB-UART và regulator làm tăng dòng tiêu thụ. Pin 400 mAh không mặc nhiên chạy 24 giờ. Chốt pin/vỏ sau khi đo dòng, nhiệt, reset và mẫu trễ với Wi-Fi/TLS hoạt động.

## Nguồn đối chiếu

- [D1 mini: thông số bo tham chiếu](https://www.wemos.cc/en/latest/d1/d1_mini.html).
- [Ánh xạ chân D1 mini](https://github.com/esp8266/Arduino/blob/master/variants/d1_mini/pins_arduino.h).
- [ESP8266: boot và nguồn](https://arduino-esp8266.readthedocs.io/en/latest/boards.html).
- [ESP8266: GPIO và ADC](https://arduino-esp8266.readthedocs.io/en/latest/reference.html).
- [MPU6050 product specification](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet.pdf).
- [BQ24074: sạc một cell và power path](https://www.ti.com/lit/ds/symlink/bq24074.pdf).
- [TPS63070: buck-boost](https://www.ti.com/lit/ds/symlink/tps63070.pdf).
