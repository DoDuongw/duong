import cron from 'node-cron';
import { transitionOverdueAndMissed, generateUpcomingDoses } from '../services/doseService';
import { processDueNotifications, firebasePushSender } from '../services/notificationService';
import { env } from '../config/env';

export function startJobs(): void {
  if (!env.ENABLE_CRON) return;

  cron.schedule('* * * * *', () => {
    void transitionOverdueAndMissed().catch((err) => console.error('[cron] transition error', err));
  });

  // Gửi Web Push tới giờ uống / mốc snooze / quá giờ (kênh chính — NOTIFICATION_PLAN §3)
  cron.schedule('* * * * *', () => {
    void processDueNotifications({ sender: firebasePushSender }).catch((err) =>
      console.error('[cron] notification error', err),
    );
  });

  cron.schedule('0 0 * * *', () => {
    void generateUpcomingDoses(env.DOSE_GENERATION_DAYS, env.TZ_DEFAULT).catch((err) =>
      console.error('[cron] generation error', err),
    );
  });
}
