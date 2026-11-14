import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { DoseOccurrence, DoseOccurrenceDoc } from '../models/DoseOccurrence';
import { Medication } from '../models/Medication';
import { ok } from '../middlewares/errorHandler';
import { currentTimezone, currentUserId, requireAuthMiddleware } from '../middlewares/auth';
import { resolveOwnerAccess } from '../middlewares/familyAccess';
import { badRequest, notFound } from '../utils/errors';
import { confirmDose, snoozeDose, cannotTakeDose, generateUpcomingDoses } from '../services/doseService';
import { notifyRelativeAlert, firebasePushSender } from '../services/notificationService';
import { endOfLocalDayUtc, localYmd, startOfLocalDayUtc, todayLocal } from '../utils/time';
import { env } from '../config/env';

const router = Router();
router.use(requireAuthMiddleware);

function isValidYmdString(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function doseToJson(d: DoseOccurrenceDoc) {
  return {
    id: d._id,
    scheduleId: d.schedule_id,
    medicationId: d.medication_id,
    scheduledAt: d.scheduled_at.toISOString(),
    status: d.status,
    confirmedAt: d.confirmed_at ? d.confirmed_at.toISOString() : null,
    isLateConfirmation: d.is_late_confirmation,
    cannotTakeReason: d.cannot_take_reason,
    snoozedUntil: d.snoozed_until ? d.snoozed_until.toISOString() : null,
    snoozeCount: d.snooze_count,
  };
}

async function fetchDosesWithMedication(userId: string, from: Date, to: Date) {
  const doses = await DoseOccurrence.find({
    user_id: userId,
    scheduled_at: { $gte: from, $lte: to },
  }).sort({ scheduled_at: 1 });

  const medIds = [...new Set(doses.map((d) => d.medication_id.toString()))];
  const meds = await Medication.find({ _id: { $in: medIds } });
  const medMap = new Map(meds.map((m) => [m._id.toString(), m]));

  return doses.map((d) => {
    const med = medMap.get(d.medication_id.toString());
    return {
      ...doseToJson(d),
      medicationName: med?.name ?? null,
      imageUrl: med?.image_url ?? null,
      dosageText: med?.dosage_text ?? null,
      instructions: med?.instructions ?? null,
    };
  });
}

router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access = await resolveOwnerAccess(req);
    const tz = access.timezone;
    const ymd = todayLocal(tz);
    await generateUpcomingDoses(env.DOSE_GENERATION_DAYS, tz, undefined, access.ownerId);

    const doses = await fetchDosesWithMedication(
      access.ownerId,
      startOfLocalDayUtc(tz, ymd),
      endOfLocalDayUtc(tz, ymd),
    );

    const confirmed = doses.filter((d) => d.status === 'confirmed').length;
    const remaining = doses.filter((d) => !['confirmed', 'cannot_take', 'missed'].includes(d.status)).length;

    ok(res, {
      date: ymd,
      doses,
      stats: { confirmed, remaining, total: doses.length },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access = await resolveOwnerAccess(req);
    const tz = access.timezone;
    const ymd = req.query.date ? String(req.query.date) : todayLocal(tz);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw badRequest('date phải dạng YYYY-MM-DD');

    const doses = await fetchDosesWithMedication(
      access.ownerId,
      startOfLocalDayUtc(tz, ymd),
      endOfLocalDayUtc(tz, ymd),
    );

    ok(res, {
      date: ymd,
      doses: doses.map((d) => ({
        ...d,
        medicationName: d.medicationName,
      })),
    });
  } catch (e) {
    next(e);
  }
});

const confirmSchema = z.object({ clientRequestId: z.string().min(8).max(64) });

router.post('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = confirmSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('clientRequestId là bắt buộc (8–64 ký tự)');
    const dose = await confirmDose(req.params.id, currentUserId(req), parsed.data.clientRequestId, currentTimezone(req));
    ok(res, doseToJson(dose));
  } catch (e) {
    next(e);
  }
});

