import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(uri?: string): Promise<void> {
  const target = uri ?? env.MONGODB_URI;
  await mongoose.connect(target);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
