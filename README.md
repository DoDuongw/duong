# MedReminder — Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi

MedReminder là đồ án tốt nghiệp xây dựng ứng dụng giúp **người cao tuổi tuân thủ đúng lịch uống thuốc**, đồng thời giúp **người thân theo dõi tình trạng uống thuốc từ xa**.

Ứng dụng **không chẩn đoán bệnh, không tư vấn liều lượng và không thay thế bác sĩ**. Hệ thống chỉ lưu, nhắc lại và hiển thị thông tin do người dùng nhập.

## 1. Mục tiêu đề tài

- Nhắc người cao tuổi uống thuốc đúng giờ, giảm tình trạng quên thuốc.
- Ghi nhận trung thực các trạng thái: đã uống, nhắc lại, không thể uống, quá giờ, bỏ lỡ.
- Kết nối người thân để họ xem lịch và nhận cảnh báo khi người cao tuổi chưa xác nhận uống thuốc.
- Hỏi thăm cảm giác sau khi uống thuốc và lưu lại nhật ký sức khỏe cơ bản.
- Cung cấp khu vận hành cho quản lý/quản trị viên để theo dõi hệ thống và quản lý tài khoản.

## 2. Phạm vi

**Trong phạm vi:**

- Ứng dụng Expo/React Native chạy Android, iOS và Expo Web.
- Đăng nhập/đăng ký bằng Firebase Authentication (Email/Mật khẩu).
- Quản lý thuốc, lịch uống và sinh trước 7 ngày các lần uống.
- Nhắc uống thuốc qua push native và Web Push.
- Xác nhận đã uống, nhắc lại (snooze) và báo không thể uống.
- Kết nối người thân bằng mã mời 6 chữ số, phân quyền xem lịch và cảnh báo.
- Hỏi thăm sức khỏe 10 phút sau khi xác nhận uống thuốc.
- Khu vận hành `/admin` cho vai trò `manager` và `admin`.
- Backend Node.js/Express + MongoDB/Mongoose.

**Ngoài phạm vi:**

- Chẩn đoán bệnh, tư vấn điều trị, chỉ định liều lượng hoặc thay thế bác sĩ.
- Quản lý bệnh viện, đơn thuốc điện tử, thanh toán, chat hoặc thiết bị y tế.
- Trí tuệ nhân tạo tư vấn sức khỏe.
- Đặt lại mật khẩu người dùng từ khu vực admin (bị chặn vì lý do bảo mật).
- Màn hình xóa tài khoản tự phục vụ cho người dùng cuối.

## 3. Tính năng chính

### Người cao tuổi / chủ hồ sơ

- Xem trang chủ với tiến độ uống thuốc hôm nay và lần uống sắp tới.
- Xem lịch uống thuốc theo ngày, xem lịch sử các lần uống.
- Thêm/sửa thuốc, liều dùng, hướng dẫn, ảnh thuốc và giờ uống.
- Xác nhận **đã uống**, **nhắc lại sau N phút** hoặc báo **không thể uống** kèm lý do.
- Nhận push nhắc giờ uống, quá giờ, nhắc lại và hỏi thăm sức khỏe.
- Trả lời nhanh tình trạng sau uống: Bình thường, Hơi mệt, Khó chịu, Không khỏe hoặc khác.
- Xem nhật ký sức khỏe và ghi chú thêm.
- Đổi mật khẩu, chỉnh cỡ chữ, cấu hình số phút/số lần nhắc lại và quyền thông báo.
- Tạo mã mời để kết nối người thân; đổi quyền hoặc ngắt kết nối.

### Người thân

- Nhập mã mời 6 chữ số để kết nối với chủ hồ sơ.
- Xem lịch uống thuốc và lịch sử ở chế độ chỉ xem nếu có quyền `view_schedule`.
- Nhận cảnh báo khi chủ hồ sơ chưa xác nhận uống thuốc hoặc báo không thể uống.
- Chủ hồ sơ có thể bật/tắt cảnh báo cho từng kết nối; người thân nhận cảnh báo khi quyền này được bật.

### Quản lý vận hành (`manager`) và quản trị viên (`admin`)

- Xem dashboard tổng quan: người dùng, tài khoản bị khóa, thuốc đang dùng, lần uống, kết nối người thân, thiết bị, lỗi gửi thông báo.
- Tìm kiếm và xem danh sách người dùng.
- Khóa/mở khóa tài khoản người dùng.
- Xem nhật ký thao tác và lỗi gửi thông báo.
- `admin` có thêm quyền đổi vai trò và xóa vĩnh viễn tài khoản `user`.
- Không xem nội dung y tế chi tiết và không đặt lại mật khẩu của người dùng.

