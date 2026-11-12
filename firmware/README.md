# Chạy thử trên Wemos D1 mini ESP8266

Dùng bảng chân trong [tài liệu phần cứng](../docs/hardware/README.md). SDA D2/GPIO4, SCL D1/GPIO5, còi D5/GPIO14, nút hủy D6/GPIO12, LED D7/GPIO13. Không dùng GPIO18/19/21/22/23 của bản ESP32 cũ.

## Nạp từng chương trình thử

1. Cài Arduino IDE và [ESP8266 Arduino Core](https://arduino-esp8266.readthedocs.io/en/latest/installing.html). Chọn bo **LOLIN(WEMOS) D1 R2 & mini**, đúng cổng serial và cáp USB dữ liệu. Xác định chip USB-UART của bo trước khi cài driver.
2. Ngắt nguồn pin, mở JP1; chạy bằng USB D1 mini. Nối GND chung, kiểm tra nguồn MPU6050 và pull-up I²C lên 3,3 V.
3. Chép `tests/i2c_scanner.ino` vào thư mục riêng `i2c_scanner/`, mở sketch rồi nạp. Serial Monitor dùng **115200 baud**. Với AD0 nối GND, cần thấy địa chỉ **0x68**. Sketch còn thử còi/LED khi khởi động và đọc nút D6 trong vòng quét.
4. Chép `tests/wifi_test.ino` vào thư mục riêng `wifi_test/`. Điền SSID/password mạng 2,4 GHz trên máy local, không commit thông tin thật. Nạp riêng và kiểm tra IP, mức sóng cùng thông báo khi mất mạng.
5. Ghi ngày thử, phiên bản core, model bo, cách đấu và log serial. Chưa có bằng chứng build/nạp bo trong repo; mã thử không phải kết quả nghiệm thu.

Hai sketch phải nằm trong hai thư mục riêng; không ghép vào chương trình chính. Các dòng chú thích đầu file vẫn nhắc ESP32/GPIO21/22, nhưng hằng chân và thư viện trong mã thử đã dùng ESP8266 như bảng trên.

## Phần còn cần triển khai

`SmartFallGuard.ino`, driver MPU6050, FSM và buffer hiện còn TODO. Chương trình chính chưa đọc cảm biến, phát hiện ngã hoặc gửi MQTT. Khi triển khai, dùng chân ESP8266 ở trên thay cho GPIO cũ còn ghi trong chú thích.

Sketch scanner quét lại sau khoảng 3 giây; sketch Wi-Fi chờ kết nối trong `setup()` và kiểm tra mỗi 5 giây. Đây là chương trình thử riêng, chưa đáp ứng vòng lấy mẫu 20 ms. Không dùng kết quả kết nối Wi-Fi để kết luận đã chạy được cảm biến 50 Hz, MQTT/TLS hoặc phát hiện ngã.

Sau hai bài thử, mới triển khai đọc gia tốc/gyro, hiệu chuẩn, FSM, chống dội nút, MQTT và bộ nhớ sự kiện. Đo lại chu kỳ lấy mẫu khi Wi-Fi/TLS kết nối hoặc nối lại. Kiểm tra cổng A0 và mạch nguồn của bo thực tế trước khi nối pin.
