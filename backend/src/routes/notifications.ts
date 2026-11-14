import { Router, Request, Response, NextFunction } from 'express';
import { NotificationHistory } from '../models/NotificationHistory';
import { NotificationLog } from '../models/NotificationLog';
import { DoseOccurrence } from '../models/DoseOccurrence';
import { Medication } from '../models/Medication';
import { ok } from '../middlewares/errorHandler';
import { currentUserId, currentTimezone, requireAuthMiddleware } from '../middlewares/auth';

const router = Router();
router.use(requireAuthMiddleware);

interface NotificationItem {
  id: string;
  doseId: string | null;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sentAt: string;
  status: 'sent' | 'failed' | 'expired';
  error: string | null;
}

function historyToJson(item: any): NotificationItem {
  return {
    id: String(item._id),
    doseId: item.dose_id ? String(item.dose_id) : null,
    kind: item.kind,
    title: item.title,
    body: item.body,
    data: item.data ?? null,
    sentAt: item.sent_at.toISOString(),
    status: item.status ?? 'sent',
    error: item.error ?? null,
  };
}

function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Tái tạo nội dung cho các `NotificationLog` cũ (trước khi có NotificationHistory),
 * để tab "Thông báo" vẫn có dữ liệu lịch sử.
 */
function legacyToJson(
  log: any,
  dose: any,
  medication: any,
  timezone: string,
): NotificationItem | null {
  const name = medication?.name ?? 'Thuốc';
  const time = dose?.scheduled_at ? formatTime(dose.scheduled_at, timezone) : '';
  const dosage = medication?.dosage_text ? ` — ${medication.dosage_text}` : '';
  const instructions = medication?.instructions ? ` (${medication.instructions})` : '';

  let title = 'Thông báo';
  let body = '';
  switch (log.kind) {
    case 'scheduled_reminder':
      title = 'Đến giờ uống thuốc';
      body = `${name}${time ? ` — ${time}` : ''}${dosage}${instructions}`;
      break;
    case 'overdue':
      title = 'Quá giờ uống thuốc';
      body = `Bạn chưa xác nhận đã uống ${name}.`;
      break;
    case 'snooze':
      title = 'Nhắc lại: uống thuốc';
      body = `Đến giờ uống lại ${name}.`;
      break;
    case 'wellness_check':
      title = 'Hỏi thăm sức khỏe';
      body = `Bạn cảm thấy thế nào sau khi uống ${name}? Hãy theo dõi sức khỏe và báo cho người thân nếu thấy bất thường.`;
      break;
    default:
      // relative_alert thuộc về người thân, không phải lịch sử của chủ hồ sơ.
      return null;
  }

  return {
    id: String(log._id),
    doseId: log.dose_id ? String(log.dose_id) : null,
    kind: log.kind,
    title,
    body,
    data: log.dose_id ? { type: log.kind, doseId: String(log.dose_id) } : null,
    sentAt: log.sent_at.toISOString(),
    status: log.status === 'sent' ? 'sent' : log.status === 'expired' ? 'expired' : 'failed',
    error: log.error ?? null,
  };
}

/**
 * GET /notifications — lịch sử push của chính người dùng.
 * Kết hợp bảng lịch sử mới và `notification_logs` cũ (tái tạo nội dung) để
 * không bị trống với dữ liệu phát sinh trước khi nâng cấp.
 * Query: `page`, `pageSize`.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const timezone = currentTimezone(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));

    const historyRows = await NotificationHistory.find({ user_id: userId }).sort({ sent_at: -1 });
    const historyItems = historyRows.map(historyToJson);
    const historyKeys = new Set(historyItems.map((item) => `${item.doseId ?? 'null'}:${item.kind}`));

    const doses = await DoseOccurrence.find({ user_id: userId })
      .select('_id medication_id scheduled_at')
      .lean();
    const doseById = new Map(doses.map((d: any) => [String(d._id), d]));
    const doseIds = doses.map((d: any) => d._id);
    const medicationIds = Array.from(new Set(doses.map((d: any) => String(d.medication_id)).filter(Boolean)));
    const medications = await Medication.find({ _id: { $in: medicationIds } })
      .select('_id name dosage_text instructions')
      .lean();
    const medicationById = new Map(medications.map((m: any) => [String(m._id), m]));

    const logs = doseIds.length
      ? await NotificationLog.find({
          dose_id: { $in: doseIds },
          kind: { $in: ['scheduled_reminder', 'overdue', 'snooze', 'wellness_check'] },
        })
          .sort({ sent_at: -1 })
          .limit(500)
          .lean()
      : [];

    const legacyItems: NotificationItem[] = [];
    const seenLegacyKeys = new Set<string>();
    for (const log of logs as any[]) {
      const dose = doseById.get(String(log.dose_id));
      if (!dose) continue;
      const key = `${String(log.dose_id)}:${log.kind}`;
      if (historyKeys.has(key) || seenLegacyKeys.has(key)) continue;
      seenLegacyKeys.add(key);
      const item = legacyToJson(log, dose, medicationById.get(String(dose.medication_id)), timezone);
      if (item) legacyItems.push(item);
    }

    const merged = [...historyItems, ...legacyItems].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
    const total = merged.length;
    const items = merged.slice((page - 1) * pageSize, page * pageSize);

    ok(res, { items, page, pageSize, total });
  } catch (e) {
    next(e);
  }
});

export { router as notificationsRouter };
