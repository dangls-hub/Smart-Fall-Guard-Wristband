# KẾ HOẠCH CHI TIẾT SPIRAL 4: THỬ NGHIỆM 50 KỊCH BẢN, ĐO ĐẠC KPIS & HOÀN THIỆN NGHIỆM THU
* **Dự án:** Vòng tay thông minh cảnh báo té ngã (Smart Fall-Guard Wristband)
* **Nhóm thực hiện:** Nhóm 4 – GEHIHI
* **Thời gian thực hiện:** Tuần 4 (Từ ngày 22/11/2026 đến 30/11/2026)
* **Trạng thái:** Kế hoạch thực hiện

> Cập nhật thiết kế 26/10/2026: đây là kế hoạch, chưa có kết quả nghiệm thu. Tham chiếu `docs/ARCHITECTURE_REVIEW.md`, `docs/HARDWARE_BOM.md` và `docs/LATENCY_TEST_PLAN.md`. Chỉ đánh dấu hoàn thành khi có bằng chứng.

---

## 1. MỤC TIÊU CỐT LÕI CỦA SPIRAL 4
1. Thực hiện kiểm thử thực tế toàn diện **50 kịch bản** (25 kịch bản mô phỏng ngã có kiểm soát trên nệm bảo hộ + 25 kịch bản hoạt động sinh hoạt mạnh thường ngày để kiểm tra độ tin cậy và tỷ lệ báo giả).
2. Đo đạc thực nghiệm và đánh giá theo 6 chỉ số kỹ thuật (KPIs):
   * Độ trễ CONFIRMED_FALL → dashboard $\le 2.0$ giây khi online; ghi riêng tổng thời gian từ va chạm gồm bất động 3s và hủy 15s.
   * Độ chính xác phát hiện ngã $\ge 90\%$.
   * Tỷ lệ báo giả $< 10\%$.
   * Tính bền bỉ ngoại tuyến đạt $100\%$ không mất gói tin khi mất Wi-Fi.
   * Thời lượng hoạt động liên tục của Pin đạt $\ge 24$ giờ.
   * Thời gian phát hiện ngắt kết nối (Heartbeat) $\le 15$ giây.
3. Hoàn thiện toàn bộ hồ sơ nghiệm thu môn học: **Báo cáo Bài tập lớn (BTL) hoàn chỉnh (Word + PDF)**, **Bộ Slide thuyết trình PowerPoint**, **Video Demo vận hành thực tế 3–5 phút** và **Kho mã nguồn GitHub chuẩn mực**.

---

## 2. BẢNG 50 KỊCH BẢN KIỂM THỬ THỰC TẾ (TEST MATRIX)

### Nhóm A: 25 Kịch bản Mô phỏng Ngã có Kiểm soát (True Positive Test Cases)
Thực hiện trên nệm bảo hộ xốp dày 20cm tại phòng thể chất/phòng lab:
1. Ngã chúi người về phía trước khi đang bước đi bình thường (5 lần).
2. Trượt chân ngã ngửa ra phía sau khi đang đi trên sàn trơn (5 lần).
3. Hụt chân ngã nghiêng sang mạn sườn trái (3 lần).
4. Hụt chân ngã nghiêng sang mạn sườn phải (3 lần).
5. Đang ngồi trên ghế thì bị choáng ngã rơi xuống sàn (3 lần).
6. Ngã trượt chân ở bậc cầu thang giả định (3 lần).
7. Đang đứng thẳng ngã quỵ hai đầu gối xuống sàn rồi đổ người (3 lần).

### Nhóm B: 25 Kịch bản Hoạt động Sinh hoạt Mạnh Thường ngày (False Positive Test Cases)
Kiểm tra khả năng phân biệt và chống báo giả của thuật toán:
1. Ngồi phịch thật nhanh xuống ghế sofa / ghế đệm (5 lần).
2. Đứng lên và nằm nhanh xuống giường ngủ (5 lần).
3. Vung tay tập thể dục / chạy bộ tại chỗ trong 1 phút (5 lần).
4. Vỗ tay thật mạnh nhiều lần liên tiếp (3 lần).
5. Cúi gập người xuống sàn nhặt đồ rồi đứng phắt dậy (3 lần).
6. Bấm chuông cửa / gõ cửa phòng mạnh tay (2 lần).
7. Vận động cổ tay nhanh rồi giữ yên (2 lần). Thử rơi thiết bị không đeo và nút hủy thành bộ thử riêng.

