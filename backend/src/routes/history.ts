import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { DoseOccurrence } from '../models/DoseOccurrence';
import { Medication } from '../models/Medication';
import { ok } from '../middlewares/errorHandler';
import { requireAuthMiddleware } from '../middlewares/auth';
import { resolveOwnerAccess } from '../middlewares/familyAccess';
import { badRequest } from '../utils/errors';
import { endOfLocalDayUtc, startOfLocalDayUtc } from '../utils/time';
import { doseToJson } from './doses';

const router = Router();
router.use(requireAuthMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access = await resolveOwnerAccess(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));

    const where: Record<string, unknown> = {
      user_id: access.ownerId,
      status: { $in: ['confirmed', 'cannot_take', 'missed'] },
    };

    const scheduledAt: Record<string, Date> = {};
    const tz = access.timezone;
    if (req.query.from) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from))) throw badRequest('from phải dạng YYYY-MM-DD');
      scheduledAt.$gte = startOfLocalDayUtc(tz, String(req.query.from));
    }
    if (req.query.to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to))) throw badRequest('to phải dạng YYYY-MM-DD');
      scheduledAt.$lte = endOfLocalDayUtc(tz, String(req.query.to));
    }
    if (Object.keys(scheduledAt).length > 0) where.scheduled_at = scheduledAt;

    if (req.query.medicationId) {
      if (!Types.ObjectId.isValid(String(req.query.medicationId))) throw badRequest('medicationId không hợp lệ');
      where.medication_id = req.query.medicationId;
    }

    const total = await DoseOccurrence.countDocuments(where);
    const rows = await DoseOccurrence.find(where)
      .sort({ scheduled_at: -1 })
      .limit(pageSize)
      .skip((page - 1) * pageSize);

    const medIds = [...new Set(rows.map((d) => d.medication_id.toString()))];
    const meds = await Medication.find({ _id: { $in: medIds } });
    const medMap = new Map(meds.map((m) => [m._id.toString(), m]));

    ok(res, {
      items: rows.map((d) => ({
        ...doseToJson(d),
        medicationName: medMap.get(d.medication_id.toString())?.name ?? null,
        remindedAt: d.reminded_at ? d.reminded_at.toISOString() : null,
      })),
      page,
      pageSize,
      total,
    });
  } catch (e) {
    next(e);
  }
});

export { router as historyRouter };
