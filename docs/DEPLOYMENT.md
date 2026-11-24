# Chạy local và kết nối ESP8266 qua MQTT TLS

## Local

Làm theo README để tạo `.env` và `broker/passwd`. Compose mặc định dùng MQTT 1883 có xác thực và ACL trên loopback. PostgreSQL cũng chỉ mở trên loopback.

## TLS cho mạng LAN

Dùng Docker Compose ≥2.24.4 và OpenSSL trên Linux hoặc WSL. Chọn tên DNS và/hoặc địa chỉ IP mà client thực sự dùng để kết nối. Ví dụ sau tạo SAN cho backend dùng `localhost` và bo dùng địa chỉ LAN `192.168.1.50`.

```bash
bash scripts/provision-mqtt-tls.sh localhost 192.168.1.50
```

Script tạo `certs/local/ca.crt`, `ca.key`, `server.crt` và `server.key` ngoài Git, kiểm tra chuỗi chứng chỉ và SAN rồi mới cài. Nó từ chối ghi đè bộ chứng chỉ có sẵn. Giữ `ca.key` trên máy cấp chứng chỉ và chỉ chép `ca.crt` cho client. Compose chỉ mount `server.crt` và `server.key`. Các file chứng chỉ mẫu nằm ngay trong `certs/` là placeholder.

Nếu thư mục repo nằm trên NTFS hoặc filesystem không thực thi quyền Unix, chạy script với biến `MQTT_TLS_DIR` trỏ đến một thư mục **mới** trên filesystem Linux. Cấu hình cùng đường dẫn tuyệt đối trong `.env` và đặt `MQTT_CA_PATH` tới `ca.crt` tương ứng. Có thể dùng `MQTT_PASSWORD_FILE` để mount file mật khẩu từ filesystem Linux thay cho `broker/passwd`.

Tạo tài khoản theo README. Tên tài khoản bo trùng `device_id` và dùng mật khẩu riêng. Dành riêng `fallguard_backend` cho backend. Nếu chọn `MQTT_PASSWORD_FILE`, dùng đường dẫn đó khi tạo hoặc cập nhật file bằng `mosquitto_passwd`. Trên Linux, kiểm tra UID/GID trong image đang chạy và cấp quyền đọc cho Mosquitto. Ví dụ với image có UID/GID 1883 và các đường dẫn mặc định:

```bash
docker run --rm --entrypoint id eclipse-mosquitto:2 mosquitto
sudo chown 1883:1883 certs/local/server.key broker/passwd
sudo chmod 600 certs/local/server.key broker/passwd
```

Chỉnh `.env` theo địa chỉ thực tế. Khi bind vào IP LAN, backend trên cùng máy cũng dùng IP LAN đó làm `MQTT_HOST` và chứng chỉ phải chứa IP trong SAN. Để thử local, đặt cả hai biến địa chỉ thành `127.0.0.1` và cấp chứng chỉ có SAN IP tương ứng.

```dotenv
MQTT_BIND_ADDRESS=192.168.1.50
MQTT_HOST=192.168.1.50
MQTT_PROTOCOL=mqtts
MQTT_PORT=8883
MQTT_CA_PATH=./certs/local/ca.crt
```

```bash
docker compose -f docker-compose.yml -f docker-compose.tls.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
docker compose -f docker-compose.yml -f docker-compose.tls.yml logs mosquitto
```

TLS override thay mapping 1883 bằng 8883. Firmware cần đồng hồ hợp lệ và phải xác minh CA, SAN và hạn chứng chỉ. Giữ HTTP trên loopback cho đến khi backend có xác thực và phân quyền.

## Kiểm tra TLS và ACL

Dùng một broker thử nghiệm chỉ bind loopback. Cấu hình `.env` với CA cục bộ, tài khoản backend và hai tài khoản test riêng (`MQTT_TEST_DEVICE1_*` và `MQTT_TEST_DEVICE2_*` theo `.env.example`). Sau khi cài dependency backend, chạy từ thư mục repo:

```bash
node --env-file=.env scripts/check-mqtt-tls.cjs
```

Bài thử xác minh kết nối có CA/SAN hợp lệ, từ chối CA/SAN sai, mật khẩu sai và truy cập anonymous. Hai thiết bị gửi mẫu thử lên các topic được cấp quyền. Script đối chiếu danh sách tin backend và từng thiết bị thực sự nhận được, gồm cả các lệnh/ACK chỉ dành cho thiết bị đích. Nó cũng kiểm tra broker từ chối các thao tác publish ngoài phạm vi theo MQTT 5.

Khi triển khai LAN, chạy thêm với bo thật và lưu kết quả vào `INFRA_TEST_REPORT.md`. PostgreSQL vẫn bind loopback. Dùng volume hoặc project thử riêng khi kiểm tra khởi tạo schema mới và persistence qua restart.

Nguồn: [Mosquitto configuration](https://mosquitto.org/man/mosquitto-conf-5.html), [Compose merge/override](https://docs.docker.com/reference/compose-file/merge/), [PostgreSQL official image](https://hub.docker.com/_/postgres).
