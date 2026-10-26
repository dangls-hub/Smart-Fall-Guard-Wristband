# Sơ đồ EasyEDA — USB Rev A

Bản schematic prototype đã mở và lưu trong project **SmartFallGuard**, sheet **SmartFallGuard_USB_RevA**:

[Mở sheet trên EasyEDA](https://easyeda.com/editor#id=9686a59bfccf45bdb75a2a6bf638552f%7C669a25fdbfe64005ba6351d9ed5ac63a)

Quyền truy cập theo tài khoản EasyEDA hiện có; đường dẫn không tự cấp quyền chia sẻ.

## Các tệp bàn giao

- `SmartFallGuard_USB_RevA.json`: nguồn EasyEDA Standard có thể chỉnh sửa, một sheet độc lập.
- `SmartFallGuard_USB_RevA.svg`: vector trích từ canvas EasyEDA sau khi vẽ xong.
- `SmartFallGuard_USB_RevA.png`: ảnh rõ nét để xem/in và đưa vào báo cáo.
- `EasyEDA_editor_preview.png`: ảnh xác nhận schematic đang mở trong EasyEDA.
- `SmartFallGuard_USB_RevA.net.json`: bảng các kết nối kỳ vọng đã đối chiếu với nguồn JSON.
- `validate_schematic.py`: kiểm tra nguồn JSON có đủ 12 ký hiệu, 36 chân, 13 net và không nối nhầm các nhóm chân đã định nghĩa.

Mở bản local: EasyEDA **Standard → File → Open → EasyEDA…**, chọn file JSON, giữ **Import File** rồi chọn **Import**. Không mở bằng chế độ PCB hoặc nhập ảnh PNG làm schematic.

## Phạm vi bản vẽ

- USB cấp vào bo ESP32 DevKit; đầu ra 3V3 trên bo cấp các khối còn lại.
- GPIO21/22 nối SDA/SCL, AD0 xuống GND để chọn địa chỉ 0x68.
- Nút GPIO18 xuống GND; firmware phải dùng INPUT_PULLUP và debounce.
- GPIO23 qua R3 330 ohm và LED đỏ xuống GND.
- GPIO19 qua R1 1k điều khiển Q1 NPN; R2 10k kéo base xuống emitter. Còi piezo thụ động 3,3 V, dòng tối đa 20 mA theo phạm vi thiết kế này.
- R4/R5 4,7k là tùy chọn; không lắp nếu module đã có pull-up I2C phù hợp lên 3,3 V. C1 100nF đặt gần nguồn IMU nếu cần theo module thực tế.
- Chưa bao gồm pin, sạc và converter. Xem `../HARDWARE_BOM.md` để chọn phần nguồn giai đoạn sau.

U1/U2 là ký hiệu chức năng của module; số chân GPIO của U1 không phải thứ tự chân header vật lý. Chân B/C/E của Q1 và A/K của D1 cũng là định danh chức năng. Kiểm tra đúng sơ đồ module, mức nguồn 3,3 V và pinout linh kiện mua về trước khi đấu nối.

Footprint chưa gán. Đây là sơ đồ phục vụ lắp thử, chưa phải PCB sẵn sàng sản xuất. Kiểm tra net tĩnh không thay thế ERC với thư viện/footprint chính xác hoặc phép đo mạch thật.

Chạy lại kiểm tra từ thư mục gốc repo:

```powershell
python docs/hardware/validate_schematic.py
```
