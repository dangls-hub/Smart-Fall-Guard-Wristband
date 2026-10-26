# Sơ đồ EasyEDA — SP1-HW-01

Bản Rev B đã được nhập và lưu thành project EasyEDA **Smart Fall-Guard Rev B**, gồm hai sheet nguồn và tín hiệu/I/O:

[Mở sheet nguồn Rev B trên EasyEDA](https://easyeda.com/editor#id=4880326bf38a4158a439c3ab5b8f119b%7C6d03a82dc1ed46f58ef9680876666942)

Bản Rev A chạy USB vẫn được giữ làm mốc trong project **SmartFallGuard**, sheet **SmartFallGuard_USB_RevA**:

[Mở sheet trên EasyEDA](https://easyeda.com/editor#id=9686a59bfccf45bdb75a2a6bf638552f%7C669a25fdbfe64005ba6351d9ed5ac63a)

Quyền truy cập theo tài khoản EasyEDA hiện có; đường dẫn không tự cấp quyền chia sẻ.

Rev B hoàn thành phạm vi thiết kế của task `SP1-HW-01` ở mức module, gồm hai sheet nguồn và tín hiệu/I/O. File nguồn có thể nhập vào EasyEDA Standard bằng **File → Open → EasyEDA… → Import File**.

## Các tệp bàn giao chính

- [`../hardware_schematic.pdf`](../hardware_schematic.pdf): sơ đồ Rev B dạng vector để duyệt/in.
- [`../hardware_schematic.png`](../hardware_schematic.png): sơ đồ Rev B dạng ảnh theo đúng tên bàn giao của task.
- `SmartFallGuard_RevB.json`: nguồn EasyEDA Standard chỉnh sửa được, gồm sheet `POWER` và `SIGNAL/IO`.
- `validate_schematic.py`: kiểm tra hai sheet có đúng 18 ký hiệu, 52 chân và 18 net dự kiến.

## Tệp hỗ trợ và lịch sử

- `SmartFallGuard_RevB.svg`: bản vector dùng để tạo PNG/PDF.
- `SmartFallGuard_USB_RevA.json`, `.svg`, `.png`: bản mốc USB-only trước khi thêm nguồn pin.

Không nhập PNG làm schematic và không dùng bản Rev A để lắp phần nguồn pin.

## Phạm vi Rev B

- USB 5 V cấp module sạc BQ24074 có power-path; pin là Li-Po 1S có bảo vệ.
- Đầu ra SYS của bộ sạc qua công tắc vào module buck-boost TPS63070 đặt 3,3 V.
- JP1 cách ly đầu ra buck-boost khỏi rail 3V3 của DevKit. Trước khi cắm USB nạp chương trình: tắt SW2, mở JP1, sau đó mới cắm USB. Không cấp đồng thời USB và 3V3 ngoài cho DevKit.
- Dòng sạc thiết kế giới hạn tối đa 500 mA và không được vượt thông số của viên pin được mua. Không chốt điện trở/cấu hình module trước khi có datasheet viên pin và module thực tế.
- GPIO21/22 nối SDA/SCL, AD0 xuống GND để chọn địa chỉ 0x68.
- Nút GPIO18 xuống GND; firmware phải dùng INPUT_PULLUP và debounce.
- GPIO23 qua R3 330 ohm và LED đỏ xuống GND.
- GPIO19 qua R1 1k điều khiển Q1 NPN; R2 10k kéo base xuống emitter. Còi piezo thụ động 3,3 V, dòng tối đa 20 mA theo phạm vi thiết kế này.
- R4/R5 4,7k là tùy chọn; không lắp nếu module đã có pull-up I2C phù hợp lên 3,3 V. C1 100nF đặt gần nguồn IMU nếu cần theo module thực tế.
- Xem `../HARDWARE_BOM.md` để chốt đúng module, pin và thiết bị đo trước khi mua.

U1/U2 là ký hiệu chức năng của module; số chân GPIO của U1 không phải thứ tự chân header vật lý. Chân B/C/E của Q1 và A/K của D1 cũng là định danh chức năng. Kiểm tra đúng sơ đồ module, mức nguồn 3,3 V và pinout linh kiện mua về trước khi đấu nối.

Footprint chưa gán vì mã module thực tế chưa được chốt. Đây là sơ đồ phục vụ lắp thử, chưa phải PCB sẵn sàng sản xuất. Kiểm tra net tĩnh không thay thế ERC với thư viện/footprint chính xác hoặc phép đo mạch thật. Việc xác nhận cách ly nguồn, điện áp 3,3 V, dòng sạc và sụt áp khi Wi-Fi phát phải thực hiện trên phần cứng.

Chạy lại kiểm tra từ thư mục gốc repo:

```powershell
python docs/hardware/validate_schematic.py
```
