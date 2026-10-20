import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from './Button';
import { Text } from './Text';
import { COMMON_CANNOT_TAKE_REASONS } from '../utils/doseStatus';

const OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(16, 32, 46, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 100,
};

const PANEL: CSSProperties = {
  background: 'var(--c-surface)',
  borderRadius: 16,
  padding: 20,
  width: '100%',
  maxWidth: 480,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-2)',
};

/** Hộp thoại dùng chung — đóng bằng Escape hoặc bấm nền (INTERFACE_SPEC: xác nhận hành động quan trọng) */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      style={OVERLAY}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={PANEL}
      >
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Xác nhận hành động quan trọng (lưu lịch, ngừng thuốc, xóa giờ…) */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger,
  loading,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={loading ? undefined : onCancel}>
      <Text>{message}</Text>
      {error && (
        <Text role="alert" style={{ color: 'var(--c-danger)', fontWeight: 600 }}>
          {error}
        </Text>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button variant="ghost" block onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** Lý do phổ biến cho “Không thể uống” (INTERFACE_SPEC điểm 3) */
interface ReasonDialogProps {
  title: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** Hộp thoại nhập lý do — chọn lý do có sẵn hoặc nhập tự do */
export function ReasonDialog({ title, loading, error, onConfirm, onCancel }: ReasonDialogProps) {
  const [selected, setSelected] = useState<string>(COMMON_CANNOT_TAKE_REASONS[0]);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const reason = (useCustom ? custom : selected).trim();

  return (
    <Modal title={title} onClose={loading ? undefined : onCancel}>
      <Text strong>Chọn lý do</Text>
      <div role="radiogroup" aria-label="Lý do có sẵn" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {COMMON_CANNOT_TAKE_REASONS.map((item) => (
          <label
            key={item}
            style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, fontWeight: 500 }}
          >
            <input
              type="radio"
              name="cannot-take-reason"
              checked={!useCustom && selected === item}
              onChange={() => {
                setUseCustom(false);
                setSelected(item);
              }}
            />
            {item}
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, fontWeight: 500 }}>
          <input type="radio" name="cannot-take-reason" checked={useCustom} onChange={() => setUseCustom(true)} />
          Lý do khác
        </label>
      </div>

      {useCustom && (
        <label style={{ display: 'block', marginTop: 8 }}>
          <span style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Nhập lý do</span>
          <textarea
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ví dụ: Bị đau dạ dày sau bữa ăn"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: '2px solid var(--c-border)',
              fontSize: 'calc(18px * var(--font-mult))',
            }}
          />
        </label>
      )}

      {error && (
        <Text role="alert" style={{ color: 'var(--c-danger)', fontWeight: 600, marginTop: 8 }}>
          {error}
        </Text>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button variant="ghost" block onClick={onCancel} disabled={loading}>
          Hủy
        </Button>
        <Button variant="danger" block onClick={() => onConfirm(reason)} disabled={!reason} loading={loading}>
          Xác nhận
        </Button>
      </div>
    </Modal>
  );
}
