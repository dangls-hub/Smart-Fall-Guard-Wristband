// [SP2-HW-02, SP3-HW-02, SP4-HW-01] Phụ trách: Phạm Việt Tiến
// Chương trình chính trên D1 mini ESP8266/ESP-12F: Đọc MPU6050 50Hz, chạy FSM, quản lý Buzzer/Button, MQTT & Downlink Commands
#include "mpu6050_driver.h"
#include "fall_detection.h"
#include "spiffs_buffer.h"

void setup() {
    // TODO: Khởi tạo Serial, GPIO (D5/14 nút, D6/12 driver còi, D7/13 LED), I2C (D2/4 SDA, D1/5 SCL), LittleFS, ESP8266WiFi và MQTT
}

void loop() {
    // TODO: Lịch 20 ms đọc cảm biến/FSM, nhường CPU cho Wi-Fi; đo mẫu trễ khi TLS reconnect
    // Xem firmware/README.md; chưa có driver, FSM hoặc MQTT hoạt động
}
