// [SP1-FE-02] Phụ trách: Đỗ Hải Đăng
// Component hiển thị thông tin thiết bị, phần trăm Pin, địa chỉ MAC và trạng thái kết nối
import { BatteryMedium, Bluetooth, Cpu, MapPin, MoreHorizontal, Wifi } from 'lucide-react';

export default function DeviceCard() {
  return (
    <article className="panel device-card" id="device">
      <div className="panel-heading">
        <div><p className="section-kicker">THIẾT BỊ</p><h2>Fall-Guard #001</h2></div>
        <button className="icon-button" aria-label="Tùy chọn thiết bị"><MoreHorizontal size={20} /></button>
      </div>
      <div className="device-hero"><div className="device-orb"><Cpu size={32} /></div><div><strong>Vòng tay thông minh</strong><p><span className="live-dot" /> Đang trực tuyến</p></div></div>
      <div className="device-details">
        <div><BatteryMedium size={19} /><span>Pin<strong>--%</strong></span></div>
        <div><Bluetooth size={19} /><span>MAC<strong>Chưa kết nối</strong></span></div>
        <div><Wifi size={19} /><span>Wi-Fi<strong>Đang chờ</strong></span></div>
        <div><MapPin size={19} /><span>Vị trí<strong>Chưa cấp quyền</strong></span></div>
      </div>
    </article>
  );
}
