# Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi

Dự án gồm `backend/` (Node.js + Express + TypeScript + MongoDB) và `web/` (React + Vite + TypeScript, website responsive mobile-first + PWA). Tài liệu thiết kế nằm trong `docs/`.

> **Giai đoạn hiện tại**: PLAN hoàn tất; **Giai đoạn 2 (nền tảng kỹ thuật) đã xong khung** — backend có nghiệp vụ + test, `web/` có điều hướng, 8 màn hình M01–M08, đăng nhập Firebase (chờ credentials). Chưa: dữ liệu thật trên màn hình (GĐ4), Web Push (GĐ5).

## Quyết định đã đổi (19/10/2026)

- **Nền tảng: website responsive (mobile-first) + PWA** — thay ứng dụng di động React Native; `mobile/` đã được gỡ, `web/` (React + Vite + TypeScript) sẽ thay thế. Mở vừa màn hình điện thoại, không cần cài app.
- **Thông báo: Web Push (FCM for Web + Service Worker)** — thay Notifee; **server node-cron là kênh nhắc chính** (trình duyệt không tự nhắc khi tab đã đóng). Cần PWA (manifest + “Thêm vào màn hình chính”) để push chạy trên iOS Safari.
- **Cơ sở dữ liệu: MongoDB + Mongoose** (thay MySQL + Sequelize) — MongoDB 9.0.4 đang chạy trên máy.
- **Đăng nhập: Firebase Email + Mật khẩu** (thay SĐT + OTP SMS) — Firebase **Spark plan** (miễn phí) **không hỗ trợ Phone Auth**, phương án này chỉ chạy được trên Spark.

## Backend

### Yêu cầu

- Node.js ≥ 18 (kiểm chứng trên Node 24)
- MongoDB đang chạy (mặc định `mongodb://127.0.0.1:27017/medreminder`)

### Cài đặt và chạy

```bash
cd backend
npm install
copy .env.example .env      # chỉnh MONGODB_URI và credentials Firebase
npm run dev                 # dev, hoặc: npm run build && npm start
```

Backend nạp `backend/.env` tự động khi khởi động (dotenv) — **sửa `.env` xong phải chạy lại `npm run dev`** mới có hiệu lực.

Kiểm tra: `GET http://localhost:3000/health`

### Kiểm thử

```bash
npm test        # 21 test (mongodb-memory-server: dịch vụ trạng thái + API tích hợp)
npm run lint    # typecheck
```

Ghi chú test: chạy trên mongodb-memory-server (MongoDB trong bộ nhớ) để không phụ thuộc DB thật; nghiệp vụ (máy trạng thái, idempotency, phân quyền) giống hệt môi trường production.

### Firebase (xác thực — Spark plan)

1. Tạo dự án tại https://console.firebase.google.com — **giữ Spark plan** (miễn phí).
2. Authentication → Sign-in method → bật **Email/Password**.
3. Project settings → **Service accounts** → Generate new private key (tải file JSON). Cách dùng — chọn **một** trong hai:

   - **Cách 2 (dễ hơn — khuyến nghị):** thả file JSON vào `D:\duong\backend\` (ví dụ đặt tên `serviceAccountKey.json`), rồi trong `backend/.env` điền:
     ```env
     FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
     ```
     Backend tự đọc `project_id`, `client_email`, `private_key` trong file.
   - **Cách 1:** copy 3 giá trị vào `backend/.env`:
     `project_id` → `FIREBASE_PROJECT_ID`, `client_email` → `FIREBASE_CLIENT_EMAIL`, `private_key` → `FIREBASE_PRIVATE_KEY` (giữ nguyên `\n`, đặt trong ngoặc kép).

4. Web app config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) điền vào `web/.env` — xem mục Web bên dưới.

⚠️ **File service account JSON là mật khẩu**: `.gitignore` đã chặn commit (mẫu `*serviceAccountKey*.json`); đừng đặt trong `src/` hay gửi cho ai.

Backend chỉ dùng Admin SDK để **xác minh ID token**; không cần Web API key ở backend.

Chưa cấu hình Firebase: server vẫn chạy, `/health` hoạt động, mọi endpoint cần đăng nhập trả 401.

## Web (website responsive — Giai đoạn 2: khung xong)

### Yêu cầu

- Node.js ≥ 18
- Trình duyệt hiện đại (Chrome/Edge/Firefox/Safari); **iOS Safari ≥ 16.4** cho Web Push (qua PWA)
- Firebase web app config + VAPID key (dùng chung backend) — chưa có thì app vẫn chạy, chưa đăng nhập được

### Cài đặt và chạy

```bash
cd web
npm install
copy .env.example .env      # VITE_API_BASE_URL, cấu hình Firebase web, VAPID key
npm run dev                 # dev server (Vite) http://localhost:5173 — proxy /api và /health về backend
npm run build && npm run preview
```

Cấu hình Firebase cho web:

1. Firebase Console → Project settings → General → **Your apps** → thêm **Web app** (`</>`) → copy khối `firebaseConfig` → điền 6 biến `VITE_FIREBASE_*` trong `web/.env`.
2. Cloud Messaging → **Web Push certificates** → tạo **VAPID key** → điền `VITE_FIREBASE_VAPID_KEY` (chỉ cần ở Giai đoạn 5).
3. Service Worker `public/sw.js` xử lý push + `notificationclick` mở M02 (tích hợp FCM ở Giai đoạn 5).

Vite nạp `web/.env` tự động — **sửa `.env` xong phải dừng/chạy lại `npm run dev`**.

`VITE_API_BASE_URL` mặc định `http://localhost:3000/api/v1`. Khi test trên điện thoại thật, trỏ về IP LAN của máy (ví dụ `http://192.168.x.x:3000/api/v1`).

