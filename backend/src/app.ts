import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';
import { usersRouter } from './routes/usersRoot';
import { medicationsRouter } from './routes/medications';
import { dosesRouter } from './routes/doses';
import { historyRouter } from './routes/history';
import { familyRouter } from './routes/family';
import { adminRouter } from './routes/adminRoot';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  app.use('/api/v1', authMiddleware);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/medications', medicationsRouter);
  app.use('/api/v1/doses', dosesRouter);
  app.use('/api/v1/history', historyRouter);
  app.use('/api/v1/family', familyRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(errorHandler);
  return app;
}
