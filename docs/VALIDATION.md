# Kiểm tra bản cập nhật thiết kế — 26/10/2026

## Đã chạy

- `git diff --check`: không có lỗi whitespace.
- `node --check backend/server.js`: cú pháp hợp lệ.
- `docker compose --env-file .env.example config --quiet`: cấu hình local hợp lệ.
- `docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.tls.yml config --quiet`: cấu hình TLS hợp lệ.
- Kiểm tra JSON Compose sau merge: bản local chỉ map MQTT 1883; bản TLS chỉ map 8883, có đúng một mount cấu hình broker và PostgreSQL giữ loopback.
- Kiểm tra đường dẫn Markdown nội bộ và hai bản kế hoạch Spiral: hợp lệ, nội dung hai thư mục khớp nhau.
- Cài dependencies backend với `--ignore-scripts`; tạo package-lock.json.
- Smoke test backend bằng tiến trình riêng và cổng tạm: khởi động thành công, đọc HOST/PORT từ môi trường, CORS preflight trả 204 với origin cấu hình; API chưa triển khai trả 404. Tiến trình thử đã được dừng.

## Chưa thể xác nhận

Docker Engine chưa chạy nên chưa khởi động Mosquitto/PostgreSQL, chưa thử xác thực/ACL/TLS thực tế hoặc chạy SQL init. Chứng chỉ hiện có vẫn là placeholder; cần tạo cert và passwd thật theo DEPLOYMENT.md.

Chưa có phép đo phần cứng, pin, độ chính xác hoặc độ trễ đầu-cuối. Việc kiểm tra cấu hình và backend khung không thay thế nghiệm thu các chức năng đó.

## SP1-BE-01 — 28/10/2026

SHA trước khi sửa: `5c1b1dffde00998a00c061d67bb2f9ca0bd71fe4`. Working tree ban đầu sạch; triển khai trên `feat/backend-server`. Các file ZIP/diff bàn giao được giữ ngoài checkout, không đưa vào commit. Checkout thực tế nằm trong thư mục con `Smart-Fall-Guard-Wristband` của workspace.

Đã triển khai Express + MQTT transport, không đánh dấu toàn bộ Spiral 1 hoàn thành. Không thay dependencies hoặc lockfile; chỉ thêm script `npm test`. Chưa có CSDL/API nghiệp vụ/ACK/cảnh báo/heartbeat/downlink/chống trùng event_id. Tránh nhân đôi listener chỉ bảo đảm một lần xử lý mỗi delivery của client, không loại bỏ các delivery trùng do QoS 1.

### Kiểm tra tự động và giới hạn

- Cài đúng lockfile: `npm.cmd ci --ignore-scripts --no-audit --no-fund` trong `backend`.
- Máy mặc định có Node 24.15.0; kiểm thử bằng **Node 22.23.4**, chạy `npm.cmd exec --yes --package=node@22 -- node --test test/mqttService.test.js test/server.test.js` trong `backend`. Khi Node 22 đã nằm trên PATH, dùng `npm test`.
- **13/13 test pass** bằng `node:test`: cấu hình thiếu/sai, bảo vệ log credentials, đọc CA tương đối từ gốc repo dù đổi cwd, tùy chọn xác minh TLS, SUBACK lỗi/từ chối, JSON đúng/sai, một client/listener, stop idempotent và deadline.
- Express thật + MQTT.js thật chạy trong tiến trình riêng: HTTP 404 cho API chưa triển khai, CORS preflight 204, HTTP vẫn phục vụ khi cổng broker không lắng nghe và MQTT tự reconnect. Peer MQTT mô phỏng trên TCP loopback trả CONNACK/SUBACK, gửi JSON đúng/sai và chủ động ngắt socket để xác minh reconnect: đúng một SUBSCRIBE mỗi kết nối và một lần xử lý mỗi delivery.
- Dừng khi đang reconnect và khi đang kết nối đều giải phóng HTTP/MQTT, tiến trình thoát mã 0. HTTP request dang dở bị ngắt khi hết thời hạn, tiến trình thoát mã 1. Cổng HTTP bị chiếm cũng đóng MQTT và thoát mã 1.
- Trên Windows, fixture phát `SIGINT`/`SIGTERM` bằng IPC rồi `process.emit` để chạy handler của ứng dụng. Chưa kiểm chứng việc hệ điều hành Unix gửi tín hiệu thật; không dùng `child.kill('SIGTERM')` trên Windows để tuyên bố graceful shutdown.
- **Broker thật: chưa kiểm tra được.** `docker version` (kiểm tra lại ngoài sandbox) báo không có pipe Docker Engine. Không có `.env` hoặc `broker/passwd`; không tạo credentials thật hay dùng mật khẩu mẫu để tuyên bố kết nối thành công. Peer TCP mô phỏng không kiểm chứng xác thực, Mosquitto ACL, publish → broker → backend hoặc TLS handshake/CA/SAN thật.

