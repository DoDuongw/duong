import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authContext';

/**
 * Lối tắt cố định tới khu vận hành — hiện với tài khoản quản lý và quản trị.
 *
 * Đặt ngoài M08 để không phải vào Cài đặt mới mở được `/admin`;
 * ẩn khi đang ở chính trang vận hành để tránh link trùng.
 */
export function AdminShortcut() {
  const { profile } = useAuth();
  const { pathname } = useLocation();

  const role = profile?.role;
  if ((role !== 'admin' && role !== 'manager') || pathname === '/admin') return null;

  const isAdmin = role === 'admin';
  return (
    <div className="admin-shortcut">
      <div className="admin-shortcut__inner">
        <Link to="/admin" className="admin-shortcut__link">
          <span aria-hidden="true">{isAdmin ? '🛡️' : '📋'}</span>
          {isAdmin ? 'Quản trị hệ thống' : 'Khu vận hành'}
        </Link>
      </div>
    </div>
  );
}
