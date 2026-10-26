# Kế hoạch 50 ca đánh giá — CHƯA CÓ KẾT QUẢ

Người phụ trách: Đỗ Hải Đăng, phối hợp firmware. Dự kiến 25 ca mô phỏng ngã có kiểm soát và 25 ca hoạt động thường ngày. Chỉ bắt đầu khi đã có quy trình thử phù hợp; không thử ngã trên người cao tuổi.

Mô tả vị trí/tay đeo, độ chặt dây, người tham gia, firmware, sensor range, ngưỡng, điều kiện và raw log. Tách dữ liệu hiệu chỉnh ngưỡng khỏi dữ liệu đánh giá.

Phải có các ca ngã khuỵu/ngã chậm không có pha rơi tự do, ngã có tay chống, và các hoạt động vung tay/vỗ tay/nằm nhanh. Rơi thiết bị không đeo là kiểm thử riêng; việc bấm nút hủy không biến báo giả của thuật toán thành true negative.

| ID | Nhãn thực | Kịch bản | Có nghi ngờ ngã tại thiết bị? | Có hủy? | Có cảnh báo từ xa? | Raw log |
|---|---|---|---|---|---|---|
| Điền khi thử | — | — | — | — | — | — |

Tính confusion matrix của thuật toán trước bước người dùng hủy, rồi thống kê riêng hiệu quả hủy và nhận cảnh báo từ xa.

- Recall = TP / (TP + FN).
- Specificity = TN / (TN + FP).
- Tỷ lệ báo giả theo bộ thử = FP / (FP + TN).
- Accuracy = (TP + TN) / tổng ca.
- Bổ sung báo giả/giờ đeo trong sinh hoạt thực; 50 ca nhỏ chưa đại diện mọi người/vị trí.

TP/FN/FP/TN và các tỷ lệ: **chưa có dữ liệu**. Không điền số mẫu giả làm kết quả nghiệm thu.
