import { Router, Request, Response, NextFunction } from 'express';
import { NotificationHistory } from '../models/NotificationHistory';
import { ok } from '../middlewares/errorHandler';
import { currentUserId, requireAuthMiddleware } from '../middlewares/auth';

const router = Router();
router.use(requireAuthMiddleware);

function toJson(item: any) {
  return {
    id: item._id,
    doseId: item.dose_id ?? null,
    kind: item.kind,
    title: item.title,
    body: item.body,
    data: item.data ?? null,
    sentAt: item.sent_at.toISOString(),
  };
}

/**
 * GET /notifications — lịch sử push mà chính người dùng đã nhận.
 * Query: `page`, `pageSize`.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));

    const where = { user_id: userId };
    const total = await NotificationHistory.countDocuments(where);
    const rows = await NotificationHistory.find(where)
      .sort({ sent_at: -1 })
      .limit(pageSize)
      .skip((page - 1) * pageSize);

    ok(res, { items: rows.map(toJson), page, pageSize, total });
  } catch (e) {
    next(e);
  }
});

export { router as notificationsRouter };
