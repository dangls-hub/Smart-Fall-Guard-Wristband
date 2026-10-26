# Chạy local và kết nối ESP32 qua TLS

## Local

Làm theo README để tạo .env, broker/passwd và khởi động Compose. Mặc định MQTT 1883 có password/ACL, chỉ bind loopback; PostgreSQL cũng chỉ bind loopback. Không dùng địa chỉ localhost của server trên ESP32: localhost trên ESP32 là chính thiết bị.

## TLS cho mạng LAN

Yêu cầu Docker Compose >=2.24.4 (hỗ trợ !override). File docker-compose.tls.yml thay mapping 1883 bằng 8883, thay cấu hình broker và mount certs. Không mở cổng 9001 vì frontend dùng backend.

1. Tạo chứng chỉ thật; certs/ca.crt và server.crt trong Git là placeholder. Không dùng chúng để chạy TLS.
2. Chứng chỉ server phải có SAN chứa đúng DNS/IP dùng trong MQTT_HOST của client. Ví dụ LAN 192.168.1.50: SAN cần IP:192.168.1.50; nếu backend dùng localhost, thêm DNS:localhost.
3. Dùng CA nội bộ hoặc CA tin cậy để ký cert; lưu server.crt/server.key tại certs/. Kiểm tra bằng openssl x509 -in certs/server.crt -noout -text và openssl verify -CAfile certs/ca.crt certs/server.crt. Khóa và file passwd phải đọc được bởi user Mosquitto trong container, không commit vào Git.
4. Đặt .env: MQTT_BIND_ADDRESS bằng LAN IP server; MQTT_HOST bằng tên/IP khớp SAN; MQTT_PORT=8883; MQTT_PROTOCOL=mqtts. Client nạp CA và xác minh hostname, không bỏ qua kiểm tra chứng chỉ.
5. Firmware cần có thời gian hợp lệ để kiểm tra hạn chứng chỉ, password riêng với username=device_id. MQTT service/backend vẫn phải được triển khai trước khi thử đầu-cuối.

Từ thư mục gốc repo:

```powershell
docker compose -f docker-compose.yml -f docker-compose.tls.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
docker compose -f docker-compose.yml -f docker-compose.tls.yml logs mosquitto
```

Đây là cấu hình cho mạng LAN có kiểm soát. API hiện chỉ là khung và chưa có xác thực; giữ HOST=127.0.0.1 cho đến khi triển khai xác thực/phân quyền người giám hộ và HTTPS/WSS.

## Kiểm tra phải đạt trước demo phần cứng

- Kết nối đúng CA + SAN + tài khoản thành công; CA sai, hostname sai hoặc password sai bị từ chối.
- esp32_001 ghi topic của mình và nhận commands/event_ack của mình; không ghi/đọc nhánh esp32_002.
- Thiết bị không phát được commands, backend phát được; anonymous bị từ chối.
- Khi chạy override, không còn mapping 1883/9001 ra host; PostgreSQL vẫn ở loopback.
- Restart broker giữ dữ liệu persistence. Kiểm tra log khi passwd/cert/key thiếu hoặc không đọc được.
- Nạp schema lần đầu thành công. Với CSDL đã tồn tại, dùng migration riêng; không tự xóa volume.

Lưu log thực tế vào INFRA_TEST_REPORT.md. Cấu hình parse hợp lệ không đồng nghĩa các bước runtime đã đạt.

Nguồn: [Mosquitto configuration](https://mosquitto.org/man/mosquitto-conf-5.html), [Compose merge/override](https://docs.docker.com/reference/compose-file/merge/), [PostgreSQL official image](https://hub.docker.com/_/postgres).
