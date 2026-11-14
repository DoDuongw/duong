import express from 'express';
import cors from 'cors';
import path from 'path';
import { authMiddleware } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';
import usersRouter from './routes/users';
import { medicationsRouter } from './routes/medications';
import { dosesRouter } from './routes/doses';
import { historyRouter } from './routes/history';
import { healthLogsRouter } from './routes/healthLogs';
import { notificationsRouter } from './routes/notifications';
import { uploadsRouter } from './routes/uploads';
import { familyRouter } from './routes/family';
import adminRouter from './routes/admin';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  // Ảnh thuốc do backend lưu cục bộ (không cần Firebase Storage).
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), { maxAge: '7d' }));

  app.use('/api/v1', authMiddleware);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/medications', medicationsRouter);
  app.use('/api/v1/doses', dosesRouter);
  app.use('/api/v1/history', historyRouter);
  app.use('/api/v1/health-logs', healthLogsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/uploads', uploadsRouter);
  app.use('/api/v1/family', familyRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(errorHandler);
  return app;
}
