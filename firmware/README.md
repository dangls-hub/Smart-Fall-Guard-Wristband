# Bắt đầu với D1 mini ESP8266/ESP-12F

Bo đã mua theo ảnh là dạng D1 mini tương thích WEMOS/LOLIN, module ESP-12F. Dùng bảng chân dưới đây, không dùng sơ đồ ESP32 Rev A/B. Chưa xác minh hãng bo, flash hoặc chip USB-UART thực tế.

## Trạng thái mã nguồn

`SmartFallGuard.ino`, driver MPU6050, FSM và buffer vẫn là khung TODO. Hai file `tests/i2c_scanner.ino` và `tests/wifi_test.ino` cũng chỉ có `setup()`/`loop()` rỗng. Lượt đổi bo này cập nhật thiết kế và hướng dẫn; nạp các khung này chưa có chức năng đọc cảm biến, kết nối Wi-Fi hoặc phát hiện ngã.

## Đấu dây khi chạy USB

| Phần cần nối | Chân trên bo | GPIO |
|---|---|---:|
| MPU6050 SDA | D2 | 4 |
| MPU6050 SCL | D1 | 5 |
| Nút hủy → GND | D5 | 14 |
| Driver còi qua transistor | D6 | 12 |
| LED ngoài qua điện trở 330 Ω | D7 | 13 |

MPU6050 VCC nối 3V3 nếu đúng breakout hỗ trợ nguồn đó; GND và AD0 nối G/GND, địa chỉ 0x68. Để hở INT/XDA/XCL. Nút dùng INPUT_PULLUP và debounce; nhấn đọc LOW. Mọi GND nối chung. SDA/SCL chỉ kéo lên 3,3 V. Xem [BOM](../docs/HARDWARE_BOM.md) và [sơ đồ Rev C](../docs/hardware/README.md) cho driver còi/nguồn.

Đọc nhãn in trên bo khi cắm dây. D1/D2 không phải GPIO1/GPIO2. Tránh D3/GPIO0, D4/GPIO2 và D8/GPIO15 vì liên quan boot. LED ngoài ở D7 khác LED tích hợp; không giả định cùng chân hoặc cùng mức bật.

## Môi trường nạp

1. Cài Arduino IDE, thêm URL Boards Manager chính thức: `https://arduino.esp8266.com/stable/package_esp8266com_index.json`.
2. Cài **esp8266 by ESP8266 Community**, chọn **LOLIN(WEMOS) D1 R2 & mini**, rồi chọn cổng serial. Ghi lại phiên bản core trong log thử; không chọn board ESP32.
3. Dùng cáp USB dữ liệu. Nếu không có cổng serial, xác định chip USB-UART thực và cài driver tương ứng; không suy ra CH340/CP210x chỉ từ ảnh mặt trên.
4. Tạo thư mục sketch `SmartFallGuard`, chép `SmartFallGuard.ino` cùng các `.h`/`.cpp` trực tiếp trong `firmware/` vào đó, rồi mở sketch. Không ghép hai sketch test vào chương trình chính.
5. Mỗi sketch thử cần thư mục riêng cùng tên: `i2c_scanner/i2c_scanner.ino` và `wifi_test/wifi_test.ino`. Hiện cần triển khai nội dung trước khi chạy. Serial Monitor dự kiến **115200 baud**.
6. Xác minh dung lượng flash trước khi chọn Flash Size/phân vùng filesystem; không coi ESP-12F là bằng chứng bo có đúng 4 MB. Khi thử TLS, đối chiếu khuyến nghị CPU 160 MHz của BearSSL và đo lại chu kỳ lấy mẫu.

Nếu dùng PlatformIO về sau: platform `espressif8266`, board `d1_mini`, framework `arduino`. Repo hiện chưa có cấu hình PlatformIO hoặc pipeline build firmware được kiểm chứng.

## Các thay đổi phần mềm cần thực hiện

