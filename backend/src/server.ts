// Nạp biến môi trường từ backend/.env TRƯỚC khi đọc config (phải đứng đầu file)
import 'dotenv/config';
import { createApp } from './app';
import { initDb } from './models';
import { startJobs } from './jobs/scheduler';
import { env } from './config/env';

async function main() {
  await initDb();
  startJobs();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Backend chạy tại http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Không khởi động được server:', err);
  process.exit(1);
});
