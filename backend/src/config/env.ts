import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  TZ_DEFAULT: z.string().default('Asia/Ho_Chi_Minh'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/medreminder'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  /** Cách 2: đường dẫn file JSON service account (ưu tiên hơn 3 biến rời) */
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  ENABLE_CRON: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  DOSE_GENERATION_DAYS: z.coerce.number().default(7),
  /** Số phút chưa xác nhận thì báo người thân (NOTIFICATION_PLAN §3.4). */
  RELATIVE_ALERT_AFTER_MINUTES: z.coerce.number().default(15),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
