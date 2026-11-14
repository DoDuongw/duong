import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ok } from '../middlewares/errorHandler';
import { requireAuthMiddleware } from '../middlewares/auth';
import { badRequest } from '../utils/errors';

const router = Router();
router.use(requireAuthMiddleware);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(badRequest('Chỉ hỗ trợ ảnh JPEG, PNG, WEBP hoặc GIF'));
      return;
    }
    cb(null, true);
  },
});

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * POST /api/v1/uploads/medication-image
 * Nhận file ảnh (multipart field `file`) và lưu vào backend/uploads/medication-images.
 * Dùng upload phía máy chủ để không phụ thuộc Firebase Storage/rules của trình duyệt.
 */
router.post('/medication-image', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file || !file.buffer?.length) throw badRequest('Thiếu file ảnh');
    const ext = EXT_BY_MIME[file.mimetype.toLowerCase()];
    if (!ext) throw badRequest('Định dạng ảnh không được hỗ trợ');

    const dir = path.resolve(process.cwd(), 'uploads', 'medication-images');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    const relativePath = `/uploads/medication-images/${filename}`;
    const origin = `${req.protocol}://${req.get('host')}`;
    ok(res, { url: `${origin}${relativePath}`, path: relativePath }, 201);
  } catch (e) {
    next(e);
  }
});

export { router as uploadsRouter };