---

## 3. PHÂN CÔNG NHIỆM VỤ CHI TIẾT THEO THÀNH VIÊN

### 🛠️ 1. Trần Đình Nam – Embedded & Firmware Lead
* **Task ID: SP4-HW-01**
  * **Nhiệm vụ:** Thực hiện kiểm thử phần cứng, đo đạc dòng điện và tối ưu thời lượng Pin.
  * **Các bước thực hiện:**
    1. Mắc đồng hồ đo Ampe kế nối tiếp nguồn pin Li-Po 1S của prototype (chốt dung lượng sau đo dòng) để đo dòng tiêu thụ:
       * Chế độ lấy mẫu và Wi-Fi: đo dòng trung bình, xung đỉnh và sụt áp tại phía pin; chưa có giá trị thực nghiệm.
       * Chế độ tiết kiệm điện: đo với firmware thật, xác minh lấy mẫu 50 Hz vẫn đạt; không lấy dòng deep sleep làm dòng trung bình.
    2. Tính toán lý thuyết và chạy thử nghiệm xả pin thực tế liên tục trong 24h để lập biểu đồ phần trăm pin theo thời gian.
    3. Tinh chỉnh ngưỡng va chạm và thời gian lọc trôi gyro nếu phát hiện báo giả trong 25 ca thử nghiệm sinh hoạt.
  * **File bàn giao:** `docs/BATTERY_BENCHMARK_REPORT.md`, `firmware/SmartFallGuard.ino` (Bản Release v1.0).
  * **Thời gian:** 22/11/2026 – 25/11/2026 (16 giờ làm việc).

* **Task ID: SP4-HW-02**
  * **Nhiệm vụ:** Viết nội dung Chương 1 và Chương 3 trong Báo cáo BTL.
  * **Các bước thực hiện:**
    1. Soạn thảo Chương 1: Giới thiệu đề tài, khảo sát nhu cầu, phân tích ưu nhược điểm phần cứng ESP32 và cảm biến MPU6050.
    2. Soạn thảo Chương 3: Sơ đồ nguyên lý chi tiết, giải thuật toán nhận diện ngã 4 giai đoạn, lưu đồ thuật toán và cơ chế lưu trữ SPIFFS.
  * **File bàn giao:** Chương 1 & Chương 3 trong file Báo cáo Word.
  * **Thời gian:** 26/11/2026 – 28/11/2026 (12 giờ làm việc).

---

### ☁️ 2. Phạm Việt Tiến – IoT Infrastructure Lead
* **Task ID: SP4-INF-01**
  * **Nhiệm vụ:** Kiểm thử tải, đo thời gian ngắt kết nối Heartbeat & Khắc phục sự cố mạng.
  * **Các bước thực hiện:**
    1. Sử dụng công cụ `jmeter` hoặc script giả lập 50 thiết bị kết nối đồng thời vào Mosquitto Broker để đo tải CPU/RAM trên máy chủ.
    2. Thực hiện 10 lần rút nguồn đột ngột thiết bị để bấm giờ xem sau bao nhiêu giây hệ thống phát hiện trạng thái `OFFLINE` (Yêu cầu $\le 15s$).
    3. Thực hiện ngắt router Wi-Fi 5 phút, cho thiết bị phát hiện ngã, sau đó bật lại router để ghi nhận tỷ lệ gửi bù dữ liệu từ SPIFFS lên CSDL (Yêu cầu $100\%$).
  * **File bàn giao:** `docs/INFRA_TEST_REPORT.md`.
  * **Thời gian:** 22/11/2026 – 25/11/2026 (14 giờ làm việc).

