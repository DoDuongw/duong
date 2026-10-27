# Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi

Dự án gồm `backend/` (Node.js + Express + TypeScript + MongoDB) và `web/` (React + Vite + TypeScript, website responsive mobile-first + PWA). Tài liệu thiết kế nằm trong `docs/`.

> **Giai đoạn hiện tại**: **Giai đoạn 8 (hoàn thiện và bàn giao) đang tiến hành** — Giai đoạn 0–7 đã xong: backend có đủ nghiệp vụ (thuốc, lịch, lần uống, thông báo, người thân) + **API quản trị** + **146 test**; `web/` có 8 màn hình M01–M08 **đã nối API thật**, đăng nhập Firebase thật, Web Push code + cấu hình xong, **khu vực quản trị `/admin`**. Còn lại: 2 kịch bản push cần thiết bị thật (N7 iOS, N12 2 tài khoản), kiểm thử tay quản trị (A8–A14) và bàn giao.

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
npm test        # 146 test (mongodb-memory-server: nghiệp vụ + API tích hợp + hồ sơ SĐT/địa chỉ + quản trị)
npm run lint    # typecheck
```

Ghi chú test: chạy trên mongodb-memory-server (MongoDB trong bộ nhớ) để không phụ thuộc DB thật; nghiệp vụ (máy trạng thái, idempotency, phân quyền) giống hệt môi trường production.

### Quản trị hệ thống (`/admin`)

Khu vực hậu trường **ngoài M01–M08** (không phải màn hình M09). Chỉ tài khoản `users.role='admin'` mới vào được; người dùng thường nhận 403.

- **Cấp admin đầu tiên** (sau khi tài khoản đã đăng nhập ứng dụng ít nhất một lần để có bản ghi trong MongoDB):

  ```bash
  cd backend
  npm run admin:grant -- ban@example.com   # hoặc: npm run admin:grant -- 0912345678
  ```

  Sau đó tải lại web → nút “Quản trị hệ thống” hiện cố định ở đầu trang (không cần vào Cài đặt), hoặc mở thẳng `/admin`.
- **Chức năng**: xem số liệu 24 giờ, tìm/phân trang người dùng, xem lỗi gửi push + nhật ký thao tác, **khóa/mở tài khoản**, **đặt lại mật khẩu**. Không hiển thị tên thuốc/lý do không uống.
- **Khóa tài khoản** có hiệu lực ngay với API (backend kiểm tra `users.disabled_at`) và chặn đăng nhập lại qua Firebase. **Đặt lại mật khẩu** cần Firebase Admin đã cấu hình trong `backend/.env` (dùng cho tài khoản SĐT vì không nhận được email đặt lại).
- **Chưa có xóa tài khoản** — chờ quyết định Q4 về lưu trữ/xóa dữ liệu (`docs/OPEN_QUESTIONS.md`).

### Firebase (xác thực — Spark plan)

**Đăng nhập/đăng ký bằng email hoặc số điện thoại** (tính năng 20/10/2026):

- Ô đăng nhập là **một ô duy nhất**: gõ email thì đăng nhập bằng email, gõ SĐT thì đăng nhập bằng SĐT.
- Firebase Spark plan **không có Phone Auth (OTP SMS)**, nên SĐT được đăng nhập qua **email nội bộ `<sđt>@med.local`** (ví dụ `0912345678@med.local`). Với người dùng thì vẫn là “đăng nhập bằng SĐT”.
- SĐT được **chuẩn hoá** (`+84912345678`, `091 234 5678` → `0912345678`) nên mọi cách gõ đều vào cùng một tài khoản.
- **Đăng ký** có thêm ô SĐT và địa chỉ (không bắt buộc) — lưu vào hồ sơ `users.phone` / `users.address`, sửa lại được ở M08.

1. Tạo dự án tại https://console.firebase.google.com — **giữ Spark plan** (miễn phí).
2. Authentication → Sign-in method → bật **Email/Password**. (Không bật Phone — Spark plan không hỗ trợ; xem mục Đăng nhập bằng SĐT bên dưới.)
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

**Nếu chưa cấu hình Firebase** (dự án mới): server vẫn chạy, `/health` hoạt động, mọi endpoint cần đăng nhập trả 401.

## Web (website responsive — GĐ4–GĐ6: đã nối API thật)

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
2. Cloud Messaging → **Web Push certificates** → tạo **VAPID key** → điền `VITE_FIREBASE_VAPID_KEY` (bắt buộc để nhận thông báo đẩy; dự án hiện tại đã có sẵn).
3. Service Worker `public/sw.js` xử lý push + `notificationclick` mở M02 (đã tích hợp FCM).

Vite nạp `web/.env` tự động — **sửa `.env` xong phải dừng/chạy lại `npm run dev`**.

`VITE_API_BASE_URL` mặc định `http://localhost:3000/api/v1`. Khi test trên điện thoại thật, trỏ về IP LAN của máy (ví dụ `http://192.168.x.x:3000/api/v1`).

