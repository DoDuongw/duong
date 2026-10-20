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
import { endOfLocalDayUtc, startOfLocalDayUtc, todayLocal } from '../utils/time';
import { env } from '../config/env';

const router = Router();
router.use(requireAuthMiddleware);

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
    await generateUpcomingDoses(env.DOSE_GENERATION_DAYS, tz);

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