router.post('/:id/snooze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dose = await snoozeDose(req.params.id, currentUserId(req), currentTimezone(req));
    ok(res, doseToJson(dose));
  } catch (e) {
    next(e);
  }
});

const cannotSchema = z.object({ reason: z.string().min(1).max(500) });

router.post('/:id/cannot-take', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cannotSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Lý do không thể uống là bắt buộc (1–500 ký tự)');
    const dose = await cannotTakeDose(req.params.id, currentUserId(req), parsed.data.reason);
    ok(res, doseToJson(dose));
    // Best-effort: báo người thân có bật cảnh báo (nếu FCM/kết nối khả dụng)
    void notifyRelativeAlert(req.params.id, { sender: firebasePushSender }).catch(() => {});
  } catch (e) {
    next(e);
  }
});

router.get('/range', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access = await resolveOwnerAccess(req);
    const tz = access.timezone;
    const from = String(req.query.from ?? '');
    const to = String(req.query.to ?? '');
    if (!isValidYmdString(from) || !isValidYmdString(to)) {
      throw badRequest('from và to phải là ngày hợp lệ dạng YYYY-MM-DD');
    }
    const fromUtc = startOfLocalDayUtc(tz, from);
    const toUtc = endOfLocalDayUtc(tz, to);
    if (toUtc < fromUtc) throw badRequest('Khoảng ngày không hợp lệ');
    const spanDays = Math.round(
      (Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) -
        Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) /
        86_400_000,
    );
    if (spanDays > 62) throw badRequest('Chỉ hỗ trợ khoảng ngày tối đa 62 ngày');

    // Bảo đảm các lần uống gần nhất đã được sinh (7 ngày tới theo cấu hình).
    await generateUpcomingDoses(env.DOSE_GENERATION_DAYS, tz, undefined, access.ownerId);

    const doses = await DoseOccurrence.find({
      user_id: access.ownerId,
      scheduled_at: { $gte: fromUtc, $lte: toUtc },
    })
      .select('scheduled_at status')
      .sort({ scheduled_at: 1 });

    const map = new Map<
      string,
      { date: string; total: number; confirmed: number; remaining: number; missed: number; cannotTake: number }
    >();
    for (const dose of doses) {
      const date = localYmd(dose.scheduled_at, tz);
      const item =
        map.get(date) ??
        { date, total: 0, confirmed: 0, remaining: 0, missed: 0, cannotTake: 0 };
      item.total += 1;
      if (dose.status === 'confirmed') item.confirmed += 1;
      else if (dose.status === 'missed') item.missed += 1;
      else if (dose.status === 'cannot_take') item.cannotTake += 1;
      else item.remaining += 1;
      map.set(date, item);
    }

    ok(res, { from, to, days: Array.from(map.values()) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw notFound('Không tìm thấy lần uống');
    const dose = await DoseOccurrence.findById(req.params.id);
    if (!dose) throw notFound('Không tìm thấy lần uống');
    // Không có `?ownerId=`: suy ra chủ hồ sơ từ chính lần uống — người thân có `view_schedule`
    // vẫn mở được lần uống của chủ hồ sơ (ví dụ bấm notification relative alert).
    const access = await resolveOwnerAccess(req, { fallbackOwnerId: dose.user_id.toString() });
    if (dose.user_id.toString() !== access.ownerId) throw notFound('Không tìm thấy lần uống');
    const med = await Medication.findById(dose.medication_id);
    ok(res, {
      ...doseToJson(dose),
      medicationName: med?.name ?? null,
      imageUrl: med?.image_url ?? null,
      dosageText: med?.dosage_text ?? null,
      instructions: med?.instructions ?? null,
      /** false khi người xem là người thân → giao diện chỉ xem, không hiện nút hành động */
      canAct: !access.isRelative,
      /** Múi giờ của chủ hồ sơ — dùng để hiển thị đúng giờ cho người thân */
      timezone: access.timezone,
    });
  } catch (e) {
    next(e);
  }
});

export { router as dosesRouter, doseToJson };