### Kiểm thử frontend

```bash
npm run typecheck   # TypeScript strict
npm test            # 164 test Vitest + React Testing Library (api client, validation M05, ngày/giờ/buổi, màn hình M01–M08, quản trị /admin, push/messaging, SĐT/đăng nhập)
npm run lint        # oxlint
```

### Màn hình và điều hướng

Đúng 8 màn hình M01–M08 trong `src/screens/` + luồng đăng nhập Email/Mật khẩu (`src/screens/Login/`), không thêm màn hình thứ 9. **Khu vực quản trị `/admin` là công cụ hậu trường ngoài M01–M08** (không phải M09), chỉ tài khoản `role='admin'` thấy. Admin có **nút “Quản trị hệ thống” cố định ở đầu trang** (không nằm trong M08).

- **Responsive mobile-first**: bottom tab bar ở viewport điện thoại (nút to, có nhãn chữ) cho 5 màn hình chính (M01, M03, M04, M06, M08); màn tác vụ tập trung (M02, M05, M07, Login) và `/admin` không hiện tab. Màn hình lớn chuyển nav ngang.
- **Quản trị**: `/admin` có số liệu 24 giờ, danh sách người dùng (tìm/phân trang, số đếm — không nội dung y tế), lỗi gửi push, nhật ký; khóa/mở tài khoản + đặt lại mật khẩu. Cấp admin bằng `npm run admin:grant` (mục Backend ở trên).
- **Cỡ chữ trong M08 áp dụng thật** (component Text nhân fontSize theo preference; nút/ô giữ chiều cao ≥ 56px).
- **Mất mạng**: dải báo đỏ trên đỉnh trang, tự kiểm tra `/health` mỗi 10 giây, tự tải lại khi có mạng; lỗi mạng không bị coi là hết hạn đăng nhập (chỉ 401/403 mới đăng xuất).
- **Dữ liệu thật**: cả 8 màn hình đã nối API backend — M01 (`/doses/today` + xác nhận nhanh), M02 (`/doses/:id` + đã uống/nhắc lại/không thể uống), M03 (`/doses?date=`), M04 (`/medications` + ngừng thuốc), M05 (tạo/sửa thuốc + quản lý giờ uống), M06 (`/history` lọc + phân trang), M07 (`/family/*` mã mời, quyền xem, ngắt kết nối), M08 (tài khoản, cài đặt nhắc lại, âm thanh/giọng đọc, thông báo người thân).
- **Thông báo**: server node-cron gửi Web Push đúng giờ; trang đang mở hiện banner + âm thanh (`DueBanner`); bấm notification mở M02 đúng lần uống.
- Component dùng chung trong `src/components/` (Button, Card, StateView: đang tải/lỗi/rỗng, DateField, TimeField, TabBar, Dialog, DoseRow, DueBanner) + hook `src/hooks/` (useApi, useDueReminder, useHealth, useOwnerView).
- **PWA**: `public/manifest.webmanifest`, Service Worker, hướng dẫn “Thêm vào màn hình chính” trong M08 (bắt buộc để nhận push trên iOS).

