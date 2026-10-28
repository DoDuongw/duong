import 'dotenv/config';
import { connectDb, disconnectDb } from '../config/db';
import { getFirebaseUserByEmail } from '../config/firebase';
import { User, UserRole } from '../models/User';
import { normalizePhone, phoneToInternalEmail } from '../utils/profile';

/**
 * Cấp/đổi vai trò tài khoản (dùng khi chưa có admin hoặc để khôi phục quyền).
 *
 *   npm run admin:grant -- ban@example.com
 *   npm run admin:grant -- 0912345678 --role manager
 *   npm run role:set -- ban@example.com --role user
 *
 * Mặc định `--role admin`; nhận `user`, `manager`, `admin`.
 * Email: tra Firebase Auth → uid → bản ghi users.
 * SĐT: tìm trực tiếp users.phone (nếu chưa có, thử email nội bộ <sđt>@med.local).
 */
const ROLES: UserRole[] = ['user', 'manager', 'admin'];

function parseArgs(args: string[]): { input: string; role: UserRole } | null {
  let input = '';
  let role: UserRole = 'admin';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--role') {
      const value = args[i + 1];
      if (!value || !ROLES.includes(value as UserRole)) return null;
      role = value as UserRole;
      i += 1;
    } else if (arg.startsWith('--role=')) {
      const value = arg.slice('--role='.length);
      if (!ROLES.includes(value as UserRole)) return null;
      role = value as UserRole;
    } else if (!input) {
      input = arg;
    }
  }

  return input ? { input, role } : null;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) {
    console.error(
      'Cách dùng: npm run admin:grant -- <email hoặc số điện thoại> [--role user|manager|admin]',
    );
    process.exitCode = 1;
    return;
  }
  const { input, role } = parsed;

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

  if (user.role === 'admin' && role !== 'admin' && !user.disabled_at) {
    const activeAdmins = await User.countDocuments({ role: 'admin', disabled_at: null });
    if (activeAdmins <= 1) {
      console.error('Không thể hạ quyền quản trị viên đang hoạt động cuối cùng.');
      process.exitCode = 1;
      return;
    }
  }

  user.role = role;
  await user.save();
  console.log(
    `Đã đặt vai trò ${role} cho ${user.display_name ?? user.phone ?? user.firebase_uid} (id: ${String(user._id)})`,
  );
}

main()
  .catch((err) => {
    console.error('Không đặt được vai trò:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
