# Web — Ứng dụng nhắc lịch uống thuốc

Website responsive (mobile-first) + PWA — React + Vite + TypeScript.

## Chạy

```bash
npm install
copy .env.example .env      # điền VITE_FIREBASE_* khi đã có Firebase Web app
npm run dev                 # http://localhost:5173 (proxy /api và /health về backend cổng 3000)
npm run build && npm run preview
```

Yêu cầu backend đang chạy ở cổng 3000 (xem `../README.md`).

## Kiểm thử

```bash
npm run typecheck   # TypeScript strict
npm test            # Vitest + React Testing Library
npm run lint        # oxlint
```

## Cấu trúc

```
public/            manifest.webmanifest, sw.js (Service Worker — Web Push: nhận FCM, hiện actions, mở /dose/:id)
src/
  screens/         M01–M08 + Login (đúng 8 màn hình theo INTERFACE_SPEC)
  components/      Button, Card, StateView, TabBar, Banner, Text, Fields, Dialog, DoseRow, DueBanner
  services/        api.ts (gọi backend, xử lý lỗi), firebase.ts (Auth), messaging.ts (Web Push/FCM), endpoints.ts (API có kiểu)
  store/           auth.tsx + authContext.ts (phiên đăng nhập)
  hooks/           useApi (tải/lỗi/thử lại), useHealth (báo mất mạng /health 10s), useDueReminder (banner khi trang mở)
  utils/           validation, dateTime, fontScale, doseStatus, sound, speech, firebaseErrors
  __tests__/       test nghiệp vụ + component
```

## Ghi chú

- Chưa điền `VITE_FIREBASE_*` → app chạy bình thường, màn hình đăng nhập hiện hướng dẫn cấu hình.
- **Web Push**: cần tạo **VAPID key** (Firebase Console → ⚙️ *Project settings* → tab **Cloud Messaging** → mục **Web Push certificates** → **Generate key pair**) rồi dán vào `web/.env`:
  ```
  VITE_FIREBASE_VAPID_KEY=B...   # chuỗi ~88 ký tự, bắt đầu bằng "B"
  ```
  Sau đó **khởi động lại `npm run dev`** (Vite chỉ đọc `.env` lúc khởi động) và tải lại trang. VAPID là **khoá công khai**, để trong `web/.env` là đúng; khoá riêng do trình duyệt/FCM giữ, không lưu ở đây. Mỗi dự án chỉ tạo 1 cặp khoá; nếu bấm *Regenerate* thì token cũ hết hiệu lực → người dùng phải bật lại thông báo. Chưa có key → M08 báo “chưa cấu hình”; banner nhắc trong trang vẫn chạy.
- Push từ server là **data-only**; `sw.js` tự hiển thị notification với actions “Đã uống / Nhắc lại sau / Không thể uống” → mở `/dose/:id?action=…` để app thực hiện (không cần xác thực trong Service Worker).
- iOS: cần “Thêm vào màn hình chính” (PWA) để nhận push.
