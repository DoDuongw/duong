import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authContext';

/**
 * Lối tắt cố định tới khu quản trị — chỉ hiện với tài khoản admin.
 *
 * Đặt ngoài M08 để admin không phải vào Cài đặt mới mở được `/admin`;
 * ẩn khi đang ở chính trang quản trị để tránh link trùng.
 */
export function AdminShortcut() {
  const { profile } = useAuth();
  const { pathname } = useLocation();

  if (profile?.role !== 'admin' || pathname === '/admin') return null;

  return (
    <div className="admin-shortcut">
      <div className="admin-shortcut__inner">
        <Link to="/admin" className="admin-shortcut__link">
          <span aria-hidden="true">🛡️</span>
          Quản trị hệ thống
        </Link>
      </div>
    </div>
  );
}
