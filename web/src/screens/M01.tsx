import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DoseRow } from '../components/DoseRow';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { StateView } from '../components/StateView';
import { Text } from '../components/Text';
import { useApi } from '../hooks/useApi';
import { ApiError } from '../services/api';
import { confirmDose, getTodayDoses, newClientRequestId } from '../services/endpoints';
import { useAuth } from '../store/authContext';
import type { DoseWithMedication } from '../types';
import { BUOI_LABEL, buoiOfIso, formatDisplayDate, formatTime, todayYmd, type Buoi } from '../utils/dateTime';
import { nextActionable } from '../utils/doseStatus';

const BUOIS: Buoi[] = ['sang', 'trua', 'chieu', 'toi'];
const BUOI_ICON: Record<Buoi, string> = { sang: '🌅', trua: '☀️', chieu: '🌤️', toi: '🌙' };

/**
 * M01 — Trang chủ: tổng quan hôm nay (INTERFACE_SPEC).
 *
 * Bố cục ưu tiên một việc duy nhất: **liều cần uống ngay** (thẻ nổi bật + nút lớn).
 * Bên dưới mới tới tiến độ trong ngày và danh sách theo buổi.
 */
export function M01() {
  const { user, profile, timezone } = useAuth();
  const navigate = useNavigate();
  const { loading, data, error, refetch } = useApi(() => getTodayDoses(), []);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const doses = data?.doses ?? [];
  const next = nextActionable(doses);
  const grouped: Record<Buoi, DoseWithMedication[]> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const dose of doses) grouped[buoiOfIso(dose.scheduledAt, timezone)].push(dose);

  const displayName = profile?.displayName ?? user?.email.split('@')[0] ?? '';
  const stats = data?.stats ?? { confirmed: 0, remaining: 0, total: 0 };
  const percent = stats.total === 0 ? 0 : Math.round((stats.confirmed / stats.total) * 100);

  async function handleConfirmNext() {
    if (!next) return;
    setBusy(true);
    setActionError(null);
    try {
      await confirmDose(next.id, newClientRequestId());
      window.dispatchEvent(new Event('dose:changed'));
      refetch();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Không xác nhận được — kiểm tra kết nối và thử lại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ---------- Dải chào mừng + tiến độ ---------- */}
      <section className="greeting">
        <p className="greeting__hello">Xin chào{displayName ? `, ${displayName}` : ''} 👋</p>
        <p className="greeting__date">{formatDisplayDate(todayYmd(timezone))}</p>
        {!loading && !error && doses.length > 0 && (
          <div className="greeting__progress">
            <div className="greeting__progress-head">
              <span>Tiến độ hôm nay</span>
              <span>
                {stats.confirmed}/{stats.total} liều
              </span>
            </div>
            <div className="progress" role="img" aria-label={`Đã xác nhận ${stats.confirmed} trên ${stats.total} liều`}>
              <div className="progress__bar" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <Card>
          <StateView state="loading" />
        </Card>
      ) : error ? (
        <Card>
          <StateView state="error" message={error} onRetry={refetch} />
        </Card>
      ) : doses.length === 0 ? (
        <Card>
          <StateView
            state="empty"
            emptyIcon="💊"
            message="Hôm nay chưa có lịch uống thuốc"
            hint="Thêm thuốc và giờ uống để ứng dụng bắt đầu nhắc bạn."
          />
          <Button block onClick={() => navigate('/medications/new')}>
            + Thêm thuốc và giờ uống
          </Button>
        </Card>
      ) : (
        <>
          {/* ---------- Việc cần làm ngay ---------- */}
          {next ? (
            <section className="now-card" aria-labelledby="now-title">
              <span className="now-card__label" id="now-title">
                <span aria-hidden="true">🔔</span> Cần uống bây giờ
              </span>
              <div className="now-card__head">
                <span className="now-card__time">{formatTime(next.scheduledAt, timezone)}</span>
                <div>
                  <div className="now-card__name">{next.medicationName ?? '(thuốc đã xóa)'}</div>
                  {next.dosageText && <div className="now-card__meta">Liều: {next.dosageText}</div>}
                  {next.instructions && <div className="now-card__meta">{next.instructions}</div>}
                </div>
              </div>

              {actionError && (
                <Notice tone="error" icon={false}>
                  {actionError}
                </Notice>
              )}

              <Button block loading={busy} onClick={() => void handleConfirmNext()}>
                Đã uống thuốc
              </Button>
              <Button
                variant="ghost"
                block
                style={{ marginTop: 8 }}
                onClick={() => navigate(`/dose/${next.id}`)}
              >
                Nhắc lại sau / Không thể uống
              </Button>
            </section>
          ) : (
            <Section title="Đã xong hôm nay" icon="🎉">
              <Text muted>Hôm nay bạn đã xử lý xong tất cả các lần uống.</Text>
            </Section>
          )}

          {/* ---------- Tiến độ hôm nay ---------- */}
          <Section title="Tiến độ hôm nay" icon="📊" description={`Hoàn thành ${percent}% số liều hôm nay.`}>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat__value" style={{ color: 'var(--c-success)' }}>
                  {stats.confirmed}
                </span>
                <span className="stat__label">Đã uống</span>
              </div>
              <div className="stat">
                <span className="stat__value" style={{ color: 'var(--c-primary)' }}>
                  {stats.remaining}
                </span>
                <span className="stat__label">Còn lại</span>
              </div>
              <div className="stat">
                <span className="stat__value">{stats.total}</span>
                <span className="stat__label">Tổng liều</span>
              </div>
            </div>
            <Text strong style={{ display: 'block', marginTop: 12, marginBottom: 0 }}>
              Đã xác nhận {stats.confirmed} / còn {stats.remaining} (tổng {stats.total})
            </Text>
          </Section>

          {/* ---------- Danh sách theo buổi ---------- */}
          <Section title="Lịch hôm nay theo buổi" icon="🗓️">
            {BUOIS.map((buoi) => (
              <div className="day-part" key={buoi}>
                <div className="day-part__head">
                  <span aria-hidden="true">{BUOI_ICON[buoi]}</span>
                  <span>{BUOI_LABEL[buoi]}</span>
                  <span className="day-part__count">
                    {grouped[buoi].length > 0 ? `${grouped[buoi].length} lần uống` : '—'}
                  </span>
                </div>
                {grouped[buoi].length === 0 ? (
                  <div className="day-part__empty">Không có lần uống nào</div>
                ) : (
                  grouped[buoi].map((dose) => (
                    <DoseRow key={dose.id} dose={dose} timeZone={timezone} onSelect={(d) => navigate(`/dose/${d.id}`)} />
                  ))
                )}
              </div>
            ))}
          </Section>
        </>
      )}

      {/* ---------- Lối tắt ---------- */}
      <div className="feature-grid" style={{ marginTop: 4 }}>
        <Button variant="secondary" block onClick={() => navigate('/schedule')}>
          📅 Xem lịch uống thuốc
        </Button>
        <Button variant="secondary" block onClick={() => navigate('/family')}>
          👨‍👩‍👧 Người thân
        </Button>
      </div>
    </>
  );
}