- Wi-Fi: `ESP8266WiFi.h`; I²C: `Wire.begin(4, 5)` tương ứng SDA=D2, SCL=D1. Đặt clock I²C phù hợp cảm biến và dây thực.
- Nút/còi/LED: GPIO14/12/13; không dùng chân 18/19/23 của ESP32. Còi thụ động cần PWM, không dùng API LEDC dành cho ESP32.
- Lập lịch cảm biến mỗi 20 ms bằng `millis()`/`micros()`. Nhường CPU cho Wi-Fi bằng cách kết thúc `loop()` thường xuyên hoặc `yield()` khi phù hợp; không gọi từ ISR. Tránh chờ reconnect vô hạn; dùng backoff và đo mẫu trễ.
- TLS: BearSSL `WiFiClientSecure`, CA hợp lệ, thời gian đồng bộ và xác minh hostname. Handshake có thể vượt chu kỳ lấy mẫu: đo heap và thời gian chặn trước khi chốt MQTT client. Chưa kiểm chứng 50 Hz khi handshake/reconnect.
- MQTT client phải hỗ trợ **publish QoS 1** và TLS trên ESP8266. Kiểm tra publish riêng với subscribe; chưa khóa thư viện hoặc hạ yêu cầu QoS. Xem [hợp đồng MQTT](../docs/MQTT_TOPICS_SPEC.md).
- Buffer mới dùng **LittleFS**. Tên file/API `spiffs_buffer.*`/`initSPIFFSBuffer()` được giữ; hiện chưa triển khai. Đặt `LittleFSConfig` với `setAutoFormat(false)` qua `LittleFS.setConfig(...)` trước `LittleFS.begin()` để mount lỗi không tự xóa queue. Format lần đầu phải là bước chủ động riêng; không mount chéo volume SPIFFS/LittleFS.

ID `esp32_001`/`esp32_002` trong ví dụ backend là tài khoản thiết bị đã dùng, dùng được cho ESP8266. Giữ ID khớp username, topic và payload. Chỉ chọn ID mới sau khi cấp tài khoản tương ứng; không commit SSID/password hoặc credentials MQTT.

## Thứ tự thử trên bo thật

1. Kiểm tra header đã hàn chắc, chưa nối pin/nguồn ngoài. Cấp USB, đo 3V3/GND.
2. Triển khai và nạp scanner riêng, xác nhận MPU6050 ở 0x68; kiểm tra nguồn, SDA/SCL và AD0 nếu không thấy.
3. Triển khai sketch Wi-Fi riêng, thử mạng 2,4 GHz và in IP; chưa cần broker.
4. Triển khai driver, kiểm tra WHO_AM_I, cấu hình ±8 g, hiệu chuẩn; log accel/gyro và khoảng cách mẫu.
5. Thử nút D5, LED D7, còi qua driver D6; sau đó FSM và thời hạn hủy 15 giây.
6. Tích hợp MQTT/TLS và LittleFS; thử mất mạng, reconnect, queue đầy, mất ACK và reboot. Ghi heap tối thiểu, thời gian handshake và mẫu trễ cả lúc còi bật. Chỉ nghiệm thu 50 Hz/độ trễ/pin sau khi có log đo.

## Tài liệu chính thức

- [Cài ESP8266 Arduino Core](https://arduino-esp8266.readthedocs.io/en/latest/installing.html).
- [Ánh xạ chân D1 mini](https://github.com/esp8266/Arduino/blob/master/variants/d1_mini/pins_arduino.h).
- [Wi-Fi và Wire](https://arduino-esp8266.readthedocs.io/en/latest/libraries.html).
- [Vòng lặp, GPIO, ADC và ngắt](https://arduino-esp8266.readthedocs.io/en/latest/reference.html).
- [BearSSL](https://arduino-esp8266.readthedocs.io/en/latest/esp8266wifi/bearssl-client-secure-class.html).
- [LittleFS và cấu hình mount](https://arduino-esp8266.readthedocs.io/en/latest/filesystem.html).
