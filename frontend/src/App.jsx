// [SP1-FE-01 & SP1-FE-02] Phụ trách: Đỗ Hải Đăng
// Giao diện chính Dashboard phong cách Dark Mode (Neon Cyan & Red Alert)
import { Activity, BellRing, Cloud, LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';
import AlertHistoryTable from './components/AlertHistoryTable.jsx';
import DeviceCard from './components/DeviceCard.jsx';
import TelemetryChartCard from './components/TelemetryChartCard.jsx';
import './styles.css';

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div><strong>Fall-Guard</strong><span>WRISTBAND</span></div>
        </div>
        <nav>
          <a className="nav-item active" href="#dashboard"><LayoutDashboard size={19} /> Tổng quan</a>
          <a className="nav-item" href="#device"><Activity size={19} /> Thiết bị</a>
          <a className="nav-item" href="#alerts"><BellRing size={19} /> Cảnh báo <b>2</b></a>
          <a className="nav-item" href="#settings"><Settings size={19} /> Cài đặt</a>
        </nav>
        <div className="sidebar-footer"><span className="live-dot" /> Hệ thống hoạt động</div>
      </aside>

      <main className="dashboard" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">NHÓM 4 · GEHIHI</p>
            <h1>Trung tâm giám sát</h1>
            <p className="subtitle">Theo dõi an toàn cho vòng tay Smart Fall-Guard.</p>
          </div>
          <div className="cloud-status"><Cloud size={18} /><span className="live-dot" /> Cloud đã kết nối</div>
        </header>

        <section className="stats-grid" aria-label="Thông tin nhanh">
          <div className="stat-card"><span>THIẾT BỊ ĐANG KẾT NỐI</span><strong>01</strong><small><i /> Trực tuyến</small></div>
          <div className="stat-card"><span>CẢNH BÁO HÔM NAY</span><strong>02</strong><small className="warning"><i /> Cần theo dõi</small></div>
          <div className="stat-card"><span>ĐỘ TRỄ HỆ THỐNG</span><strong>-- <em>ms</em></strong><small>Chờ dữ liệu cảm biến</small></div>
        </section>

        <section className="content-grid">
          <DeviceCard />
          <TelemetryChartCard />
        </section>
        <AlertHistoryTable />
      </main>
    </div>
  );
}
