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
import { getDosesByDate } from '../services/endpoints';
import { useOwnerView } from '../hooks/useOwnerView';
import { useAuth } from '../store/authContext';
import type { DoseWithMedication } from '../types';
import { BUOI_LABEL, buoiOfIso, formatDisplayDate, shiftYmd, todayYmd, type Buoi } from '../utils/dateTime';

const BUOIS: Buoi[] = ['sang', 'trua', 'chieu', 'toi'];
const BUOI_ICON: Record<Buoi, string> = { sang: '🌅', trua: '☀️', chieu: '🌤️', toi: '🌙' };

/**
 * M03 — Lịch uống thuốc: xem theo ngày, phân nhóm buổi (INTERFACE_SPEC).
 *
 * `?ownerId=` → người thân xem lịch của chủ hồ sơ (chỉ xem), tính ngày/buổi
 * theo múi giờ **của chủ hồ sơ**. Người thân cũng thấy lịch ngay trong M07,
 * đây là màn xem chi tiết theo từng ngày.
 */
export function M03() {
  const { timezone } = useAuth();
  const navigate = useNavigate();
  const { ownerId, isViewingOther, ownerName, ownerTimezone } = useOwnerView();
  // Khi người thân xem hộ: tính ngày/buổi theo múi giờ của CHỦ hồ sơ, không của mình
  const viewTimezone = ownerTimezone ?? timezone;

  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const date = dateOverride ?? todayYmd(viewTimezone);
  const isToday = date === todayYmd(viewTimezone);

  const { loading, data, error, refetch } = useApi(() => getDosesByDate(date, ownerId), [date, ownerId]);

  const doses = data?.doses ?? [];
  const grouped: Record<Buoi, DoseWithMedication[]> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const dose of doses) {
    grouped[buoiOfIso(dose.scheduledAt, viewTimezone)].push(dose);
  }

  return (
    <>
      <h1>{isViewingOther ? `Lịch uống của ${ownerName}` : 'Lịch uống thuốc'}</h1>

      {isViewingOther && (
        <Notice tone="info" icon="👀">
          Đang xem lịch của {ownerName} — Bạn chỉ xem được, không thay đổi được lịch uống thuốc.
          <Button
            variant="ghost"
            style={{ marginTop: 8, minHeight: 44 }}
            onClick={() => navigate('/family')}
          >
            ← Về danh sách người thân
          </Button>
        </Notice>
      )}

      <Section title="Chọn ngày" icon="📅" description={`Giờ hiển thị theo múi giờ ${viewTimezone}`}>
        <div className="row" style={{ marginBottom: 12 }}>
          <Button variant="secondary" onClick={() => setDateOverride(shiftYmd(date, -1))} aria-label="Ngày trước">
            ← Ngày trước
          </Button>
          <Button variant="ghost" onClick={() => setDateOverride(todayYmd(viewTimezone))} disabled={isToday}>
            Hôm nay
          </Button>
          <Button variant="secondary" onClick={() => setDateOverride(shiftYmd(date, 1))} aria-label="Ngày sau">
            Ngày sau →
          </Button>
        </div>
        <Text strong style={{ marginBottom: 0 }}>
          {formatDisplayDate(date)}
        </Text>
        {!loading && !error && (
          <Text muted size="sm" style={{ marginBottom: 0 }}>
            {doses.length === 0 ? 'Không có lần uống nào' : `${doses.length} lần uống trong ngày`}
          </Text>
        )}
      </Section>

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
            emptyIcon="🗓️"
            message={`Không có lần uống nào ngày ${formatDisplayDate(date)}`}
          />
        </Card>
      ) : (
        BUOIS.map((buoi) =>
          grouped[buoi].length === 0 ? null : (
            <Section key={buoi} title={`${BUOI_ICON[buoi]} ${BUOI_LABEL[buoi]}`} icon={undefined}>
              {grouped[buoi].map((dose) => (
                <DoseRow
                  key={dose.id}
                  dose={dose}
                  timeZone={viewTimezone}
                  onSelect={isViewingOther ? undefined : (d) => navigate(`/dose/${d.id}`)}
                />
              ))}
            </Section>
          ),
        )
      )}
    </>
  );
}
