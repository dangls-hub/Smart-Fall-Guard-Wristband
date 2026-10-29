// [SP1-FE-02] Phụ trách: Đỗ Hải Đăng
// Bảng hiển thị lịch sử các sự kiện cảnh báo té ngã
import { ArrowRight, BellRing } from 'lucide-react';

export default function AlertHistoryTable() {
  return (
    <section className="panel alert-table" id="alerts">
      <div className="panel-heading"><div><p className="section-kicker">NHẬT KÝ</p><h2>Cảnh báo gần đây</h2></div><button className="text-button">Xem tất cả <ArrowRight size={16} /></button></div>
      <div className="empty-alerts"><div className="empty-icon"><BellRing size={22} /></div><div><strong>Chưa có cảnh báo nào</strong><p>Sự kiện phát hiện té ngã sẽ được ghi lại tại đây.</p></div></div>
    </section>
  );
}
