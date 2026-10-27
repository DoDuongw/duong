import 'dotenv/config';
import { connectDb, disconnectDb } from '../config/db';
import { getFirebaseUserByEmail } from '../config/firebase';
import { User } from '../models/User';
import { normalizePhone, phoneToInternalEmail } from '../utils/profile';

/**
 * Cấp quyền quản trị đầu tiên (hoặc khôi phục khi admin cũ mất quyền).
 *
 *   npm run admin:grant -- ban@example.com
 *   npm run admin:grant -- 0912345678
 *
 * Email: tra Firebase Auth → uid → bản ghi users.
 * SĐT: tìm trực tiếp users.phone (nếu chưa có, thử email nội bộ <sđt>@med.local).
 */
async function main(): Promise<void> {
  const input = (process.argv[2] ?? '').trim();
  if (!input) {
    console.error('Cách dùng: npm run admin:grant -- <email hoặc số điện thoại>');
    process.exitCode = 1;
    return;
  }

  await connectDb();

  let user = null;
  if (input.includes('@')) {
    const firebaseUser = await getFirebaseUserByEmail(input.toLowerCase());
    if (firebaseUser) user = await User.findOne({ firebase_uid: firebaseUser.uid });
  } else {
    const phone = normalizePhone(input);
    if (!phone) {
      console.error('Số điện thoại không hợp lệ (ví dụ đúng: 0912345678)');
      process.exitCode = 1;
      return;
    }
    user = await User.findOne({ phone });
    if (!user) {
      const firebaseUser = await getFirebaseUserByEmail(phoneToInternalEmail(phone));
      if (firebaseUser) user = await User.findOne({ firebase_uid: firebaseUser.uid });
    }
  }

  if (!user) {
    console.error('Không tìm thấy người dùng. Hãy đăng nhập vào ứng dụng một lần rồi chạy lại.');
    process.exitCode = 1;
    return;
  }

  user.role = 'admin';
  await user.save();
  console.log(
    `Đã cấp quyền admin cho ${user.display_name ?? user.phone ?? user.firebase_uid} (id: ${String(user._id)})`,
  );
}

main()
  .catch((err) => {
    console.error('Không cấp được quyền admin:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
