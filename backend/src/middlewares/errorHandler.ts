import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  if (err instanceof Error && err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
    return;
  }
  // JSON gửi lên không đọc được (body-parser) → 400 chứ không phải lỗi máy chủ
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không phải JSON hợp lệ' },
    });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
  });
}

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}