### Kiểm thử frontend

```bash
npm run typecheck   # TypeScript strict
npm test            # 28 test Vitest + React Testing Library (api client, validation M05, ngày/giờ/buổi, component trạng thái)
npm run lint        # oxlint
```

### Màn hình và điều hướng

Đúng 8 màn hình M01–M08 trong `src/screens/` + luồng đăng nhập Email/Mật khẩu (`src/screens/Login/`), không thêm màn hình thứ 9.

- **Responsive mobile-first**: bottom tab bar ở viewport điện thoại (nút to, có nhãn chữ) cho 5 màn hình chính (M01, M03, M04, M06, M08); màn tác vụ tập trung (M02, M05, M07, Login) không hiện tab. Màn hình lớn chuyển nav ngang.
- **Cỡ chữ trong M08 áp dụng thật** (component Text nhân fontSize theo preference; nút/ô giữ chiều cao ≥ 56px).
- **Mất mạng**: dải báo đỏ trên đỉnh trang, tự kiểm tra `/health` mỗi 10 giây, tự tải lại khi có mạng; lỗi mạng không bị coi là hết hạn đăng nhập (chỉ 401/403 mới đăng xuất).
- Component dùng chung trong `src/components/` (Button, Card, StateView: đang tải/lỗi/rỗng, DateField, TimeField, TabBar) + hook `src/hooks/useApi.ts`.
- **PWA**: `public/manifest.webmanifest`, Service Worker, hướng dẫn “Thêm vào màn hình chính” trong M08 (bắt buộc để nhận push trên iOS).

## Tài liệu

| File | Nội dung |
|---|---|
| docs/PROJECT_PLAN.md | Mục tiêu, phạm vi, quyết định đã chốt |
| docs/ARCHITECTURE.md | Kiến trúc |
| docs/DATABASE_PLAN.md | Mô hình dữ liệu |
| docs/API_SPEC.md | Đặc tả API |
| docs/BUSINESS_RULES.md | Quy tắc nghiệp vụ |
| docs/NOTIFICATION_PLAN.md | Kế hoạch thông báo (Web Push + Service Worker + PWA — chưa cài ở hiện tại) |
| docs/INTERFACE_SPEC.md | Đặc tả màn hình |
| docs/TEST_PLAN.md | Kịch bản kiểm thử |
| docs/BUILD_ROADMAP.md | Lộ trình BUILD |
| docs/OPEN_QUESTIONS.md | Câu hỏi chờ duyệt |
| docs/CURRENT_STATE.md | Hiện trạng kiểm tra Giai đoạn 0 |

## Giới hạn đã biết

- **Màn hình chưa có dữ liệu thật** — 8 màn hình mới là khung theo INTERFACE_SPEC; nối API ở Giai đoạn 4 (M05 đã có kiểm tra đầu chạy thật).
- **Web Push và Service Worker chưa tích hợp FCM** — Service Worker cơ bản (`web/public/sw.js`) đã có; FCM + VAPID key thuộc Giai đoạn 5.
- **iOS Safari cần PWA**: chỉ nhận push sau khi “Thêm vào màn hình chính” (iOS ≥ 16.4); chưa có thiết bị iOS để kiểm thử (Q2).
- **Firebase Auth Email chưa chạy thật** — cần credentials (service account cho backend + web config + VAPID key cho web); Phone Auth bị loại vì Spark plan.
- **npm audit (web)**: 4 cảnh báo cao đến từ `firebase` → `@grpc/grpc-js` (lỗ hổng Firestore) — **app chỉ dùng Firebase Auth, không bundle Firestore** nên không ảnh hưởng runtime; theo dõi khi nâng firebase.
- **Git không có sẵn trên máy** — quy tắc nhánh/commit của PLAN chưa áp dụng được.
- **`mobile/` đã gỡ** (19/10/2026) theo quyết định chuyển sang website.
