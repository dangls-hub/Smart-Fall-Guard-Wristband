# PostgreSQL — SP1-INF-02

Phụ trách: Trần Đình Nam. PostgreSQL 17 chạy trong Compose; backend Node.js 22 chạy trên host.

Từ gốc repo, tạo `.env` từ `.env.example` nếu chưa có. Đặt `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` bằng cấu hình local thật. Không commit `.env`.

```bash
docker compose up -d postgres
cd backend
npm ci --ignore-scripts --no-audit --no-fund
npm run check:db
npm test
npm run test:postgres
```

`check:db` trả exit code 0 khi kết nối thành công và tìm được 4 bảng nền; code 1 khi cấu hình, kết nối, schema hoặc đóng pool thất bại. Test tích hợp yêu cầu tài khoản PostgreSQL có xác thực mật khẩu, vì có ca kiểm tra sai mật khẩu phải trả `28P01`. Test dùng CSDL trong `.env`, không mock PostgreSQL và không sửa schema/dữ liệu bền vững.

## Dùng helper từ backend

Caller nạp `.env` ở gốc repo trước khi tạo helper. Tạo một instance dùng chung cho vòng đời ứng dụng:

```js
const { createDatabase } = require('../database/db_helper'); // From backend/server.js.
const db = createDatabase(process.env);

try {
    const result = await db.query(
        'SELECT device_id, status FROM devices WHERE device_id = $1',
        ['esp32_001'],
    );
    console.log(result.rows);
} finally {
    await db.close(); // In a running server, call only during shutdown.
}
```

`query(text, values)` trả kết quả `pg` hoặc reject với lỗi gốc để caller xử lý; không nối dữ liệu người dùng vào chuỗi SQL và không trả chi tiết lỗi CSDL cho HTTP client. `close()` chờ query đang chạy hoàn tất, có thể gọi nhiều lần; query sau khi đóng bị từ chối. Pool tối đa 10 connection, timeout kết nối 5 giây, idle timeout 10 giây. Lỗi kết nối idle được log bằng thông báo cố định, không chứa credentials/SQL.

Helper lấy dependency `pg` từ package backend qua `createRequire`, vì `database/` nằm ngoài `backend/` và không có package riêng. Không cần thêm dependency hoặc lockfile tại gốc repo.

API hiện vẫn là khung 501; server chưa tạo helper hoặc lưu dữ liệu MQTT. Helper chưa cung cấp transaction trên một client cố định. Khi triển khai ingest/ACK, cần thêm transaction đúng cách; không chạy `BEGIN`/`COMMIT` bằng các lần `db.query` độc lập qua pool.

## Schema và dữ liệu hiện có

Compose mount `database/schema.sql` vào init directory; script chỉ tự chạy khi data directory rỗng. Với volume hiện có, sửa schema bằng migration riêng. Không dùng `docker compose down -v` để cập nhật schema.

Đổi mật khẩu trong `.env` không tự đổi mật khẩu role đã được tạo trong volume. Lỗi `28P01` cần đối chiếu credentials với role thực tế. `ECONNREFUSED` thường cần kiểm tra service/cổng; nếu dùng cổng host khác, cập nhật `DB_PORT` cho backend.

Schema nền chưa có `event_id`, ràng buộc chống trùng và thời điểm xảy ra/nhận riêng. Chúng thuộc bước triển khai ingest/offline tiếp theo. Kết quả hiện có không chứng minh init trên volume mới, persistence qua restart hoặc luồng MQTT → CSDL → ACK.
