# Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi

Dự án gồm:

- `backend/` — API Node.js + Express + TypeScript + MongoDB.
- `mobile/` — ứng dụng chính: Expo + React Native + TypeScript, chạy Android/iOS và Expo Web.
- `docs/` — tài liệu thiết kế, API, nghiệp vụ và kiểm thử.
- `tools/` — script tạo sơ đồ.
- `word/` — báo cáo và tài liệu Word.

> `web/` (React + Vite) đã được gỡ. Bản web hiện tại là **Expo Web của `mobile/`**, chạy tại `http://localhost:8081`.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Mobile | Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router |
| Web | Expo Web (cùng code `mobile/`), PWA, service worker |
| Auth | Firebase Authentication (Email/Password; SĐT qua email nội bộ `@med.local`) |
| Push native | Expo Push Service + FCM/APNs (hybrid) |
| Push web | Firebase JS SDK + FCM Web Push + VAPID + service worker |
| Backend | Node.js, Express 4, TypeScript, Zod, node-cron |
| Database | MongoDB + Mongoose |
| Test | Jest + Supertest (backend), TypeScript typecheck (mobile) |

## Yêu cầu

- Node.js ≥ 18.
- MongoDB đang chạy (mặc định `mongodb://127.0.0.1:27017/medreminder`).
- Firebase project đã bật Email/Password.
- Android Studio/emulator hoặc thiết bị Android thật nếu test native.
- Với iOS: macOS + Xcode, hoặc EAS Build; push iOS cần tài khoản Apple Developer trả phí và APNs.

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Kiểm tra: `GET http://localhost:3000/health`.

Các lệnh khác:

```bash
npm run lint    # typecheck
npm run build   # build production
npm start       # chạy bản build
```

Cấp quyền quản trị:

```bash
npm run admin:grant -- ban@example.com
npm run admin:grant -- 0912345678 --role manager
npm run role:set -- ban@example.com --role user
```

Biến môi trường quan trọng trong `backend/.env`:

- `MONGODB_URI`
- `FIREBASE_SERVICE_ACCOUNT_PATH` hoặc `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- `RELATIVE_ALERT_AFTER_MINUTES=10`
- `ENABLE_CRON=true`

File service account JSON là bí mật. Không commit file này; `.gitignore` đã chặn các mẫu phổ biến.

## Mobile

```bash
cd mobile
npm install
npx expo start
```

Chạy theo nền tảng:

```bash
npx expo start --android   # emulator/thiết bị Android
npx expo start --ios       # macOS + Xcode
npx expo start --web       # Expo Web tại http://localhost:8081
```

Build web production:

```bash
npx expo export --platform web
```

Build native bằng EAS:

```bash
npx eas build --profile preview --platform android
```

Cấu hình trong `mobile/app.json`:

- `extra.API_BASE_URL` — địa chỉ backend, ví dụ `http://192.168.100.23:3000/api/v1`.
- `extra.FIREBASE_*` — cấu hình Firebase Web.
- `extra.FIREBASE_VAPID_KEY` — VAPID key cho Web Push.
- `plugins` → `expo-build-properties` — cho phép HTTP LAN khi test.
- `extra.eas.projectId` — EAS project.
- `extra.ALLOW_EMULATOR_PUSH` — cho phép emulator nhận push khi test; tắt ở production.

Android cần `mobile/google-services.json`. iOS cần cấu hình APNs trên EAS/Firebase.

### Push notifications

- **Android/iOS native**: ưu tiên Expo Push Token; fallback FCM/APNs qua Firebase Admin.
- **Expo Web**: FCM Web Push qua Firebase JS SDK + `public/sw.js` + VAPID key.
- **Expo Go không nhận remote push trên SDK 58**. Cần development build hoặc EAS preview build.
- **Web Push chỉ hoạt động trong secure context**: `localhost` hoặc HTTPS. HTTP LAN trên điện thoại thật sẽ không đăng ký được.
- **iOS Safari**: cần iOS 16.4+ và thao tác “Thêm vào màn hình chính” (PWA).
- **Emulator Android**: cần `ALLOW_EMULATOR_PUSH=true` và rebuild app.
- Sau khi sửa `app.json`/VAPID, khởi động lại Expo với `npx expo start -c`.

Luồng cảnh báo người thân:

- Chỉ trạng thái `confirmed` mới bỏ qua cảnh báo.
- `cannot_take` gửi ngay kèm lý do.
- `pending`, `snoozed`, `overdue`, `missed` gửi sau 10 phút.
- Cron backend quét mỗi phút.

### Tài khoản test local

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Bệnh nhân | `emulator.patient@med.local` | `Test123456` |
| Người thân | `emulator.relative@med.local` | `Test123456` |

Đây là tài khoản dev local; không dùng cho production.

## Kiểm tra

```bash
cd backend
npm run lint

cd ../mobile
npx tsc --noEmit
npx expo lint
npx expo export --platform web
```

`npx expo lint` hiện còn báo lỗi `react-hooks/set-state-in-effect` ở một số màn hình tải dữ liệu. Đây là cảnh báo quy tắc React mới, không phải lỗi typecheck/build.

## Tài liệu

| File | Nội dung |
|---|---|
| `docs/PROJECT_PLAN.md` | Mục tiêu, phạm vi, quyết định |
| `docs/ARCHITECTURE.md` | Kiến trúc |
| `docs/DATABASE_PLAN.md` | Mô hình dữ liệu |
| `docs/API_SPEC.md` | Đặc tả API |
| `docs/BUSINESS_RULES.md` | Quy tắc nghiệp vụ |
| `docs/NOTIFICATION_PLAN.md` | Kế hoạch thông báo |
| `docs/INTERFACE_SPEC.md` | Đặc tả màn hình |
| `docs/TEST_PLAN.md` | Kịch bản kiểm thử |
| `docs/BUILD_ROADMAP.md` | Lộ trình build |
| `docs/CURRENT_STATE.md` | Hiện trạng dự án |
| `docs/OPEN_QUESTIONS.md` | Câu hỏi cần duyệt |

## Lưu ý

- Không commit `.env`, service account JSON, token hoặc mật khẩu thật.
- LAN HTTP chỉ dùng để test nội bộ. Muốn người thân ở xa dùng Web Push cần deploy HTTPS công khai và cập nhật `API_BASE_URL`.
- Bản APK đang cài trên emulator có thể cũ hơn code hiện tại; rebuild nếu cần test thay đổi native/UI mới.
- `web/` đã được backup trước khi xóa; nếu cần tham khảo, xem `web-backup-20261113-233247.zip` trong `%TEMP%\opencode\`.
