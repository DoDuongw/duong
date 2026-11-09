import { NavLink } from 'react-router-dom';

interface TabItem {
  to: string;
  icon: string;
  label: string;
}

/** 5 màn hình chính (M01, M03, M04, M06, M08) — màn tác vụ không hiện tab */
const TABS: TabItem[] = [
  { to: '/', icon: '🏠', label: 'Trang chủ' },
  { to: '/schedule', icon: '📅', label: 'Lịch uống' },
  { to: '/medications', icon: '💊', label: 'Thuốc' },
  { to: '/history', icon: '🕘', label: 'Lịch sử' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

/**
 * Điều hướng chính: bottom tab trên điện thoại (nút to, có nhãn chữ),
 * nav ngang trên màn hình ≥ 768px (xem index.css).
 */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tabbar__item">
          <span className="tabbar__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
