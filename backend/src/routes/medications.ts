import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Medication, MedicationDoc } from '../models/Medication';
import { MedicationSchedule, ScheduleDoc } from '../models/MedicationSchedule';
import { ScheduleVersion } from '../models/ScheduleVersion';
import { AuditLog } from '../models/AuditLog';
import { ok } from '../middlewares/errorHandler';
import { currentUserId, requireAuthMiddleware } from '../middlewares/auth';
import { resolveOwnerAccess } from '../middlewares/familyAccess';
import { badRequest, conflict, notFound } from '../utils/errors';
import {
  deleteFutureDosesForMedication,
  deleteFutureDosesForSchedule,
  generateUpcomingDoses,
  regenerateScheduleDoses,
} from '../services/doseService';
import { env } from '../config/env';

const router = Router();
router.use(requireAuthMiddleware);

function isValidId(id: string) {
  return Types.ObjectId.isValid(id);
}

function scheduleToJson(s: ScheduleDoc) {
  return {
    id: s._id,
    medicationId: s.medication_id,
    timeOfDay: s.time_of_day,
    recurrenceRule: s.recurrence_rule,
    effectiveFrom: s.effective_from,
    effectiveTo: s.effective_to,
    status: s.status,
    currentVersion: s.current_version,
  };
}

function medToJson(m: MedicationDoc, schedules?: ScheduleDoc[]) {
  return {
    id: m._id,
    name: m.name,
    imageUrl: m.image_url,
    dosageText: m.dosage_text,
    instructions: m.instructions,
    startDate: m.start_date,
    endDate: m.end_date,
    status: m.status,
    schedules: schedules ? schedules.map(scheduleToJson) : undefined,
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access = await resolveOwnerAccess(req);
    const status = req.query.status === 'discontinued' ? 'discontinued' : 'active';
    const meds = await Medication.find({ user_id: access.ownerId, status }).sort({ _id: -1 });
    const ids = meds.map((m) => m._id);
    const schedules = await MedicationSchedule.find({ medication_id: { $in: ids } }).sort({ time_of_day: 1 });
    ok(res, meds.map((m) => medToJson(m, schedules.filter((s) => s.medication_id.toString() === m._id.toString()))));
  } catch (e) {
    next(e);
  }
});

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Giờ phải dạng HH:mm');

const createSchema = z.object({
  name: z.string().min(1).max(200),
  imageUrl: z.string().max(500).optional(),
  dosageText: z.string().max(200).optional(),
  instructions: z.string().max(2000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schedules: z
    .array(
      z.object({
        timeOfDay: timeSchema,
        recurrenceRule: z.string().default('daily'),
      }),
    )
    .min(1),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ?ownerId= khác → cần quyền manage_medication (MVP: false → 403), xem familyAccess
    const access = await resolveOwnerAccess(req, { manage: true });
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
    const d = parsed.data;
    if (d.endDate && d.endDate < d.startDate) throw badRequest('Ngày kết thúc phải sau ngày bắt đầu');

    const med = await Medication.create({
      user_id: access.ownerId,
      name: d.name,
      image_url: d.imageUrl ?? null,
      dosage_text: d.dosageText ?? null,
      instructions: d.instructions ?? null,
      start_date: d.startDate,
      end_date: d.endDate ?? null,
      status: 'active',
      created_by: currentUserId(req),
    });

    const schedules: ScheduleDoc[] = [];
    for (const s of d.schedules) {
      const sch = await MedicationSchedule.create({
        medication_id: med._id,
        user_id: access.ownerId,
        time_of_day: s.timeOfDay.length === 5 ? `${s.timeOfDay}:00` : s.timeOfDay,
        recurrence_rule: s.recurrenceRule ?? 'daily',
        effective_from: d.startDate,
        effective_to: d.endDate ?? null,
        status: 'active',
        current_version: 1,
      });
      await ScheduleVersion.create({
        schedule_id: sch._id,
        version: 1,
        snapshot: sch.toObject() as unknown as Record<string, unknown>,
        changed_by: currentUserId(req),
      });
      schedules.push(sch);
    }

    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'medication',
      entity_id: med._id,
      action: 'create',
      details: null,
    });

    ok(res, medToJson(med, schedules), 201);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidId(req.params.id)) throw notFound('Không tìm thấy thuốc');
    const access = await resolveOwnerAccess(req);
    const med = await Medication.findOne({ _id: req.params.id, user_id: access.ownerId });
    if (!med) throw notFound('Không tìm thấy thuốc');
    const schedules = await MedicationSchedule.find({ medication_id: med._id }).sort({ time_of_day: 1 });
    ok(res, medToJson(med, schedules));
  } catch (e) {
    next(e);
  }
});

