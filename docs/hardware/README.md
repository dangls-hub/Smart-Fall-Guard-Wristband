# Sơ đồ phần cứng — Wemos D1 mini ESP8266

Bản đang dùng trong repo là **Rev B cho ESP8266**, cập nhật tại commit `9b75346`. Bo điều khiển là Wemos D1 mini, cảm biến MPU6050; nguồn pin dự kiến gồm Li-Po 1S 300 mAh và TP4056 có bảo vệ. Chạy thử bằng USB trước khi lắp nguồn pin.

Hai chương trình thử I²C/I/O và Wi-Fi đã có mã. Chương trình chính và thuật toán phát hiện ngã chưa hoàn thiện; chưa có kết quả nạp bo, đo pin hoặc thử toàn hệ thống.

## Tệp sử dụng

| Tệp | Nội dung |
|---|---|
| [SmartFallGuard_RevB.json](SmartFallGuard_RevB.json) | Nguồn EasyEDA, gồm hai trang `POWER` và `SIGNAL/IO` |
| [SmartFallGuard_RevB.svg](SmartFallGuard_RevB.svg) | Bản vẽ dùng để xuất PDF/PNG; hiện chỉ thể hiện trang nguồn |
| [hardware_schematic.pdf](../hardware_schematic.pdf) | Bản xuất để xem hoặc in |
| [hardware_schematic.png](../hardware_schematic.png) | Bản xuất dạng ảnh |
| [validate_schematic.py](validate_schematic.py) | Kiểm tra kết nối trong JSON |
| [HARDWARE_BOM.md](../HARDWARE_BOM.md) | Linh kiện và phương án nguồn |
| [Hướng dẫn thử firmware](../../firmware/README.md) | Chọn bo, nạp từng chương trình thử và ghi kết quả |

PDF/PNG hiện chỉ trình bày trang nguồn. Dùng bảng chân dưới đây và trang `SIGNAL/IO` trong JSON để đấu cảm biến, nút, đèn và còi. Không nhập PNG thay cho nguồn schematic.

Nhập JSON vào EasyEDA Standard bằng **File → Open → EasyEDA… → Import File**. File vẫn mang tên Rev B; kiểm tra ký hiệu Wemos D1 mini và bảng chân để phân biệt với bản ESP32 trước đây.

## Bảng đấu nối

| Chức năng | Chân D1 mini | GPIO / cách nối |
|---|---|---|
| MPU6050 SDA | D2 | GPIO4 |
| MPU6050 SCL | D1 | GPIO5 |
| MPU6050 VCC | 3V3 | Kiểm tra breakout hỗ trợ nguồn 3,3 V |
| MPU6050 GND, AD0 | G/GND | GND chung; AD0 xuống GND chọn địa chỉ 0x68 |
| Còi qua mạch điều khiển | D5 | GPIO14 → R1 1 kΩ → base Q1 |
| Nút hủy | D6 | GPIO12 → nút → GND; `INPUT_PULLUP`, nhấn đọc LOW |
| LED ngoài | D7 | GPIO13 → R3 330 Ω → anode LED; cathode xuống GND |
| Đo pin | A0 | Qua R6 100 kΩ; kiểm tra cầu chia áp của đúng bo trước khi nối |

**D1/D2 là nhãn chân trên bo, không phải GPIO1/GPIO2.** Để trống D3/GPIO0, D4/GPIO2 và D8/GPIO15 vì liên quan chế độ khởi động. I²C dùng logic 3,3 V; mọi GND phải nối chung.

R4/R5 4,7 kΩ chỉ lắp nếu breakout chưa có pull-up phù hợp lên 3,3 V. MPU6050 INT/XDA/XCL để hở trong bản đọc polling. Còi trong JSON đi qua transistor NPN Q1, có R2 10 kΩ kéo base xuống emitter; kiểm tra thứ tự B/C/E trước khi lắp.

## Nguồn pin và sạc

Đường nguồn trong JSON Rev B:

```text
USB sạc → TP4056 ↔ Li-Po 1S 300 mAh
           OUT → SW2 → JP1 → chân 5V D1 mini → ổn áp trên bo → 3V3/MPU6050
```

- TP4056 không có power path: tắt SW2 để ngắt tải khi sạc. Chọn dòng sạc theo thông số viên pin; sơ đồ ghi Rprog 4,7 kΩ nhưng phải đối chiếu module thực tế.
- Trước khi cắm USB của D1 mini để nạp/debug, tắt SW2 và mở JP1. Không cấp đồng thời hai nguồn khi chưa kiểm tra mạch cách ly của bo.
- Cấp pin vào chân 5V là phương án đang vẽ, chưa được đo sụt áp hoặc kiểm chứng với regulator của bo thực tế. Có thể reset khi pin giảm áp hoặc Wi-Fi phát.
- BOM có phương án TPS63070 tạo 3,3 V rồi cấp vào chân 3V3; phương án này chưa được vẽ trong JSON. Nếu chọn, cần sửa cả JSON, bản xuất và bộ kiểm tra kết nối.
- Không nối pin 3,7–4,2 V trực tiếp vào 3V3 hoặc A0. Kiểm tra cực pin và giới hạn A0 của đúng bo. Sơ đồ module đang gộp GND; không dùng ký hiệu đó để nối tắt B− với OUT− trên module bảo vệ.

Ước tính 3–3,5 giờ trong BOM chưa phải kết quả đo. Chưa có bằng chứng pin 300 mAh đạt mục tiêu 24 giờ.

## Kiểm tra và xuất bản vẽ

Từ thư mục gốc repo:

```sh
python3 docs/hardware/validate_schematic.py
```

Kết quả mong đợi: **2 trang, 19 ký hiệu, 55 chân, 19 net**. Bộ kiểm tra xác nhận SDA D2, SCL D1, còi D5, nút D6 và LED D7. Kết quả này chỉ đối chiếu kết nối trong JSON; không thay thế đo điện áp, dòng sạc, cách ly nguồn hoặc thử mạch thật.

Nếu đã cài CairoSVG, xuất lại sau khi sửa SVG:

```sh
cairosvg docs/hardware/SmartFallGuard_RevB.svg -o docs/hardware_schematic.pdf
cairosvg docs/hardware/SmartFallGuard_RevB.svg -o docs/hardware_schematic.png
```

SVG không tự sinh từ JSON. Phải đối chiếu hai bản trước khi xuất; lệnh trên chỉ xuất nội dung có trong SVG. Footprint chưa chốt, sơ đồ chưa phải PCB sẵn sàng sản xuất.

## Project EasyEDA đã có

- [Project Rev B trước đây](https://easyeda.com/editor#id=4880326bf38a4158a439c3ab5b8f119b%7C6d03a82dc1ed46f58ef9680876666942).
- [Project USB Rev A trước đây](https://easyeda.com/editor#id=9686a59bfccf45bdb75a2a6bf638552f%7C669a25fdbfe64005ba6351d9ed5ac63a).

Chưa xác nhận project online đã cập nhật theo commit `9b75346`; dùng file trong repo để đối chiếu. Rev A là bản USB, không dùng để đấu nguồn pin. Repo hiện giữ nguồn JSON/SVG Rev A, không có ảnh PNG Rev A.

Tham khảo [LOLIN D1 mini](https://www.wemos.cc/en/latest/d1/d1_mini.html) và [ESP8266 Arduino Core](https://arduino-esp8266.readthedocs.io/en/latest/boards.html). Kiểm tra model, USB-UART, flash và regulator của bo thực tế trước khi áp dụng.
