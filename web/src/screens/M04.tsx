import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { Segmented } from '../components/Segmented';
import { StateView } from '../components/StateView';
import { Text } from '../components/Text';
import { useApi } from '../hooks/useApi';
import { useOwnerView } from '../hooks/useOwnerView';
import { ApiError } from '../services/api';
import { discontinueMedication, listMedications } from '../services/endpoints';
import type { Medication, MedicationStatus } from '../types';

/**
 * M04 — Danh sách thuốc: tab “Đang dùng” / “Đã ngừng” (INTERFACE_SPEC).
 *
 * `?ownerId=` → người thân xem thuốc của chủ hồ sơ ở chế độ **chỉ xem**
 * (backend trả 403 khi `manage_medication=false`).
 */
export function M04() {
  const [tab, setTab] = useState<MedicationStatus>('active');
  const navigate = useNavigate();
  const { ownerId, isViewingOther, ownerName } = useOwnerView();
  const { loading, data, error, refetch } = useApi(() => listMedications(tab, ownerId), [tab, ownerId]);

  const [confirmTarget, setConfirmTarget] = useState<Medication | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDiscontinue() {
    if (!confirmTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await discontinueMedication(confirmTarget.id);
      setConfirmTarget(null);
      refetch();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Không ngừng được thuốc — thử lại');
    } finally {
      setBusy(false);
    }
  }

  const medications = data ?? [];

  return (
    <>
      <h1>{isViewingOther ? `Thuốc của ${ownerName}` : 'Thuốc của bạn'}</h1>

      {isViewingOther && (
        <Notice tone="info" icon="👀">
          Bạn đang xem thuốc của {ownerName} — chỉ xem, không thêm/sửa/ngừng được.
          <Button variant="ghost" style={{ marginTop: 8, minHeight: 44 }} onClick={() => navigate('/family')}>
            ← Về danh sách người thân
          </Button>
        </Notice>
      )}

      <Segmented
        label="Trạng thái thuốc"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: 'Đang dùng' },
          { value: 'discontinued', label: 'Đã ngừng' },
        ]}
      />

      {loading ? (
        <Card>
          <StateView state="loading" />
        </Card>
      ) : error ? (
        <Card>
          <StateView state="error" message={error} onRetry={refetch} />
        </Card>
      ) : medications.length === 0 ? (
        <Card>
          <StateView
            state="empty"
            emptyIcon="💊"
            message={
              tab === 'active'
                ? isViewingOther
                  ? 'Chưa có thuốc nào đang dùng'
                  : 'Chưa có thuốc nào đang dùng'
                : 'Chưa có thuốc nào đã ngừng'
            }
            hint={tab === 'active' && !isViewingOther ? 'Bấm “Thêm thuốc” để bắt đầu.' : undefined}
          />
        </Card>
      ) : (
        medications.map((med) => {
          const times = (med.schedules ?? []).map((s) => s.timeOfDay.slice(0, 5)).join(' · ');
          const isActive = med.status === 'active';

          return (
            <Section key={med.id} title={med.name} icon={med.imageUrl ? undefined : '💊'}>
              {med.imageUrl && (
                <img
                  src={med.imageUrl}
                  alt=""
                  width={56}
                  height={56}
                  style={{ borderRadius: 12, objectFit: 'cover', float: 'right', marginLeft: 12 }}
                />
              )}
              {med.dosageText && <Text style={{ marginBottom: 4 }}>Liều: {med.dosageText}</Text>}
              <Text muted style={{ marginBottom: 4 }}>
                Giờ uống: {times || '—'}
              </Text>
              <Text muted style={{ marginBottom: 4 }}>
                Từ {med.startDate}
                {med.endDate ? ` đến ${med.endDate}` : ' (không hạn)'}
              </Text>
              {med.instructions && <Text muted>Hướng dẫn: {med.instructions}</Text>}
              {!isActive && <Text muted>Đã ngừng — chỉ xem, không sửa được nữa.</Text>}

              {isActive && !isViewingOther && (
                <div className="row" style={{ marginTop: 12 }}>
                  <Button variant="secondary" onClick={() => navigate(`/medications/${med.id}/edit`)}>
                    Sửa
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setActionError(null);
                      setConfirmTarget(med);
                    }}
                  >
                    Ngừng
                  </Button>
                </div>
              )}
            </Section>
          );
        })
      )}

      {tab === 'active' && !isViewingOther && (
        <Button block style={{ marginTop: 4 }} onClick={() => navigate('/medications/new')}>
          + Thêm thuốc
        </Button>
      )}

      {!isViewingOther && medications.length > 0 && (
        <Text muted size="sm" style={{ marginTop: 12 }}>
          Ngừng thuốc sẽ hủy các lần uống tương lai nhưng giữ nguyên lịch sử đã uống.
        </Text>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Ngừng thuốc"
          message={`Ngừng “${confirmTarget.name}”? Các lần uống sắp tới sẽ bị hủy, lịch sử vẫn giữ nguyên.`}
          confirmLabel="Ngừng thuốc"
          danger
          loading={busy}
          error={actionError}
          onConfirm={() => void handleDiscontinue()}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </>
  );
}
