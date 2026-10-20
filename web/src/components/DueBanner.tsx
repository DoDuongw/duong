import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { useDueReminder } from '../hooks/useDueReminder';
import { ApiError } from '../services/api';
import { confirmDose, newClientRequestId } from '../services/endpoints';
import { useAuth } from '../store/authContext';
import { formatTime } from '../utils/dateTime';

/**
 * Banner nhắc uống thuốc khi trang đang mở (thay cho notification của SW).
 * "Đã uống" gọi thẳng API; bấm phần nội dung → mở M02 để nhắc lại/không thể uống.
 */
export function DueBanner() {
  const { timezone } = useAuth();
  const navigate = useNavigate();
  const { due, dismiss, reload } = useDueReminder();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!due) return null;

  async function confirm() {
    if (!due) return;
    setBusy(true);
    setError(null);
    try {
      await confirmDose(due.id, newClientRequestId());
      dismiss(due.id);
      reload();
      window.dispatchEvent(new Event('dose:changed'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không xác nhận được — thử lại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        zIndex: 50,
        background: 'var(--c-primary)',
        color: '#fff',
        borderRadius: 16,
        padding: 16,
        boxShadow: 'var(--shadow-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={() => navigate(`/dose/${due.id}`)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          textAlign: 'left',
          cursor: 'pointer',
          padding: 0,
          fontSize: 'calc(19px * var(--font-mult))',
          fontWeight: 700,
        }}
      >
        🔔 Đến giờ uống thuốc
        <span style={{ display: 'block', fontWeight: 500, marginTop: 2 }}>
          {formatTime(due.scheduledAt, timezone)} — {due.medicationName ?? '(thuốc đã xóa)'}
          {due.dosageText ? ` · ${due.dosageText}` : ''}
        </span>
      </button>
      {error && <span style={{ fontWeight: 600 }}>{error}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button block loading={busy} onClick={() => void confirm()}>
          Đã uống
        </Button>
        <Button variant="ghost" block style={{ color: '#fff', borderColor: '#fff' }} onClick={() => dismiss(due.id)}>
          Để sau
        </Button>
      </div>
    </div>
  );
}
