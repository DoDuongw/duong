/**
 * Nhãn tiếng Việt cho mã lỗi gửi thông báo (notification_logs.error).
 * API quản trị trả nhãn ở `error` và giữ mã gốc ở `errorCode` để tra cứu.
 */
const NOTIFICATION_ERROR_LABEL: Record<string, string> = {
  no_active_device: 'Thiết bị hiện không hoạt động',
  token_invalid: 'Mã nhận thông báo không còn hiệu lực',
  send_failed: 'Gửi thông báo thất bại',
  FIREBASE_NOT_CONFIGURED: 'Chưa cấu hình dịch vụ gửi thông báo',
  'messaging/registration-token-not-registered': 'Thiết bị đã hủy đăng ký nhận thông báo',
  'messaging/invalid-registration-token': 'Mã nhận thông báo không hợp lệ',
  'messaging/invalid-argument': 'Thông tin gửi thông báo không hợp lệ',
  'messaging/authentication-error': 'Dịch vụ thông báo từ chối xác thực',
  'messaging/third-party-auth-error': 'Dịch vụ thông báo gặp lỗi xác thực',
  'messaging/internal-error': 'Dịch vụ thông báo gặp lỗi nội bộ',
  'messaging/server-unavailable': 'Dịch vụ thông báo tạm thời không khả dụng',
  'messaging/message-rate-exceeded': 'Gửi thông báo quá nhanh, vui lòng thử lại',
  'messaging/device-message-rate-exceeded': 'Thiết bị nhận quá nhiều thông báo',
};

export function notificationErrorLabel(error: string | null): string {
  if (!error) return 'Không rõ nguyên nhân';
  const known = NOTIFICATION_ERROR_LABEL[error];
  if (known) return known;
  if (error.startsWith('messaging/')) {
    return 'Dịch vụ thông báo gặp lỗi. Kiểm tra cấu hình gửi thông báo.';
  }
  return 'Gửi thông báo thất bại. Kiểm tra thiết bị và cấu hình gửi thông báo.';
}
