import { connectDb } from '../config/db';

export async function initDb(): Promise<void> {
  await connectDb();
}
