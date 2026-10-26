# Linh kiện cần mua và đấu nối prototype

Danh sách phục vụ một prototype cổ tay. Chốt mã bo/module cụ thể trước khi đặt mua; sơ đồ PDF/PNG hiện còn rỗng và chưa được duyệt. Không có giá/tồn kho đã xác minh.

## Giai đoạn 1: chạy USB

| Linh kiện | Số lượng | Yêu cầu khi mua |
|---|---:|---|
| ESP32 DevKitC / DevKit dùng ESP32-WROOM-32E | 1 chính + 1 dự phòng tùy ngân sách | Có GPIO18,19,21,22,23; có sơ đồ nguồn và USB-UART |
| MPU6050 breakout I²C | 1 chính + 1 dự phòng tùy ngân sách | Xác minh cấp nguồn và mức logic 3,3 V; kiểm tra pull-up/regulator của đúng module |
| Buzzer piezo thụ động 3,3 V | 1 | Phù hợp PWM 2 kHz; biết dòng và điện áp định mức |
| Transistor/MOSFET điều khiển buzzer | 1 bộ | Chọn theo tải và drive GPIO 3,3 V; có điện trở base/gate, pull-down khi cần |
| Nút nhấn thường hở | 2 | Một nút hủy, một dự phòng; dễ thao tác khi đeo |
| LED đỏ + điện trở 330 Ω–1 kΩ | 2 bộ | Chọn theo điện áp LED và dòng mong muốn |
| Breadboard, dây jumper, pin header | 1 bộ | Dây I²C ngắn, nối đất chung |
| Cáp USB truyền dữ liệu | 1–2 | Đúng loại cổng của bo, không chỉ hỗ trợ sạc |
| Máy tính và Wi-Fi 2,4 GHz | Dùng sẵn | Máy chạy Docker/Node.js; có Internet nếu gửi Telegram/email |
| Đồng hồ vạn năng | 1 | Đo nguồn/cực tính; đo dòng nối tiếp ở đúng thang/cổng |

Chân đề xuất: SDA=21, SCL=22, nút hủy=18, điều khiển buzzer=19, LED ngoài=23. Chọn GPIO23 để tránh thêm tải ngoài vào chân boot strap GPIO2.

Nút nối GPIO18 với GND, INPUT_PULLUP và debounce. LED phải nối tiếp điện trở. Buzzer đi qua driver low-side; nếu đổi sang còi điện từ/motor, bổ sung diode dập xung theo tải. Mọi GND nối chung. Kiểm tra pull-up I²C lên 3,3 V, không lên 5 V.

## Giai đoạn 2: pin và vỏ đeo

| Linh kiện | Số lượng | Tiêu chí |
|---|---:|---|
| Pin Li-Po 1S có bảo vệ | 1–2 | Chọn kích thước/dung lượng sau đo dòng; có thông số dòng xả và dòng sạc, đúng cực đầu nối |
| Module sạc có power path, ví dụ BQ24074 | 1 | Đặt dòng sạc phù hợp viên pin; pin bảo vệ và power path là hai chức năng riêng |
| Module buck-boost 3,3 V, ví dụ dựa trên TPS63070 | 1 | Dải vào bao phủ pin và đầu ra SYS mạch sạc; xác minh dòng đầu ra thực ≥500 mA ở toàn dải dùng và đáp ứng tải Wi-Fi |
| Công tắc, đầu nối pin và dây phù hợp | 1 bộ | Có cách ngắt nguồn khi nạp/debug, tránh cắm ngược |
| Mạch đo pin | 1 | Cầu chia áp phù hợp ADC1 hoặc fuel gauge; không nối pin 4,2 V thẳng vào ADC |
| Tụ decoupling/bulk | Theo sơ đồ module | Theo datasheet mạch nguồn và phép đo sụt áp thực |
| Thiết bị ghi dòng/power analyzer | Mượn hoặc mua 1 | Đo trung bình và xung; USB meter không đại diện hoàn toàn cho hiệu suất khi chạy pin |
| Vỏ cách điện + dây đeo + PCB hàn | 1 bộ | Cố định cảm biến, che chân dẫn điện, chừa anten và tiếp cận nút hủy |

Đường nguồn mục tiêu: USB → charger power path ↔ pin; SYS → buck-boost 3,3 V → ESP32 + IMU. Không cấp SYS của charger trực tiếp vào chân 3V3 vì có thể vượt 3,3 V.

Không dùng Li-Po 1S → AMS1117-3.3 V: thiếu headroom khi điện áp pin giảm. TP4056 đơn thuần không thay thế chức năng power path; module có bảo vệ pin chưa chắc có chia nguồn tải/sạc. Cần kiểm tra đúng module thay vì chỉ tên IC.

DevKit là bo thử cồng kềnh, có LED và USB-UART làm tăng tiêu thụ. Chỉ thu nhỏ bo hoặc đổi dòng MCU sau khi đã có phép đo và danh sách GPIO/phần mềm tương thích. Pin 400 mAh không mặc nhiên chạy 24 giờ.

Không nối đồng thời USB của DevKit và nguồn ngoài khi chưa xác minh mạch cách ly của bo. Với DevKitC, tài liệu Espressif yêu cầu chọn một trong USB/5V/3V3.

## Tài liệu để đối chiếu trước khi mua

- [ESP32 DevKitC và tùy chọn cấp nguồn](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html).
- [MPU6050 product specification](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet.pdf).
- [BQ24074: sạc một cell và power path](https://www.ti.com/lit/ds/symlink/bq24074.pdf).
- [TPS63070: buck-boost](https://www.ti.com/lit/ds/symlink/tps63070.pdf).
