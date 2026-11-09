import { Button } from './Button';
import { Text } from './Text';

interface StateViewProps {
  state: 'loading' | 'empty' | 'error';
  /** Thông báo hiển thị (mặc định theo từng trạng thái) */
  message?: string;
  onRetry?: () => void;
  /** Gợi ý hành động tiếp theo khi danh sách rỗng */
  hint?: string;
  /** Icon riêng cho trạng thái rỗng (mặc định 📭) */
  emptyIcon?: string;
}

/**
 * Trạng thái chuẩn theo INTERFACE_SPEC:
 * tải (spinner + text), rỗng (icon + hướng dẫn), lỗi (thông báo + nút thử lại).
 */
export function StateView({ state, message, onRetry, hint, emptyIcon = '📭' }: StateViewProps) {
  if (state === 'loading') {
    return (
      <div
        role="status"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}
      >
        <div className="spinner" aria-hidden="true" />
        <Text muted>Đang tải dữ liệu…</Text>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '28px 0',
          textAlign: 'center',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 36 }}>
          ⚠️
        </span>
        <Text strong>{message ?? 'Không tải được dữ liệu'}</Text>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '28px 0',
        textAlign: 'center',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 36 }}>
        {emptyIcon}
      </span>
      <Text muted>{message ?? 'Chưa có dữ liệu'}</Text>
      {hint && (
        <Text muted size="sm">
          {hint}
        </Text>
      )}
    </div>
  );
}