## 4. Luồng nghiệp vụ chính

1. **Tạo thuốc và lịch uống**: người dùng nhập thuốc, giờ uống; backend tạo `Medication`, `MedicationSchedule` và phiên bản lịch.
2. **Sinh lần uống**: cron hằng ngày sinh trước 7 ngày các `DoseOccurrence`; khi thêm/sửa lịch cũng sinh lại các lần uống tương lai.
3. **Nhắc uống thuốc**: cron mỗi phút gửi push khi đến giờ, khi quá giờ hoặc khi đến thời điểm nhắc lại.
4. **Xác nhận**: người dùng bấm “Đã uống”; backend kiểm tra quyền, chống gửi trùng và ghi audit log.
5. **Không thể uống**: người dùng nhập lý do; hệ thống gửi cảnh báo ngay cho người thân có bật `relative_alerts`.
6. **Cảnh báo người thân**: nếu chưa xác nhận sau 10 phút (tính từ giờ đến hạn hoặc `snoozed_until`), gửi push cho người thân. Lần uống `missed` có thêm lưới an toàn.
7. **Hỏi thăm sức khỏe**: 10 phút sau khi xác nhận, gửi push hỏi cảm giác; câu trả lời lưu vào `HealthLog`.
8. **Kết nối người thân**: mã mời 6 chữ số, hạn 15 phút, tối đa 5 mã/phút; mã chỉ lưu dưới dạng SHA-256.

Các mốc mặc định:

| Quy tắc | Giá trị |
|---|---|
| Quá giờ | 30 phút |
| Bỏ lỡ | 120 phút |
| Cảnh báo người thân | 10 phút |
| Hỏi thăm sức khỏe | 10 phút sau khi xác nhận |
| Sinh trước lần uống | 7 ngày |
| Nhắc lại mặc định | 10 phút × 3 lần |
| Mã mời | 6 chữ số, hạn 15 phút |

## 5. Kiến trúc và công nghệ

```text
mobile/ (Expo + React Native + Expo Router)
        │
        ├── Firebase Authentication
        ├── Expo Push / FCM / APNs
        └── REST API (Bearer Firebase ID token)
                │
backend/ (Node.js + Express + TypeScript)
        ├── MongoDB + Mongoose
        ├── node-cron
        ├── Firebase Admin SDK
        └── thư mục uploads cục bộ
```

| Thành phần | Công nghệ |
|---|---|
| Mobile | Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router |
| Web | Expo Web dùng chung mã nguồn `mobile/`, PWA + service worker |
| Auth | Firebase Authentication (Email/Password) |
| Push native | Expo Push Service + FCM/APNs |
| Push web | Firebase JS SDK + FCM Web Push + VAPID + `public/sw.js` |
| Backend | Node.js, Express 4, TypeScript, Zod, node-cron |
| Database | MongoDB + Mongoose |
| Kiểm tra | TypeScript typecheck, ESLint, Expo export |

## 6. Cấu trúc repository

```text
backend/   API Express, MongoDB models, services, cron, scripts quản trị
mobile/    Ứng dụng chính: Expo Router, screens, components, services, store
docs/      Tài liệu kiến trúc, nghiệp vụ, API, dữ liệu và sơ đồ
tools/     Script sinh danh mục API và render sơ đồ
word/      Báo cáo và tài liệu Word
```

`mobile/` là ứng dụng chính. Bản web hiện tại là **Expo Web của `mobile/`**, không phải một web app riêng.

## 7. Cài đặt và chạy

### Yêu cầu

- Node.js 20+ (khuyến nghị bản LTS).
- MongoDB đang chạy, mặc định `mongodb://127.0.0.1:27017/medreminder`.
- Firebase project đã bật Email/Password.
- Android Studio/emulator hoặc thiết bị Android nếu test native.
- iOS cần macOS + Xcode hoặc EAS Build; push iOS cần tài khoản Apple Developer và APNs.

### Backend

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

### Mobile / Expo Web

```bash
cd mobile
npm install
npx expo start
```

Chạy theo nền tảng:

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

Expo Web chạy tại `http://localhost:8081`.

Build web production:

```bash
npx expo export --platform web
```

Build native bằng EAS:

```bash
npx eas build --profile preview --platform android
```

## 8. Cấu hình

### Backend (`backend/.env`)

