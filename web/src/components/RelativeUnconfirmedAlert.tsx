import type { DoseWithMedication } from '../types';
import { formatDate, formatTime } from '../utils/dateTime';
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL, RELATIVE_ALERT_AFTER_MINUTES, unconfirmedAlerts } from '../utils/doseStatus';

interface RelativeUnconfirmedAlertProps {
  /** Tên chủ hồ sơ để câu cảnh báo đọc tự nhiên */
  ownerName: string;
  /** Múi giờ của chủ hồ sơ */
  timeZone: string;
  /** Danh sách lần uống của ngày đang xem */
  doses: DoseWithMedication[];
  /** Ngày đang xem (yyyy-mm-dd) để phân biệt “hôm nay” với ngày khác */
  date: string;
  /** Ngày hôm nay theo múi giờ chủ hồ sơ */
  today: string;
}

/**
 * Cảnh báo cho **người thân** khi chủ hồ sơ chưa xác nhận uống thuốc quá ngưỡng
 * `RELATIVE_ALERT_AFTER_MINUTES` (mặc định 15 phút).
 *
 * Cần thiết vì nhãn trạng thái “Đang chờ” chỉ đổi sau 30/120 phút, nên ở mốc
 * 15–29 phút giao diện trông y hệt “chưa tới giờ” — người thân không biết là
 * đã có vấn đề. Cùng ngưỡng với push `relative_alert` ở backend.
 */
export function RelativeUnconfirmedAlert({
  ownerName,
  timeZone,
  doses,
  date,
  today,
}: RelativeUnconfirmedAlertProps) {
  const alerts = unconfirmedAlerts(doses);
  if (alerts.length === 0) return null;

  const isToday = date === today;

  return (
    <div className="relative-alert" role="alert">
      <p className="relative-alert__head">
        <span aria-hidden="true">{DOSE_STATUS_ICON.overdue}</span>{' '}
        {isToday
          ? `${ownerName} chưa xác nhận uống thuốc`
          : `Ngày này ${ownerName} đã bỏ lỡ thuốc`}
      </p>
      <ul className="relative-alert__list">
        {alerts.map((dose) => (
          <li key={dose.id}>
            <strong>{formatTime(dose.scheduledAt, timeZone)}</strong>
            {' — '}
            {dose.medicationName ?? '(thuốc đã xóa)'}
            {' · '}
            {DOSE_STATUS_ICON[dose.status]} {DOSE_STATUS_LABEL[dose.status]}
            {!isToday && ` · ${formatDate(dose.scheduledAt, timeZone)}`}
          </li>
        ))}
      </ul>
      <p className="relative-alert__hint">
        {isToday
          ? `Đã quá ${RELATIVE_ALERT_AFTER_MINUTES} phút mà chưa có xác nhận. Bạn nên gọi nhắc ${ownerName}.`
          : 'Những lần uống này đã qua ngày — không thể xác nhận bù.'}
      </p>
    </div>
  );
}