const patchSchema = createSchema.partial().extend({
  name: z.string().min(1).max(200).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidId(req.params.id)) throw notFound('Không tìm thấy thuốc');
    const access = await resolveOwnerAccess(req, { manage: true });
    const parsed = patchSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Dữ liệu không hợp lệ');
    const d = parsed.data;
    const updates: Record<string, unknown> = {};
    if (d.name !== undefined) updates.name = d.name;
    if (d.imageUrl !== undefined) updates.image_url = d.imageUrl;
    if (d.dosageText !== undefined) updates.dosage_text = d.dosageText;
    if (d.instructions !== undefined) updates.instructions = d.instructions;
    if (d.startDate !== undefined) updates.start_date = d.startDate;
    if (d.endDate !== undefined) updates.end_date = d.endDate;
    updates.updated_by = currentUserId(req);

    const med = await Medication.findOneAndUpdate(
      { _id: req.params.id, user_id: access.ownerId },
      { $set: updates },
      { new: true },
    );
    if (!med) throw notFound('Không tìm thấy thuốc');

    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'medication',
      entity_id: med._id,
      action: 'update',
      details: null,
    });

    const schedules = await MedicationSchedule.find({ medication_id: med._id }).sort({ time_of_day: 1 });
    ok(res, medToJson(med, schedules));
  } catch (e) {
    next(e);
  }
});

router.post('/:id/discontinue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidId(req.params.id)) throw notFound('Không tìm thấy thuốc');
    const access = await resolveOwnerAccess(req, { manage: true });
    const med = await Medication.findOneAndUpdate(
      { _id: req.params.id, user_id: access.ownerId },
      { $set: { status: 'discontinued', updated_by: currentUserId(req) } },
      { new: true },
    );
    if (!med) throw notFound('Không tìm thấy thuốc');

    await MedicationSchedule.updateMany(
      { medication_id: med._id, status: 'active' },
      { $set: { status: 'archived' } },
    );
    // B15: lần uống tương lai chưa có kết quả bị xóa; quá khứ giữ nguyên
    const removedDoses = await deleteFutureDosesForMedication(med._id.toString(), access.ownerId);
    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'medication',
      entity_id: med._id,
      action: 'discontinue',
      details: { removedFutureDoses: removedDoses },
    });

    ok(res, { id: med._id, status: med.status, removedFutureDoses: removedDoses });
  } catch (e) {
    next(e);
  }
});

const addScheduleSchema = z.object({
  timeOfDay: timeSchema,
  recurrenceRule: z.string().default('daily'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/** Thêm một giờ/lịch uống vào thuốc đã có (M05 — sửa thuốc) */
router.post('/:id/schedules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidId(req.params.id)) throw notFound('Không tìm thấy thuốc');
    const access = await resolveOwnerAccess(req, { manage: true });
    const parsed = addScheduleSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Dữ liệu lịch không hợp lệ');
    const d = parsed.data;

    const med = await Medication.findOne({ _id: req.params.id, user_id: access.ownerId });
    if (!med) throw notFound('Không tìm thấy thuốc');
    if (med.status !== 'active') throw conflict('Thuốc đã ngừng — không thể thêm lịch');

    const effectiveFrom = d.effectiveFrom ?? med.start_date;
    const effectiveTo = d.effectiveTo === undefined ? med.end_date ?? null : d.effectiveTo;
    if (effectiveTo && effectiveTo < effectiveFrom) throw badRequest('Ngày kết thúc phải sau ngày bắt đầu');

    const timeOfDay = d.timeOfDay.length === 5 ? `${d.timeOfDay}:00` : d.timeOfDay;
    const duplicate = await MedicationSchedule.findOne({
      medication_id: med._id,
      status: 'active',
      time_of_day: timeOfDay,
    });
    if (duplicate) throw conflict('Giờ này đã có trong lịch của thuốc');

    const schedule = await MedicationSchedule.create({
      medication_id: med._id,
      user_id: access.ownerId,
      time_of_day: timeOfDay,
      recurrence_rule: d.recurrenceRule ?? 'daily',
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      status: 'active',
      current_version: 1,
    });
    await ScheduleVersion.create({
      schedule_id: schedule._id,
      version: 1,
      snapshot: schedule.toObject() as unknown as Record<string, unknown>,
      changed_by: currentUserId(req),
    });
    await generateUpcomingDoses(env.DOSE_GENERATION_DAYS, access.timezone, schedule._id.toString());
    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'schedule',
      entity_id: schedule._id,
      action: 'create',
      details: { medicationId: med._id },
    });

    ok(res, scheduleToJson(schedule), 201);
  } catch (e) {
    next(e);
  }
});