## Tài liệu

| File | Nội dung |
|---|---|
| docs/PROJECT_PLAN.md | Mục tiêu, phạm vi, quyết định đã chốt |
| docs/ARCHITECTURE.md | Kiến trúc |
| docs/DATABASE_PLAN.md | Mô hình dữ liệu |
| docs/API_SPEC.md | Đặc tả API |
| docs/BUSINESS_RULES.md | Quy tắc nghiệp vụ |
| docs/NOTIFICATION_PLAN.md | Kế hoạch thông báo (Web Push + Service Worker + PWA — đã cài ở Giai đoạn 5) |
| docs/INTERFACE_SPEC.md | Đặc tả màn hình |
| docs/TEST_PLAN.md | Kịch bản kiểm thử |
| docs/BUILD_ROADMAP.md | Lộ trình BUILD |
| docs/OPEN_QUESTIONS.md | Câu hỏi chờ duyệt |
| docs/CURRENT_STATE.md | Hiện trạng kiểm tra Giai đoạn 0 |

## Kiểm thử tích hợp và giới hạn đã biết

- **45/47 kịch bản TEST_PLAN đạt** (bảng chi tiết trong `TEST_PLAN.md` §7); **2/47 chưa kiểm thử** vì cần thiết bị/tài khoản thật: **N7** (push trên iOS — cần HTTPS + thiết bị iOS ≥ 16.4 + “Thêm vào màn hình chính”), **N12** (push người thân — cần 2 tài khoản/thiết bị thật).
- **Đã kiểm chứng đầu-cuối với Firebase Auth thật** (đăng nhập → sync → tạo thuốc → sinh lần uống → xác nhận → thống kê); tài khoản kiểm thử đã xóa. Push trên trình duyệt desktop đã chạy thật (N1, N5, N8–N11).
- **Đăng nhập bằng SĐT không xác thực SĐT**: do Spark plan không có Phone Auth (OTP SMS), SĐT đăng nhập đi qua email nội bộ `<sđt>@med.local` — hệ thống **không** kiểm chứng người dùng thật sự sở hữu số đó. Không dùng SĐT làm yếu tố bảo mật thứ hai.
- **Quên mật khẩu**: người đăng ký bằng SĐT không có email thật → **không tự khôi phục được**, phải liên hệ quản trị viên. Người đăng ký bằng email dùng chức năng quên mật khẩu của Firebase bình thường.
- **iOS Safari cần PWA**: chỉ nhận push sau khi “Thêm vào màn hình chính” (iOS ≥ 16.4); chưa có thiết bị iOS để kiểm thử.
- **Firebase plan là Spark (miễn phí)** → Phone Auth không khả dụng, nên đăng nhập dùng email hoặc SĐT qua email nội bộ.
- **npm audit (web)**: 4 cảnh báo cao đến từ `firebase` → `@grpc/grpc-js` (lỗ hổng Firestore) — **app chỉ dùng Firebase Auth, không bundle Firestore** nên không ảnh hưởng runtime; theo dõi khi nâng firebase.
- **Khóa service account**: file JSON là bí mật, `.gitignore` chặn commit (`*serviceAccountKey*.json`); backend chỉ dùng để xác minh ID token. Nếu nghi ngờ khóa bị lộ → xoay trong Firebase Console (Project settings → Service accounts → Generate new private key) và thay file.

## Git

Repo Git đã khởi tạo tại gốc dự án. Quy tắc: mỗi giai đoạn một nhánh `build/phase-N-...`, commit nhỏ; **không commit `.env`, khóa Firebase, token** (`.gitignore` đã chặn). Nhánh `main` chứa trạng thái đã bàn giao.
