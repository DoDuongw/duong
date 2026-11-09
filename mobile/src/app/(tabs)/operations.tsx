import AdminScreen from "../admin";

/**
 * Tab riêng cho khu vực vận hành (quản lý/quản trị).
 * Không truy cập qua Cài đặt; chỉ hiển thị với vai trò manager/admin.
 */
export default function OperationsTab() {
  return <AdminScreen />;
}
