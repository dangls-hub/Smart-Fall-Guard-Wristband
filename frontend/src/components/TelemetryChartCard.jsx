// [SP1-FE-02] Phụ trách: Đỗ Hải Đăng
// Card bao bọc biểu đồ gia tốc 3 trục
import { Activity } from 'lucide-react';

export default function TelemetryChartCard() {
  return (
    <article className="panel telemetry-card">
      <div className="panel-heading"><div><p className="section-kicker">TELEMETRY</p><h2>Gia tốc thời gian thực</h2></div><span className="waiting-badge">Đang chờ dữ liệu</span></div>
      <div className="chart-placeholder" role="img" aria-label="Vùng hiển thị biểu đồ gia tốc đang chờ dữ liệu">
        <div className="chart-grid" />
        <div className="chart-empty"><Activity size={29} /><strong>Chưa có dữ liệu cảm biến</strong><span>Biểu đồ ax, ay, az và SVM sẽ hiển thị tại đây.</span></div>
        <div className="axis-label y">g</div><div className="axis-label x">Thời gian</div>
      </div>
      <div className="legend"><span><i className="cyan" /> ax</span><span><i className="green" /> ay</span><span><i className="blue" /> az</span><span><i className="yellow" /> SVM</span></div>
    </article>
  );
}