### ACL và reconnect

Giữ nguyên `broker/acl.conf`: backend đọc `telemetry`, `alert`, `status`, `sync`, `command_ack`; quyền ghi `commands`/`event_ack` chưa được sử dụng. Service gửi wildcard theo Spiral 1, không mở rộng quyền. Quyền đọc vẫn do [ACL Mosquitto](https://mosquitto.org/man/mosquitto-conf-5.html) kiểm soát; SUBACK thành công không chứng minh mọi suffix được phép đọc. Cần chạy lại với broker thật để xác nhận quyền và delivery; nếu bị từ chối, service log lỗi subscribe, không tự sửa ACL.

Service tự subscribe trong mỗi sự kiện `connect`, tắt `resubscribe` tự động của [MQTT.js](https://github.com/mqttjs/MQTT.js#client) để tránh gửi thêm SUBSCRIBE. Chỉ đăng ký listener `message` một lần. Lỗi broker được log bằng mã chẩn đoán đã lọc, không in URL hoặc thông báo lỗi thư viện có thể chứa credentials.

### Chạy và tự xác nhận

Dùng Node.js 22. Từ **gốc checkout**, nếu chưa có `.env`, copy `.env.example` rồi đặt cấu hình và mật khẩu backend thật theo README; không ghi đè `.env` đã có. Tài khoản backend cần khớp ACL hiện tại (`fallguard_backend`). Chuẩn bị broker/password file theo README; chỉ khởi động service Mosquitto, không cần PostgreSQL cho task này:

```powershell
docker compose up -d mosquitto
Push-Location backend
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm start
```

Mặc định HTTP ở `http://127.0.0.1:5000`. Khi broker sẵn sàng, phải thấy `Connected` rồi `Subscribed fallguard/v1/devices/+/+`. `GET /api/devices` vẫn trả 404 vì chưa có API nghiệp vụ. Dừng bằng Ctrl+C; log kết thúc là `HTTP and MQTT stopped`.

Terminal PowerShell khác, từ gốc checkout, gửi telemetry bằng **tài khoản thiết bị thật** đã được tạo (không dùng tài khoản backend để publish telemetry). Đoạn này dùng dependencies sẵn có và cấu hình broker/CA trong `.env`, không in mật khẩu:

```powershell
Push-Location backend
$deviceCredential = Get-Credential -UserName esp32_001 -Message 'Tai khoan MQTT thiet bi da tao tren broker'
$env:MQTT_DEVICE_USERNAME = $deviceCredential.UserName
$env:MQTT_DEVICE_PASSWORD = $deviceCredential.GetNetworkCredential().Password
try {
@'
const path = require('node:path');
require('dotenv').config({ path: path.resolve('..', '.env') });
const { readConfig } = require('./services/mqttService');
const device = process.env.MQTT_DEVICE_USERNAME;
if (!/^[a-zA-Z0-9_-]+$/.test(device)) throw new Error('Invalid device username');
const options = readConfig({ ...process.env, MQTT_USERNAME: device,
    MQTT_PASSWORD: process.env.MQTT_DEVICE_PASSWORD });
const client = require('mqtt').connect({ ...options, reconnectPeriod: 0 });
const timer = setTimeout(() => finish(true), 8000);
let done = false;
function finish(failed) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    console.log(failed ? 'Publish failed; check broker/configuration' : 'Sample sent; check backend log');
    process.exitCode = failed ? 1 : 0;
    client.end(failed);
}
client.on('error', () => finish(true));
client.on('connect', () => client.publish(`fallguard/v1/devices/${device}/telemetry`,
    JSON.stringify({ device_id: device, source: 'simulator', svm: 1.02 }),
    { qos: 0, retain: false }, error => finish(Boolean(error))));
'@ | node
} finally {
    Remove-Item Env:MQTT_DEVICE_USERNAME, Env:MQTT_DEVICE_PASSWORD
    Pop-Location
}
```

Backend phải log topic telemetry cùng object JSON chứa `source: 'simulator'`. Đây là kiểm tra thủ công chỉ được xác nhận sau khi thực sự thấy log backend; chưa phải kết quả đã chạy trong môi trường hiện tại. Có thể đổi payload thành `'{broken-json'` trong lệnh publish để thấy `Invalid JSON`, sau đó gửi JSON đúng lần nữa. Ngắt/khởi động lại Mosquitto để kiểm tra reconnect; gửi một mẫu mới và đối chiếu một dòng log nhận tương ứng.