/** Ngừng một giờ/lịch uống (M05 — sửa thuốc): lịch → archived, xóa lần uống tương lai */
router.delete('/schedules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidId(req.params.id)) throw notFound('Không tìm thấy lịch');
    const access = await resolveOwnerAccess(req, { manage: true });
    const schedule = await MedicationSchedule.findOneAndUpdate(
      { _id: req.params.id, user_id: access.ownerId, status: 'active' },
      { $set: { status: 'archived' } },
      { new: true },
    );
    if (!schedule) throw notFound('Không tìm thấy lịch');
    const removedDoses = await deleteFutureDosesForSchedule(schedule._id.toString(), access.ownerId);
    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'schedule',
      entity_id: schedule._id,
      action: 'archive',
      details: { removedFutureDoses: removedDoses },
    });
    ok(res, { id: schedule._id, status: schedule.status, removedFutureDoses: removedDoses });
  } catch (e) {
    next(e);
  }
});

router.put('/schedules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidId(req.params.id)) throw notFound('Không tìm thấy lịch');
    const access = await resolveOwnerAccess(req, { manage: true });
    const parsed = z
      .object({
        timeOfDay: timeSchema,
        recurrenceRule: z.string().default('daily'),
        effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      })
      .safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Dữ liệu lịch không hợp lệ');

    const existing = await MedicationSchedule.findOne({
      _id: req.params.id,
      user_id: access.ownerId,
    });
    if (!existing) throw notFound('Không tìm thấy lịch');

    const newVersion = existing.current_version + 1;
    const timeOfDay = parsed.data.timeOfDay.length === 5 ? `${parsed.data.timeOfDay}:00` : parsed.data.timeOfDay;
    const schedule = await MedicationSchedule.findOneAndUpdate(
      { _id: req.params.id, user_id: access.ownerId },
      {
        $set: {
          time_of_day: timeOfDay,
          recurrence_rule: parsed.data.recurrenceRule,
          effective_from: parsed.data.effectiveFrom,
          effective_to: parsed.data.effectiveTo ?? null,
          current_version: newVersion,
        },
      },
      { new: true },
    );
    if (!schedule) throw notFound('Không tìm thấy lịch');

    await ScheduleVersion.create({
      schedule_id: schedule._id,
      version: newVersion,
      snapshot: schedule.toObject() as unknown as Record<string, unknown>,
      changed_by: currentUserId(req),
    });
    // B14: sinh lại lần uống tương lai theo giờ/phiên bản mới; lần uống cũ trong quá khứ giữ nguyên
    const regeneratedDoses = await regenerateScheduleDoses(
      schedule._id.toString(),
      access.ownerId,
      access.timezone,
    );
    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'schedule',
      entity_id: schedule._id,
      action: 'update_version',
      details: { version: newVersion, regeneratedDoses },
    });

    ok(res, { ...scheduleToJson(schedule), regeneratedDoses });
  } catch (e) {
    next(e);
  }
});

export { router as medicationsRouter, scheduleToJson, medToJson };
