import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DoseStatusBadge } from '../components/DoseRow';
import { DateField, SelectField } from '../components/Fields';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { StateView } from '../components/StateView';
import { Text } from '../components/Text';
import { useApi } from '../hooks/useApi';
import { getHistory, listMedications } from '../services/endpoints';
import { useAuth } from '../store/authContext';
import type { HistoryItem } from '../types';
import { formatDateTime, shiftYmd, todayYmd } from '../utils/dateTime';

const PAGE_SIZE = 20;

/** Khoảng ngày chọn nhanh — tránh phải bấm nhiều lần trên lịch với người cao tuổi */
const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: '90 ngày', days: 90 },
];

/**
 * M06 — Lịch sử uống thuốc: bộ lọc khoảng ngày + thuốc, phân trang (INTERFACE_SPEC).
 *
 * Bố cục: khối lọc gọn (khoảng ngày chọn nhanh + thuốc) → tóm tắt số lần uống →
 * danh sách thẻ lịch sử → phân trang.
 */
export function M06() {
  const { timezone } = useAuth();
  const [from, setFrom] = useState(() => shiftYmd(todayYmd(timezone), -7));
  const [to, setTo] = useState(() => todayYmd(timezone));
  const [medicationId, setMedicationId] = useState('');
  const [page, setPage] = useState(1);

  const meds = useApi(
    () =>
      Promise.all([listMedications('active'), listMedications('discontinued')]).then(([active, stopped]) => [
        ...active,
        ...stopped,
      ]),
    [],
  );

  const { loading, data, error, refetch } = useApi(
    () => getHistory({ from, to, medicationId: medicationId || undefined, page, pageSize: PAGE_SIZE }),
    [from, to, medicationId, page],
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function changeFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  function applyPreset(days: number) {
    setFrom(shiftYmd(todayYmd(timezone), -(days - 1)));
    setTo(todayYmd(timezone));
    setPage(1);
  }

  const activePreset = RANGE_PRESETS.find((p) => from === shiftYmd(todayYmd(timezone), -(p.days - 1)) && to === todayYmd(timezone));

  return (
    <>
      <h1>Lịch sử uống thuốc</h1>

      <Section title="Bộ lọc" icon="🔎" description="Chọn khoảng thời gian và thuốc muốn xem lại.">
        <div className="row" style={{ marginBottom: 12 }}>
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.days}
              variant={activePreset?.days === preset.days ? 'primary' : 'secondary'}
              onClick={() => applyPreset(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <DateField label="Từ ngày" value={from} onChange={changeFilter(setFrom)} max={to} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <DateField label="Đến ngày" value={to} onChange={changeFilter(setTo)} min={from} />
          </div>
        </div>

        <SelectField
          label="Thuốc"
          value={medicationId}
          onChange={(value) => changeFilter(setMedicationId)(value)}
        >
          <option value="">Tất cả thuốc</option>
          {(meds.data ?? []).map((med) => (
            <option key={med.id} value={med.id}>
              {med.name}
            </option>
          ))}
        </SelectField>
      </Section>

      {loading ? (
        <Card>
          <StateView state="loading" />
        </Card>
      ) : error ? (
        <Card>
          <StateView state="error" message={error} onRetry={refetch} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <StateView
            state="empty"
            emptyIcon="🕘"
            message="Không có dữ liệu trong khoảng này"
            hint="Thử mở rộng khoảng ngày hoặc bỏ lọc thuốc."
          />
        </Card>
      ) : (
        <>
          <Notice tone="info" icon="📊">
            {total} lần uống — trang {page}/{totalPages}
          </Notice>

          {items.map((item) => (
            <HistoryCard key={item.id} item={item} timeZone={timezone} />
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              block
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Trang trước
            </Button>
            <Button
              variant="secondary"
              block
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau →
            </Button>
          </div>
        </>
      )}
    </>
  );
}

function HistoryCard({ item, timeZone }: { item: HistoryItem; timeZone: string }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Text strong size="lg" style={{ marginBottom: 0 }}>
          {item.medicationName ?? '(thuốc đã xóa)'}
        </Text>
        <DoseStatusBadge status={item.status} late={item.isLateConfirmation} />
      </div>
      <Text muted style={{ marginTop: 6, marginBottom: 4 }}>
        Giờ dự kiến: {formatDateTime(item.scheduledAt, timeZone)}
      </Text>
      <Text muted style={{ marginBottom: 4 }}>
        Giờ gửi nhắc: {item.remindedAt ? formatDateTime(item.remindedAt, timeZone) : '—'}
      </Text>
      {item.status === 'confirmed' && (
        <Text>Đã xác nhận: {item.confirmedAt ? formatDateTime(item.confirmedAt, timeZone) : '—'}</Text>
      )}
      {item.status === 'cannot_take' && <Text>Lý do: {item.cannotTakeReason ?? '—'}</Text>}
      {item.status === 'missed' && <Text>Không xác nhận và đã quá hạn.</Text>}
    </Card>
  );
}