* **Task ID: SP4-INF-02**
  * **Nhiệm vụ:** Viết nội dung Chương 2 trong Báo cáo BTL & Quay Video Demo.
  * **Các bước thực hiện:**
    1. Soạn thảo Chương 2: Kiến trúc hệ thống IoT 3 lớp, so sánh công nghệ truyền thông (Wi-Fi vs BLE vs LoRaWAN), cấu trúc Topic và giao thức MQTT qua TLS.
    2. Chuẩn bị kịch bản quay video demo: thiết lập máy quay bắt trọn khoảnh khắc người đeo ngã trên nệm $\rightarrow$ còi trên tay hú $\rightarrow$ đếm ngược $\rightarrow$ màn hình Dashboard hiển thị cảnh báo đỏ và tiếng còi kêu $\rightarrow$ điện thoại nhận tin nhắn Telegram.
  * **File bàn giao:** Chương 2 trong file Báo cáo Word, Video Demo thô.
  * **Thời gian:** 26/11/2026 – 28/11/2026 (14 giờ làm việc).

---

### ⚡ 3. Nguyễn Hữu Chính – Backend Lead
* **Task ID: SP4-BE-01**
  * **Nhiệm vụ:** Đo đạc độ trễ đầu cuối (End-to-End Latency) & Hoàn thiện tài liệu API.
  * **Các bước thực hiện:**
    1. Chèn mã ghi log gắn nhãn thời gian tính bằng mili-giây (Timestamp ms) tại các điểm; xem docs/LATENCY_TEST_PLAN.md:
       * Điểm A0: lúc va chạm; điểm A1: chuyển CONFIRMED_FALL sau thời gian bất động và chờ hủy.
       * Điểm B: Lúc gói tin MQTT đến Backend Server.
       * Điểm C: Lúc Client Web nhận được WebSocket và render ra màn hình.
    2. Đo trên 30 lần kích hoạt để tính toán: A1→C trung bình/p95/tối đa (mục tiêu ≤2000ms); ghi riêng A0→C và sai số đồng bộ đồng hồ. Không trừ uptime ESP32 với timestamp server.
    3. Cập nhật hoàn chỉnh tài liệu Postman Collection và `API_DOCUMENTATION.md`.
  * **File bàn giao:** `docs/LATENCY_TEST_RESULTS.xlsx`, `docs/API_DOCUMENTATION.md`.
  * **Thời gian:** 22/11/2026 – 25/11/2026 (12 giờ làm việc).

* **Task ID: SP4-BE-02**
  * **Nhiệm vụ:** Viết nội dung Chương 4 trong Báo cáo BTL & Tổng hợp file báo cáo chung.
  * **Các bước thực hiện:**
    1. Soạn thảo Chương 4: Thiết kế CSDL chi tiết, mô hình kiến trúc Backend Node.js, luồng Socket.io và cơ chế Webhook.
    2. Ghép nối toàn bộ các chương của 4 thành viên vào một file Word duy nhất, định dạng chuẩn font chữ Time New Roman 13, giãn dòng 1.3, đánh số thứ tự hình vẽ và bảng biểu.
  * **File bàn giao:** Chương 4 & Bản tổng hợp Báo cáo toàn diện `IOT_BTL_Nhom4_GEHIHI.docx`.
  * **Thời gian:** 26/11/2026 – 29/11/2026 (14 giờ làm việc).

---

### 🖥️ 4. Đỗ Hải Đăng – Frontend & UI/UX Lead
* **Task ID: SP4-FE-01**
  * **Nhiệm vụ:** Thu thập và thống kê kết quả 50 ca kiểm thử & Tinh chỉnh giao diện Web cuối cùng.
  * **Các bước thực hiện:**
    1. Ghi nhận nhật ký 50 kịch bản ngã vào bảng tính Excel: Ghi nhãn thực và kết quả thuật toán trước nút hủy, rồi ghi riêng việc hủy/nhận cảnh báo từ xa; tách tập hiệu chỉnh và đánh giá.
    2. Tính toán ma trận nhầm lẫn (Confusion Matrix):
       * Độ nhạy (Sensitivity / Recall) $= \frac{TP}{TP + FN} \times 100\%$.
       * Độ đặc hiệu (Specificity) $= \frac{TN}{TN + FP} \times 100\%$.
       * Độ chính xác tổng thể (Accuracy) $= \frac{TP + TN}{\text{Tổng số ca}} \times 100\%$.
    3. Tối ưu giao diện Web: Kiểm tra hiển thị đầy đủ trên các độ phân giải màn hình, sửa các lỗi CSS nhỏ.
  * **File bàn giao:** `docs/TEST_CASES_50_FALLS.md`, mã nguồn `frontend/` hoàn chỉnh.
  * **Thời gian:** 22/11/2026 – 25/11/2026 (14 giờ làm việc).

