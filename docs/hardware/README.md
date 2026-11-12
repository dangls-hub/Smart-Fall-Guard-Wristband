# Sơ đồ EasyEDA — SP1-HW-01 — D1 mini ESP8266 Rev C

Bản hiện hành là **Rev C**, cập nhật 10/11/2026 cho bo D1 mini tương thích WEMOS/LOLIN, module ESP-12F theo ảnh đã mua. Gồm hai sheet nguồn và tín hiệu/I/O; chưa thử trên phần cứng thật. Chạy USB trước, phần pin/power path là thiết kế mở rộng chưa xác nhận linh kiện thực tế.

File nguồn Rev C trong repo có thể nhập vào EasyEDA Standard bằng **File → Open → EasyEDA… → Import File**. Chưa nhập hoặc cập nhật Rev C lên project EasyEDA online.

## Project EasyEDA cũ — chỉ tham khảo ESP32

Bản Rev B trước đây đã được nhập và lưu thành project EasyEDA **Smart Fall-Guard Rev B**, gồm hai sheet nguồn và tín hiệu/I/O:

[Mở sheet nguồn Rev B trên EasyEDA](https://easyeda.com/editor#id=4880326bf38a4158a439c3ab5b8f119b%7C6d03a82dc1ed46f58ef9680876666942)

Bản Rev A chạy USB vẫn được giữ làm mốc trong project **SmartFallGuard**, sheet **SmartFallGuard_USB_RevA**:

[Mở sheet trên EasyEDA](https://easyeda.com/editor#id=9686a59bfccf45bdb75a2a6bf638552f%7C669a25fdbfe64005ba6351d9ed5ac63a)

Quyền truy cập theo tài khoản EasyEDA hiện có; đường dẫn không tự cấp quyền chia sẻ.

Các link trên vẫn trỏ tới thiết kế ESP32 cũ, không phản ánh chân D1 mini Rev C. Dùng file Rev C trong repo để đấu nối bo mới.

## Các tệp bàn giao chính

- [`../hardware_schematic.pdf`](../hardware_schematic.pdf): sơ đồ Rev C dạng vector để duyệt/in.
- [`../hardware_schematic.png`](../hardware_schematic.png): sơ đồ Rev C dạng ảnh theo đúng tên bàn giao của task.
- [`SmartFallGuard_RevC.json`](SmartFallGuard_RevC.json): nguồn EasyEDA Standard chỉnh sửa được, gồm sheet `POWER` và `SIGNAL/IO`.
- `validate_schematic.py`: kiểm tra hai sheet có đúng 18 ký hiệu, 52 chân và 18 net dự kiến.

## Tệp hỗ trợ và lịch sử

- `SmartFallGuard_RevC.svg`: bản vector Rev C dùng để tạo PNG/PDF.
- `SmartFallGuard_RevB.json`, `.svg`: bản ESP32 cũ có nguồn pin; giữ nguyên làm lịch sử.
- `SmartFallGuard_USB_RevA.json`, `.svg`, `.png`: bản mốc USB-only trước khi thêm nguồn pin.

Không nhập PNG làm schematic. Không dùng chân ESP32 trong Rev A/B để đấu bo D1 mini và không dùng Rev A để lắp nguồn pin.

## Phạm vi Rev C

- USB 5 V cấp module sạc BQ24074 có power-path; pin là Li-Po 1S có bảo vệ.
- Đầu ra SYS của bộ sạc qua công tắc vào module buck-boost TPS63070 đặt 3,3 V.
- JP1 cách ly đầu ra buck-boost khỏi rail 3V3 của D1 mini. Trước khi cắm USB nạp chương trình: tắt SW2, mở JP1, sau đó mới cắm USB. Không cấp đồng thời USB và 3V3 ngoài; xác minh regulator/cách ly của đúng bo trước khi chạy pin.
- Dòng sạc thiết kế giới hạn tối đa 500 mA và không được vượt thông số của viên pin được mua. Không chốt điện trở/cấu hình module trước khi có datasheet viên pin và module thực tế.
- D2/GPIO4 nối SDA, D1/GPIO5 nối SCL; AD0 xuống GND chọn địa chỉ 0x68. INT/XDA/XCL không nối trong bản polling.
- Nút D5/GPIO14 xuống GND; firmware phải dùng INPUT_PULLUP và debounce.
- D7/GPIO13 qua R3 330 ohm và LED đỏ xuống GND.
- D6/GPIO12 qua R1 1k điều khiển Q1 NPN; R2 10k kéo base xuống emitter. Còi piezo thụ động 3,3 V, dòng tối đa 20 mA theo phạm vi thiết kế này.
- D3/GPIO0, D4/GPIO2, D8/GPIO15 để trống để tránh ảnh hưởng chế độ boot. Các chân không dùng khác không được vẽ trên ký hiệu chức năng U1.
- R4/R5 4,7k là tùy chọn; không lắp nếu module đã có pull-up I2C phù hợp lên 3,3 V. C1 100nF đặt gần nguồn IMU nếu cần theo module thực tế.
- Xem `../HARDWARE_BOM.md` để chốt đúng module, pin và thiết bị đo trước khi mua.

U1/U2 là ký hiệu chức năng của module; số chân GPIO của U1 không phải thứ tự chân header vật lý. Chân B/C/E của Q1 và A/K của D1 cũng là định danh chức năng. Kiểm tra đúng sơ đồ module, mức nguồn 3,3 V và pinout linh kiện mua về trước khi đấu nối.

Footprint chưa gán vì chưa có kích thước/header và mã các module thực tế đã xác minh. Đây là sơ đồ phục vụ lắp thử, chưa phải PCB sẵn sàng sản xuất. Kiểm tra net tĩnh không thay thế ERC với thư viện/footprint chính xác hoặc phép đo mạch thật. Việc xác nhận cách ly nguồn, điện áp 3,3 V, dòng sạc và sụt áp khi Wi-Fi phát phải thực hiện trên phần cứng.

Chạy lại kiểm tra từ thư mục gốc repo:

```powershell
python docs/hardware/validate_schematic.py
```

Kết quả mong đợi: Rev C, 2 sheet, 18 ký hiệu, 52 chân và 18 net; SDA nối U1.4, SCL nối U1.5, nút U1.14, LED U1.13, còi U1.12. Đây là số GPIO chức năng, không phải vị trí chân header.

Xuất lại bản xem từ SVG bằng CairoSVG (cài riêng công cụ nếu cần):

```sh
cairosvg docs/hardware/SmartFallGuard_RevC.svg -o docs/hardware_schematic.pdf
cairosvg docs/hardware/SmartFallGuard_RevC.svg -s 2 -o docs/hardware_schematic.png
```

Sau khi sửa JSON, phải cập nhật SVG cho khớp trước khi xuất; SVG là bản trình bày riêng, không tự sinh từ JSON. Luôn chạy validator và kiểm tra hình xuất. Tham chiếu [ánh xạ D1 mini chính thức trong Arduino Core](https://github.com/esp8266/Arduino/blob/master/variants/d1_mini/pins_arduino.h).
