import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'error' | 'warning';

const ICON: Record<Tone, string> = {
  info: 'ℹ️',
  success: '✅',
  error: '⚠️',
  warning: '⏰',
};

interface NoticeProps {
  tone?: Tone;
  /** Ẩn icon khi thông báo đã có nội dung tự giải thích (ví dụ câu xác nhận ngắn) */
  icon?: string | false;
  children: ReactNode;
}

/**
 * Thông báo một dòng (thành công / lỗi / hướng dẫn).
 * `role="alert"` cho lỗi, `role="status"` cho thông tin — giữ đúng hành vi trợ năng cũ.
 */
export function Notice({ tone = 'info', icon, children }: NoticeProps) {
  const shown = icon === false ? null : (icon ?? ICON[tone]);
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {shown && (
        <span aria-hidden="true" style={{ lineHeight: 1.4 }}>
          {shown}
        </span>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
