import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { HealthLog } from '../models/HealthLog';
import { ok } from '../middlewares/errorHandler';
import { currentUserId, currentTimezone, requireAuthMiddleware } from '../middlewares/auth';
import { badRequest, notFound } from '../utils/errors';
import { endOfLocalDayUtc, startOfLocalDayUtc } from '../utils/time';

const router = Router();
router.use(requireAuthMiddleware);

function toJson(log: any) {
  return {
    id: log._id,
    doseId: log.dose_id,
    medicationId: log.medication_id,
    medicationName: log.medication_name,
    kind: log.kind,
    scheduledAt: log.scheduled_at ? log.scheduled_at.toISOString() : null,
    confirmedAt: log.confirmed_at ? log.confirmed_at.toISOString() : null,
    askedAt: log.asked_at.toISOString(),
    question: log.question,
    answer: log.answer,
    answerNote: log.answer_note,
    answeredAt: log.answered_at ? log.answered_at.toISOString() : null,
  };
}

/**
 * GET /health-logs — nhật ký sức khỏe của chính người dùng.
 * Query: `from`, `to` (YYYY-MM-DD theo múi giờ người dùng), `page`, `pageSize`.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const tz = currentTimezone(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));

    const where: Record<string, unknown> = { user_id: userId };
    const askedAt: Record<string, Date> = {};
    if (req.query.from) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from))) throw badRequest('from phải dạng YYYY-MM-DD');
      askedAt.$gte = startOfLocalDayUtc(tz, String(req.query.from));
    }
    if (req.query.to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to))) throw badRequest('to phải dạng YYYY-MM-DD');
      askedAt.$lte = endOfLocalDayUtc(tz, String(req.query.to));
    }
    if (Object.keys(askedAt).length > 0) where.asked_at = askedAt;

    const total = await HealthLog.countDocuments(where);
    const rows = await HealthLog.find(where)
      .sort({ asked_at: -1 })
      .limit(pageSize)
      .skip((page - 1) * pageSize);

    ok(res, { items: rows.map(toJson), page, pageSize, total });
  } catch (e) {
    next(e);
  }
});

const answerSchema = z.object({
  answer: z.enum(['good', 'tired', 'dizzy', 'unwell', 'other']),
  note: z.string().trim().max(500).optional().nullable(),
});

/** PATCH /health-logs/:id — trả lời nhanh cảm giác sau khi uống thuốc. */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    if (!Types.ObjectId.isValid(req.params.id)) throw notFound('Không tìm thấy nhật ký sức khỏe');
    const parsed = answerSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Câu trả lời không hợp lệ');

    const log = await HealthLog.findOne({ _id: req.params.id, user_id: userId });
    if (!log) throw notFound('Không tìm thấy nhật ký sức khỏe');

    log.answer = parsed.data.answer;
    log.answer_note = parsed.data.note ? parsed.data.note.trim() || null : null;
    log.answered_at = new Date();
    await log.save();

    ok(res, toJson(log));
  } catch (e) {
    next(e);
  }
});

export { router as healthLogsRouter };