* **Task ID: SP4-FE-02**
  * **Nhiệm vụ:** Viết nội dung Chương 5, Chương 6 & Thiết kế Slide thuyết trình PowerPoint.
  * **Các bước thực hiện:**
    1. Soạn thảo Chương 5: Thiết kế giao diện Dashboard, biểu đồ realtime và Virtual Simulator.
    2. Soạn thảo Chương 6: Bảng kết quả thực nghiệm 50 kịch bản, đối soát KPIs, ưu điểm hạn chế và hướng phát triển (AI TinyML, GPS).
    3. Thiết kế bộ Slide bảo vệ đồ án PowerPoint (khoảng 20–25 slides) tông màu hiện đại, hình ảnh trực quan, có sơ đồ động và video lồng ghép.
  * **File bàn giao:** Chương 5 & Chương 6 Word, Slide `IOT_BTL_Slide_Nhom4_GEHIHI.pptx`, Video Demo hoàn thiện `demo_video.mp4`.
  * **Thời gian:** 26/11/2026 – 29/11/2026 (16 giờ làm việc).

---

## 4. BẢNG ĐỐI SOÁT NGHIỆM THU KPIS CUỐI CÙNG

| Chỉ số kỹ thuật | Ngưỡng cam kết | Kết quả kiểm thử thực nghiệm | Kết luận |
|---|:---:|:---:|:---:|
| **Độ trễ sau xác nhận → dashboard** | $\le 2.0$ giây | Chưa đo | Chưa kết luận |
| **Độ chính xác nhận diện ngã** | $\ge 90\%$ | Chưa đo | Chưa kết luận |
| **Tỷ lệ báo giả (False Alarm)** | $< 10\%$ | Chưa đo | Chưa kết luận |
| **Đồng bộ offline trong bộ thử** | 10/10 sự kiện, không trùng, ACK sau commit | Chưa đo | Chưa kết luận |
| **Thời lượng Pin** | $\ge 24$ giờ | Chưa đo | Chưa kết luận |
| **Timeout heartbeat; LWT đo riêng** | Mục tiêu heartbeat $\le 15$ giây | Chưa đo | Chưa kết luận |

---

## 5. DANH MỤC HỒ SƠ NGHIỆM THU BÀN GIAO MÔN HỌC
1. 📄 **Báo cáo toàn văn Bài tập lớn:** `IOT_BTL_Nhom4_GEHIHI.docx` và `IOT_BTL_Nhom4_GEHIHI.pdf` (Dung lượng 40–55 trang).
2. 📊 **Bộ Slide bảo vệ đồ án:** `IOT_BTL_Slide_Nhom4_GEHIHI.pptx` (20–25 slide).
3. 🎥 **Video Demo Vận hành thực tế:** `demo_video.mp4` (Thời lượng 3–5 phút, có thuyết minh).
4. 💻 **Mã nguồn đóng gói hoàn chỉnh (GitHub Repository):**
   * Thư mục `firmware/`: Mã nguồn nạp vi điều khiển ESP32.
   * Thư mục `broker/`: Cấu hình Mosquitto và chứng chỉ TLS.
   * Thư mục `backend/`: Mã nguồn Node.js Express & WebSocket.
   * Thư mục `frontend/`: Mã nguồn React + Vite Dashboard & Virtual Simulator.
   * Thư mục `docs/`: Toàn bộ tài liệu API, sơ đồ mạch, kết quả 50 ca test và biên bản 4 Spiral.
