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

## Chưa thể xác nhận ở lượt kiểm tra 26/10/2026

Docker Engine chưa chạy nên chưa khởi động Mosquitto/PostgreSQL, chưa thử xác thực/ACL/TLS thực tế hoặc chạy SQL init. Chứng chỉ hiện có vẫn là placeholder; cần tạo cert và passwd thật theo DEPLOYMENT.md.

Chưa có phép đo phần cứng, pin, độ chính xác hoặc độ trễ đầu-cuối. Việc kiểm tra cấu hình và backend khung không thay thế nghiệm thu các chức năng đó.

## SP1-BE-01 — 28/10/2026

SHA trước khi sửa: `5c1b1dffde00998a00c061d67bb2f9ca0bd71fe4`. Working tree ban đầu sạch; triển khai trên `feat/backend-server`. Các file ZIP/diff bàn giao được giữ ngoài checkout, không đưa vào commit. Checkout thực tế nằm trong thư mục con `Smart-Fall-Guard-Wristband` của workspace.

Đã triển khai Express + MQTT transport, không đánh dấu toàn bộ Spiral 1 hoàn thành. Không thay dependencies hoặc lockfile; chỉ thêm script `npm test`. Chưa có CSDL/API nghiệp vụ/ACK/cảnh báo/heartbeat/downlink/chống trùng event_id. Tránh nhân đôi listener chỉ bảo đảm một lần xử lý mỗi delivery của client, không loại bỏ các delivery trùng do QoS 1.

### Kiểm tra tự động và giới hạn ở lượt ban đầu (mock)

- Cài đúng lockfile: `npm.cmd ci --ignore-scripts --no-audit --no-fund` trong `backend`.
- Máy mặc định có Node 24.15.0; kiểm thử bằng **Node 22.23.4**, chạy `npm.cmd exec --yes --package=node@22 -- node --test test/mqttService.test.js test/server.test.js` trong `backend`. Khi Node 22 đã nằm trên PATH, dùng `npm test`.
- **13/13 test pass** bằng `node:test`: cấu hình thiếu/sai, bảo vệ log credentials, đọc CA tương đối từ gốc repo dù đổi cwd, tùy chọn xác minh TLS, SUBACK lỗi/từ chối, JSON đúng/sai, một client/listener, stop idempotent và deadline.
- Express thật + MQTT.js thật chạy trong tiến trình riêng: HTTP 404 cho API chưa triển khai, CORS preflight 204, HTTP vẫn phục vụ khi cổng broker không lắng nghe và MQTT tự reconnect. Peer MQTT mô phỏng trên TCP loopback trả CONNACK/SUBACK, gửi JSON đúng/sai và chủ động ngắt socket để xác minh reconnect: đúng một SUBSCRIBE mỗi kết nối và một lần xử lý mỗi delivery.
- Dừng khi đang reconnect và khi đang kết nối đều giải phóng HTTP/MQTT, tiến trình thoát mã 0. HTTP request dang dở bị ngắt khi hết thời hạn, tiến trình thoát mã 1. Cổng HTTP bị chiếm cũng đóng MQTT và thoát mã 1.
- Trên Windows, fixture phát `SIGINT`/`SIGTERM` bằng IPC rồi `process.emit` để chạy handler của ứng dụng. Chưa kiểm chứng việc hệ điều hành Unix gửi tín hiệu thật; không dùng `child.kill('SIGTERM')` trên Windows để tuyên bố graceful shutdown.
- **Broker thật ở lượt ban đầu: chưa kiểm tra được.** `docker version` (kiểm tra lại ngoài sandbox) báo không có pipe Docker Engine. Khi đó chưa có `.env` hoặc `broker/passwd`; không dùng mật khẩu mẫu để tuyên bố kết nối thành công. Peer TCP mô phỏng không kiểm chứng xác thực, Mosquitto ACL, publish → broker → backend hoặc TLS handshake/CA/SAN thật. Kết quả nghiệm thu local sau khi Docker chạy được ghi riêng bên dưới.

### ACL và reconnect

