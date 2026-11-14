/** Kết quả đăng ký Web Push (chỉ dùng trên nền tảng web). */
export interface WebPushRegistrationResult {
  token: string | null;
  platform: 'web';
  /** Thông báo thân thiện để giao diện hiển thị khi chưa bật được. */
  message?: string;
}

export interface WebPushOptions {
  /**
   * Có xin quyền thông báo hay không. Chỉ nên bật khi người dùng bấm nút
   * (trình duyệt yêu cầu user gesture); tự đăng ký sau đăng nhập chỉ nên
   * dùng token đã có quyền trước đó.
   */
  requestPermission?: boolean;
}