- `MONGODB_URI`
- `FIREBASE_SERVICE_ACCOUNT_PATH` hoặc `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- `RELATIVE_ALERT_AFTER_MINUTES=10`
- `WELLNESS_CHECK_AFTER_MINUTES=10`
- `DOSE_GENERATION_DAYS=7`
- `ENABLE_CRON=true`
- `CORS_ORIGIN`

File service account JSON là bí mật. Không commit file này; `.gitignore` đã chặn các mẫu phổ biến.

### Mobile (`mobile/app.json`)

- `extra.API_BASE_URL` — địa chỉ backend, ví dụ `http://192.168.100.23:3000/api/v1`.
- `extra.FIREBASE_*` — cấu hình Firebase Web.
- `extra.FIREBASE_VAPID_KEY` — VAPID key cho Web Push.
- `plugins` → `expo-build-properties` — cho phép HTTP LAN khi test.
- `extra.eas.projectId` — EAS project.
- `extra.ALLOW_EMULATOR_PUSH` — cho phép emulator nhận push khi test; tắt ở production.

Android cần `mobile/google-services.json`. iOS cần cấu hình APNs trên EAS/Firebase.

## 9. Push notifications

- **Android/iOS native**: ưu tiên Expo Push Token; fallback FCM/APNs qua Firebase Admin.
- **Expo Web**: FCM Web Push qua Firebase JS SDK + `public/sw.js` + VAPID key.
- **Expo Go không nhận remote push trên SDK 58**. Cần development build hoặc EAS preview build.
- **Web Push chỉ hoạt động trong secure context**: `localhost` hoặc HTTPS. HTTP LAN trên điện thoại thật sẽ không đăng ký được.
- **iOS Safari**: cần iOS 16.4+ và thao tác “Thêm vào màn hình chính” (PWA).
- **Emulator Android**: cần `ALLOW_EMULATOR_PUSH=true` và rebuild app.
- Sau khi sửa `app.json`/VAPID, khởi động lại Expo với `npx expo start -c`.

## 10. Tài khoản test local

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Bệnh nhân | `emulator.patient@med.local` | `Test123456` |
| Người thân | `emulator.relative@med.local` | `Test123456` |

Đây là tài khoản dev local; không dùng cho production.

## 11. Kiểm tra chất lượng

```bash
cd backend
npm run lint
npm run build

cd ../mobile
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npx expo export --platform web
```

Backend hiện **không còn bộ test tự động** sau khi tinh gọn dự án. Các thay đổi backend cần được kiểm tra bằng typecheck, build và test tay theo luồng nghiệp vụ.

## 12. Tài liệu và sơ đồ

| File | Nội dung |
|---|---|
| `docs/ARCHITECTURE.md` | Kiến trúc hiện tại và các luồng chính |
| `docs/DATABASE_PLAN.md` | Mô hình dữ liệu MongoDB |
| `docs/API_SPEC.md` | Đặc tả API |
| `docs/BUSINESS_RULES.md` | Quy tắc nghiệp vụ |
| `docs/NOTIFICATION_PLAN.md` | Kế hoạch thông báo |
| `docs/INTERFACE_SPEC.md` | Đặc tả màn hình |
| `docs/diagrams/README.md` | Danh mục sơ đồ PlantUML/Mermaid |
| `docs/OPEN_QUESTIONS.md` | Câu hỏi và quyết định cần duyệt |

Sinh lại danh mục API:

```bash
node tools/diagram-generator/generate.mjs
```

Render sơ đồ (cần Java + PlantUML CLI):

```bash
node tools/diagram-generator/generate.mjs render
```

Một số tài liệu cũ trong `docs/` có thể còn nhắc giai đoạn trước khi chuyển sang Expo. Khi có khác biệt, ưu tiên `README.md`, `docs/ARCHITECTURE.md`, `docs/BUSINESS_RULES.md` và `docs/DATABASE_PLAN.md`.

## 13. Lưu ý bảo mật và giới hạn

- Không commit `.env`, service account JSON, token hoặc mật khẩu thật.
- LAN HTTP chỉ dùng để test nội bộ. Muốn người thân ở xa dùng Web Push cần deploy HTTPS công khai và cập nhật `API_BASE_URL`.
- Push có thể trễ do mạng, quyền thông báo, trình duyệt và chính sách hệ điều hành.
- Bản APK đang cài trên emulator có thể cũ hơn code hiện tại; rebuild nếu cần test thay đổi native/UI mới.
- Ảnh thuốc hiện lưu cục bộ trong `backend/uploads`; production nên chuyển sang object storage.
- Khu vực admin không đọc nội dung y tế chi tiết và không đặt lại mật khẩu người dùng.