Giữ nguyên `broker/acl.conf`: backend đọc `telemetry`, `alert`, `status`, `sync`, `command_ack`; quyền ghi `commands`/`event_ack` chưa được sử dụng. Service gửi wildcard theo Spiral 1, không mở rộng quyền. Quyền đọc vẫn do [ACL Mosquitto](https://mosquitto.org/man/mosquitto-conf-5.html) kiểm soát; SUBACK thành công không chứng minh mọi suffix được phép đọc. Lượt nghiệm thu bên dưới đã xác nhận delivery telemetry và chặn publish chéo thiết bị trên broker thật; chưa kiểm tra toàn bộ ma trận quyền các suffix. Nếu bị từ chối subscribe, service log lỗi, không tự sửa ACL.

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

Backend phải log topic telemetry cùng object JSON chứa `source: 'simulator'`. Chỉ xác nhận sau khi thực sự thấy log backend; kết quả chạy thực tế được ghi bên dưới. Có thể đổi payload thành `'{broken-json'` trong lệnh publish để thấy `Invalid JSON`, sau đó gửi JSON đúng lần nữa. Ngắt/khởi động lại Mosquitto để kiểm tra reconnect; gửi một mẫu mới và đối chiếu một dòng log nhận tương ứng.

## Nghiệm thu Mosquitto thật local — 28/10/2026

Tiếp tục trên `feat/backend-server`, PR [#4](https://github.com/dangls-hub/Smart-Fall-Guard-Wristband/pull/4). Không tạo nhánh/PR mới và giữ PR ở Draft. Mã transport không cần sửa sau lượt thử này; bổ sung test tích hợp có thể chạy lại và bằng chứng thực tế.

### Môi trường và chuẩn bị

- Windows, Docker Desktop **4.95.0**, Engine **29.8.2**, Linux containers / WSL2.
- Backend **Node.js 22.23.4**, **MQTT.js 5.16.1** theo `backend/package-lock.json` hiện có.
- Broker **Mosquitto 2.1.2**, image `eclipse-mosquitto:2`, digest `sha256:860aeb5d63ce509508f6dcfb2bc8a1c1dd2bc60555b562b45ce90e52d8dabb0f`.
- MQTT **không TLS**, `127.0.0.1:1883`, xác thực username/password và ACL hiện tại. Chỉ khởi động service `mosquitto`; PostgreSQL không được khởi động.
- Trước khi chuẩn bị, `.env` và `broker/passwd` đều chưa tồn tại. Đã tạo mới credentials ngẫu nhiên local cho `fallguard_backend`, `esp32_001`, `esp32_002`; không dùng mật khẩu mẫu, không ghi đè password file có sẵn. Password file chứa hash tạo bởi `mosquitto_passwd`; giá trị mật khẩu không xuất hiện trong lệnh, Git hoặc log bàn giao.
- `.env` có POSTGRES_PASSWORD ngẫu nhiên chỉ để Compose nội suy cấu hình; không kết nối hoặc khởi động PostgreSQL. Hai file credentials vẫn nằm local và được `.gitignore` loại trừ. Giữ nguyên `broker/acl.conf`, `broker/mosquitto.conf` và Compose.
- Broker có cảnh báo owner/mode của `passwd` và `acl.conf` trên Windows bind mount. Bản 2.1.2 vẫn khởi động và các phép thử bên dưới pass; chưa xử lý quyền file/container trong phạm vi backend.

### Lệnh và kết quả thực tế

Từ gốc repo đã chạy `docker compose config --quiet`, `docker compose up -d mosquitto`. Backend/test chạy bằng đúng binary Node 22; bài test là `node --test test/mosquitto.integration.js` trong `backend` (tương đương script `npm run test:mosquitto` khi Node 22 trên PATH).

**Kết quả: cả 7 ca tích hợp pass, TAP báo 8/8 test pass khi tính cả test cha; 0 fail, 0 skip. Không dùng mock MQTT hoặc broker.** Test khởi động Express thật cùng service MQTT mặc định; các publisher/subscriber đều kết nối Mosquitto qua TCP thật.

| Ca thử | Bằng chứng/kết quả |
|---|---|
| Backend đăng nhập và subscribe | Broker ghi client dùng `fallguard_backend`; backend log `Connected` và `Subscribed fallguard/v1/devices/+/+ (QoS 1)`. HTTP trả 404 cho API chưa triển khai. |
| Telemetry hợp lệ | `esp32_001` publish telemetry QoS 0, retain=false; backend log đúng topic và object đã parse, khớp payload gửi. |
| JSON lỗi rồi JSON đúng | `{broken-json` sinh `Invalid JSON ... message ignored`; mẫu `after-invalid` tiếp theo được nhận và HTTP vẫn trả lời. |
| ACL chặn publish chéo thiết bị | Observer bằng tài khoản backend subscribe đúng `esp32_002/telemetry`, nhận mẫu hợp lệ do `esp32_002` gửi trước và sau phép thử. `esp32_001` publish vào nhánh `esp32_002` với marker riêng; chờ 1.5 giây và xác nhận cả observer lẫn backend nhận **0** bản marker bị cấm. Không dùng callback publish/PUBACK để kết luận ACL cho phép hay từ chối. |
| Dừng broker | `docker compose stop -t 3 mosquitto` thành công; backend log offline, reconnect và ECONNREFUSED. Hai lần HTTP GET vẫn trả 404. |
| Khởi động lại broker | `docker compose start mosquitto` thành công; cùng client backend kết nối lại, subscribe lại. Có tổng cộng 2 log SUBACK qua 2 kết nối, vẫn chỉ 1 listener `message`; mẫu `after-restart` được xử lý đúng 1 lần. Broker log cùng client ID trước/sau restart. |
| Đóng ứng dụng | `shutdown()` đóng HTTP và MQTT thật; MQTT client báo disconnected và cổng HTTP trả ECONNREFUSED. |

### Ctrl+C thật trong terminal

Đã chạy trực tiếp `node backend/server.js` bằng binary Node 22 trong PTY, dùng HOST/PORT từ `.env`: **127.0.0.1:5000**. Một client thiết bị thật gửi mẫu `sp1be01-terminal-before-ctrlc` qua Mosquitto; backend log đúng mẫu, HTTP GET trả 404.

Sau phím Ctrl+C thật (`\x03` vào terminal, không dùng fixture IPC hay `process.emit`):

```text
[App] Shutting down HTTP and MQTT
[MQTT] Connection closed
[MQTT] Client stopped
[App] HTTP and MQTT stopped
After Ctrl+C: HTTP 127.0.0.1:5000 ECONNREFUSED (port released)
```

Kiểm tra tiến trình không còn Node chạy `backend/server.js`; broker ghi MQTT client của backend ngắt kết nối. Terminal/PowerShell wrapper trả mã 1 sau Ctrl+C; không ghi nhận riêng exit code của tiến trình Node trong PTY. Kết luận giải phóng tài nguyên dựa trên log shutdown, broker disconnect, cổng đã đóng và tiến trình đã kết thúc, không suy từ exit code wrapper. Ca `shutdown()` tự động phía trên pass; không đánh đồng hai cách dừng.

### Log bàn giao và giới hạn

- [TAP và log ứng dụng đã lọc secrets](evidence/SP1-BE-01-mosquitto-local.log).
- [Log broker chọn lọc: phiên bản, auth, restart và disconnect](evidence/SP1-BE-01-mosquitto-broker.log).
- [Ghi nhận Ctrl+C thật và kiểm tra tài nguyên](evidence/SP1-BE-01-ctrl-c.log).

**Đã kiểm chứng:** MQTT local, publish → Mosquitto thật → backend, đăng nhập bằng các tài khoản hợp lệ, subscribe, lỗi JSON, restart, chặn ghi chéo telemetry theo ACL, shutdown và Ctrl+C trên môi trường nêu trên.

**Chưa kiểm chứng:** TLS handshake/CA/SAN thật, toàn bộ ma trận ACL ngoài ca telemetry, SIGTERM từ hệ điều hành Unix, firmware/phần cứng hoặc đầu-cuối dashboard. SP1-BE-02 vẫn chưa triển khai; `/api/devices` trả 404 được dùng để kiểm tra HTTP liveness, không phải endpoint nghiệp vụ. Không đánh dấu toàn bộ Spiral 1 hoàn thành.

### Chạy lại bài nghiệm thu thật

Chỉ dùng broker local dành cho thử nghiệm vì bài test chủ động stop/start service Mosquitto. Giữ nguyên `.env`/password file đã có; nếu thiếu tài khoản, phối hợp cấp tài khoản thiết bị và nhập mật khẩu tương ứng vào `.env`, không tạo lại password file bằng `-c` trên file có sẵn. Cần hai username thiết bị khác nhau, đúng định dạng device_id, có quyền ghi nhánh của mình theo ACL hiện tại.

```text
MQTT_HOST=127.0.0.1
MQTT_PROTOCOL=mqtt
MQTT_USERNAME=fallguard_backend
MQTT_TEST_DEVICE1_USERNAME=esp32_001
MQTT_TEST_DEVICE1_PASSWORD=<mật khẩu thiết bị 1 đã cấp>
MQTT_TEST_DEVICE2_USERNAME=esp32_002
MQTT_TEST_DEVICE2_PASSWORD=<mật khẩu thiết bị 2 đã cấp>
```

Các dòng mật khẩu trên chỉ mô tả trường cần đặt trong `.env` local; không phải credentials đã sử dụng. Giữ MQTT_PORT/MQTT_PASSWORD hợp lệ và POSTGRES_PASSWORD không rỗng để Compose kiểm tra cấu hình, dù chỉ chạy Mosquitto.

```powershell
# Từ gốc checkout, Docker Desktop phải đang chạy Linux containers.
docker compose up -d mosquitto
Push-Location backend
# Dùng Node 22 trên PATH:
npm run test:mosquitto
# Hoặc dùng Node 22 tạm thời, không nâng cấp dependencies:
npm.cmd exec --yes --package=node@22 -- node --test test/mosquitto.integration.js
Pop-Location
```

Bài test dừng backend và client kiểm thử khi kết thúc, còn Mosquitto được để chạy lại. Ca Ctrl+C thật được kiểm tra riêng trong terminal theo mô tả trên; script tích hợp tự động gọi `shutdown()`, không mô phỏng Ctrl+C.

## SP1-BE-02 — 30/10/2026

Base sau fetch: `add6efc1a3ac3bad921af0bae8b6af397abb8015` (`origin/main`), khớp snapshot đã review. PR #4 đã merge trước task này. Working tree ban đầu sạch, chưa có staged/untracked changes. Không tìm thấy AGENTS.md, CONTRIBUTING hoặc PR template; README chỉ phân công nhánh chuyên trách, không bắt buộc duy nhất một nhánh. Theo yêu cầu task, dùng nhánh riêng `feat/sp1-be02-api-scaffold` từ origin/main.

Đã khai báo hai GET route `/api/devices` và `/api/events`, chuyển tới handler tương ứng trong controller hiện có. Mỗi handler trả **501**, `application/json; charset=utf-8`, với duy nhất envelope `error` gồm `code: NOT_IMPLEMENTED` và thông báo riêng cho endpoint. Không đọc CSDL, không trả dữ liệu giả hoặc danh sách rỗng như thể đã query. Query/filter không được áp dụng; request có query vẫn trả cùng 501. Route không tồn tại vẫn 404.

Đã chạy **toàn bộ `npm test` bằng Node.js 22.23.4: 17/17 pass, 0 fail, 0 skip**. Máy mặc định Node 24; lượt này đưa thư mục binary Node 22 lên đầu PATH và chạy npm CLI bằng binary Node 22 để cả npm và lifecycle script `node --test test/*.test.js` đều dùng đúng phiên bản:

```powershell
# Trong backend; $node22 trỏ tới binary Node 22 có sẵn trên máy.
$env:Path = (Split-Path -Parent $node22) + ';' + $env:Path
node --version
& $node22 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' test
# Khi Node 22 đã là phiên bản mặc định trên PATH, chỉ cần: npm test
```

- 4 test HTTP mới trong `backend/test/api.test.js`: hai endpoint trả status/Content-Type/JSON đúng hợp đồng, query chưa hỗ trợ vẫn 501, đường dẫn không tồn tại trả 404. Test mount router vào Express độc lập và gọi TCP loopback thật, không import server/MQTT/database, không cần broker hay PostgreSQL.
- 13 test BE-01 vẫn pass: cấu hình MQTT, JSON/SUBACK, client/listener, reconnect, HTTP/CORS khi broker không sẵn sàng, shutdown và cổng HTTP bị chiếm. Chỉ cập nhật kỳ vọng HTTP liveness của `/api/devices` từ 404 sang 501, giữ các phép kiểm tra lifecycle.
- `backend/test/mosquitto.integration.js` cũng đổi kỳ vọng và thông báo liveness 404 → 501 để khớp API hiện tại; **chưa chạy lại Mosquitto integration trong lượt BE-02**. Không tự stop/start broker hoặc chạy PostgreSQL. Kết quả/log ngày 28/10 ở trên và trong `docs/evidence/` được giữ nguyên, không sửa thành kết quả mới; HTTP 404 trong các log đó là hành vi lịch sử trước BE-02.
- Giữ nguyên server.js, mqttService.js, CORS, .env, HOST/PORT, shutdown và dependencies/lockfile. Không mở endpoint telemetry/resolve/commands, không sửa schema/helper, ingest, ACK/dedup, Socket.io, webhook, heartbeat, frontend, firmware hoặc TLS.

Tài liệu `API_DOCUMENTATION.md` tách response 501 hiện tại, route chưa tồn tại 404 và ví dụ 200 **dự kiến ở Spiral 2**; ví dụ dùng các cột schema nền hiện có, ghi rõ migration event_id/timezone còn cần phối hợp. Các yêu cầu xác thực/phân quyền trước mở API ra ngoài được giữ.

Triển khai và test đã có bằng chứng như trên; **được reviewer chấp nhận: chờ review**. Không tự tick nghiệm thu reviewer hoặc đánh dấu toàn bộ Spiral 1 hoàn thành. Xem báo cáo bàn giao ngoài repo để đối chiếu BE02-1 đến BE02-7, commit và Draft PR.
