# CURRENT STATE — Giai đoạn 0 (kiểm tra dự án hiện có)

Ngày kiểm tra: 19/10/2026

## Hiện trạng

| Hạng mục | Kết quả |
|---|---|
| Thư mục dự án `D:\duong` | Trống trước khi bắt đầu (ngoài `docs/` do Giai đoạn PLAN tạo) |
| Backend hiện có | Không |
| Mobile hiện có | Đã gỡ — `mobile/` (React Native + native android/ios) xóa ngày 19/10/2026 theo quyết định chuyển sang website |
| Web hiện có | Đã nối API thật + Web Push + cài đặt M08 (20/10/2026) — `web/` (React + Vite + TypeScript + PWA): điều hướng, M01–M08, đăng nhập Firebase, đăng ký Web Push (FCM), banner nhắc trong trang, tài khoản/múi giờ/nhắc lại/thông báo người thân; **khu vực quản trị `/admin` (R9)**: 161 test (Vitest) |
| Backend hiện có | Đã xong nghiệp vụ + thông báo (20/10/2026) — `backend/` (Express + TypeScript + Mongoose + MongoDB): API thuốc/lịch/lần uống/lịch sử/người thân, dịch vụ sinh lần uống, máy trạng thái, cron, dịch vụ Web Push + phân quyền người thân + thông báo người thân; **API quản trị (R9)**: 146 test (Jest) |
| package.json | Không (thư mục gốc) — chạy lệnh trong `backend/` hoặc `web/` |
| Firebase (Auth Email/Mật khẩu, FCM Web Push, credentials) | **Auth Email/Mật khẩu đã bật và chạy thật** (dự án `medicationreminder-6177c`); credentials Admin ở `backend/.env` + `serviceAccountKey.json`; web config ở `web/.env`. **Web Push: code đã xong (Giai đoạn 5)** và **VAPID key đã tạo** (`VITE_FIREBASE_VAPID_KEY` trong `web/.env`, 20/10/2026) — còn chờ thao tác gửi/nhận push thật trên trình duyệt (Giai đoạn 7) |
| Cơ chế đăng nhập hiện có | Không |
| Git | **Không cài đặt trên máy** (`git` không tìm thấy) — không thể tạo nhánh/commit; cần cài Git hoặc bỏ qua kiểm soát phiên bản |
| Node.js | v24.21.0 |
| npm | 11.19.0 |
| MySQL | MySQL80 đang chạy (dịch vụ Windows) — **không dùng cho backend** |
| MongoDB | MongoDB 9.0.4 đang chạy — dùng cho backend (đổi từ MySQL 19/10/2026) |

## Rủi ro

1. ~~Git không sẵn sàng~~ **Đã giải quyết 20/10/2026**: Git 2.55.0 đã cài (winget), repo khởi tạo tại `D:\duong`, nhánh `main` = trạng thái GĐ0–7; quy tắc “mỗi giai đoạn một nhánh Git” áp dụng được từ GĐ8.
2. ~~Firebase chưa cấu hình~~ **Đã giải quyết 20/10/2026**: Email/Mật khẩu đã bật, Admin SDK nạp được service account, luồng đăng nhập thật đã kiểm chứng đầu-cuối.
3. **iOS/PWA**: Web Push trên iOS Safari chỉ chạy khi “Thêm vào màn hình chính”; chưa rõ có thiết bị iOS để kiểm thử (Q2).
4. **Node 24**: khá mới — kiểm tra tương thích thư viện khi cài.
5. ~~Khóa service account đã từng bị in ra console~~ **Đã xử lý 20/10/2026**: khóa mới tạo và thay vào `backend/serviceAccountKey.json`, đã kiểm chứng kết nối Firebase Auth OK. Còn lại (thao tác tay trên Console): **xóa khóa cũ** trong danh sách nếu chưa xóa.

## Việc cần làm

1. ~~Cài Git~~ **Đã xong 20/10/2026** (Git 2.55.0, repo khởi tạo, nhánh `main`).
2. Khởi tạo `backend/` (Express + TypeScript + Mongoose + MongoDB) — **đã xong** (đổi từ Sequelize/MySQL 19/10/2026).
3. Gỡ `mobile/` (React Native) và khởi tạo `web/` (React + Vite + TypeScript + PWA, responsive mobile-first) — **đã xong cả hai** (đổi nền tảng 19/10/2026; `web/` có 8 màn hình đã nối API thật, đăng nhập Firebase).
4. Tạo tài khoản Firebase, bật Auth (Email/Password) + FCM Web Push (VAPID key), lấy credentials — **đã xong** (Auth kiểm chứng thật; VAPID key đã tạo 20/10/2026).
5. ~~Xoay khóa service account~~ **Đã xong 20/10/2026** (khóa mới đã thay, kết nối Firebase Auth OK; còn thao tác tay: xóa khóa cũ trên Console).
6. ~~Nối API thật vào M01–M06 (Giai đoạn 4)~~ **Đã xong 20/10/2026** (xem Nhật ký BUILD).
7. **Còn lại (không tự động hoá được)**: N7 (push iOS) và N12 (push người thân) — cần thiết bị/tài khoản thật.

## Nhật ký BUILD

### 20/10/2026 — Xác thực chạy thật đầu-cuối

Đã kiểm chứng bằng tài khoản kiểm thử thật (đã xóa sau khi kiểm thử):

| Bước | Kết quả |
|---|---|
| Bật Email/Mật khẩu (Firebase Console) | ✅ `accounts:signInWithPassword` hết `CONFIGURATION_NOT_FOUND` |
| Tạo tài khoản qua REST → lấy ID token | ✅ |
| `POST /api/v1/users/me/sync` | ✅ 200, tạo bản ghi user |
| `GET /api/v1/users/me` | ✅ 200 |
| `POST /api/v1/medications` (2 lịch 08:00, 20:00) | ✅ 201 kèm lịch |
| `GET /api/v1/doses/today` | ✅ 2 lần uống, `scheduledAt` = `01:00Z` và `13:00Z` (đúng giờ VN) |
| `POST /api/v1/doses/:id/confirm` (gọi lại 2 lần) | ✅ 200, idempotent, thống kê `confirmed=1 remaining=1 total=2` |
| Dọn dẹp | ✅ đã xóa tài khoản Firebase + dữ liệu MongoDB của tài khoản kiểm thử |

**Lỗi tìm thấy và đã sửa trong lúc kiểm chứng:**

1. **Không thể tạo user lần đầu** (con gà–quả trứng): `authMiddleware` chỉ gắn `req.user` khi user *đã có* bản ghi trong CSDL → `POST /users/me/sync` luôn trả 400/401 cho tài khoản mới. Sửa: token hợp lệ là đủ để gắn `req.user`; thêm `requireFirebaseAuthMiddleware` (chỉ cần token) cho `/users/me/sync`, `requireAuthMiddleware` (cần bản ghi user) cho các route còn lại; thêm `currentUserId(req)` để chuyển optional → string. Xóa `middlewares/requireAuth.ts` (mã chết).
2. **JSON hỏng trả 500**: body-parser lỗi cú pháp bị coi là lỗi máy chủ. Sửa: trả 400 `VALIDATION_ERROR`.
3. **Lệch múi giờ (lỗi dữ liệu)**: lịch 08:00 giờ VN bị lưu thành `08:00Z` (15:00 giờ VN) — dịch 7 giờ; mốc ngày của `/doses/today`, `/doses?date=` và `/history?from&to` cũng cắt theo UTC. Sửa: thêm `localDateTimeToUtc`, `startOfLocalDayUtc`, `endOfLocalDayUtc`, `shiftYmd` (`backend/src/utils/time.ts`); dùng `users.timezone` (`currentTimezone(req)`) khi sinh lần uống và khi lọc theo ngày.
4. **Test phụ thuộc giờ chạy**: test “xác nhận muộn trong cùng ngày” dùng `now − 2 giờ` nên hỏng khi chạy sau nửa đêm; đã đổi sang mốc “trong ngày địa phương hôm nay và đã qua”.

**Đã kiểm thử sau khi sửa**: backend `tsc --noEmit` sạch + **42/42 test** (4 bộ: api, authMiddleware, doseService, time); web 32/32 (chưa chạy lại sau các sửa backend — không ảnh hưởng vì web chưa nối API thật).

**Chưa làm (ghi rõ, không suy diễn là đạt)**: quy tắc snooze “không vượt quá 23:59 giờ địa phương” (BUSINESS_RULES) chưa được cài — hiện chỉ chặn theo `scheduled_at + 2 giờ`.

### 20/10/2026 — Hoàn tất Giai đoạn 3 (backend nghiệp vụ)

- **Cài nốt 2 quy tắc còn thiếu**: B8 (nhắc lại không vượt 23:59 giờ địa phương — `snoozeDenyReason`) và B14 (đổi giờ lịch → sinh lại lần uống tương lai theo phiên bản mới), kèm B15 (ngừng thuốc → xóa lần uống tương lai).
- **Thêm test**: B3 (sinh lần uống 7 ngày, chạy lại không trùng), B6 (confirm song song cùng `clientRequestId`), B8 (2 trường hợp 409), B14, B15, B16 (ngày địa phương mốc 23:30–00:30).
- **Làm test ổn định theo thời gian**: `snoozeDose`/`confirmDose`/`generateUpcomingDoses` nhận `tz` và `now` truyền vào; test B7 dùng đồng hồ cố định thay vì `new Date()`.
- **Kết quả**: `tsc --noEmit` sạch, **52/52 test backend đạt** (4 bộ). Phủ hết B1–B17.
- **Đã xóa**: `D:\duong\package-lock.json` (lockfile rỗng ở thư mục gốc, không có `package.json` tương ứng).

### 20/10/2026 — Hoàn tất Giai đoạn 4 (nối API thật vào M01–M06)

Theo thứ tự M04 → M05 → M03 → M01 → M02 → M06; mỗi màn hình có trạng thái tải/rỗng/lỗi/thử lại và chỉ báo thành công khi server trả 2xx.

| Hạng mục | Kết quả |
|---|---|
| M04 | `GET /medications?status=`; ngừng thuốc qua hộp thoại xác nhận → `POST /medications/:id/discontinue` |
| M05 | Tạo `POST /medications`; sửa `PATCH /medications/:id`; đổi giờ lịch `PUT /medications/schedules/:id` (có xác nhận); thêm giờ `POST /medications/:id/schedules`; xóa giờ `DELETE /medications/schedules/:id`; route mới `/medications/:id/edit` |
| M03 | `GET /doses?date=`, phân nhóm sáng/trưa/chiều/tối, bấm dòng → M02 |
| M01 | `GET /doses/today`; nút lớn “Đã uống thuốc” → `POST /doses/:id/confirm` (kèm `clientRequestId`); thống kê; 4 nhóm buổi; lối tắt M03/M07 |
| M02 | `GET /doses/:id`; xác nhận / nhắc lại sau / không thể uống (hộp thoại lý do); trạng thái kết thúc → chỉ đọc, có nhãn “xác nhận muộn” |
| M06 | `GET /history?from=&to=&medicationId=&page=`; lọc theo thuốc; phân trang |

**Thay đổi backend ngoài kế hoạch (đã được người dùng duyệt trước khi làm)** — để M05 sửa được thêm/bớt giờ, vốn không có API:
1. `POST /medications/:id/schedules` — thêm lịch vào thuốc đang dùng; trùng giờ → 409; thuốc đã ngừng → 409; sinh lần uống tương lai.
2. `DELETE /medications/schedules/:id` — lịch → archived, xóa lần uống tương lai, giữ lịch sử (thêm `deleteFutureDosesForSchedule`).
3. `GET /doses/:id` trả kèm `medicationName`/`dosageText`/`instructions` (M02 cần tên thuốc khi mở từ thông báo).
4. `PATCH /medications/:id` nhận `endDate: null` để bỏ hạn kết thúc.

**Nền tảng web dùng chung mới**: `src/services/endpoints.ts` (API có kiểu), `src/utils/doseStatus.ts` (nhãn/icon trạng thái, `nextActionable`), `src/components/Dialog.tsx` (Modal/ConfirmDialog/ReasonDialog), `src/components/DoseRow.tsx`; `AuthProvider` nạp `GET /users/me` (lần đầu đăng nhập thì `POST /users/me/sync`) và cấp `timezone` cho mọi màn hình.

**Kiểm thử đã chạy**: backend **57/57** (Jest, +5 test cho 4 thay đổi trên), web **62/62** (Vitest: endpoints, doseStatus, M01/M02/M04/M05/M06) — đều đạt; `tsc --noEmit`/`npm run typecheck` + lint sạch; `npm run build` (web production) đạt. Dev server thật: `/health` OK, proxy Vite `/api/v1` trả 401 khi thiếu token (đúng quy tắc).

**Chưa kiểm thử (ghi rõ)**: mở từng màn hình trên trình duyệt/điện thoại thật với tài khoản Firebase thật (Giai đoạn 7); push notification (Giai đoạn 5).

### 20/10/2026 — Hoàn tất Giai đoạn 5 (Thông báo Web Push + M07)

Chia 4 bước nhỏ, làm xong từng bước rồi test ngay:

| Bước | Nội dung | File chính |
|---|---|---|
| 5A | Dịch vụ Web Push server + cron mỗi phút | `backend/src/services/notificationService.ts`, `jobs/scheduler.ts`, `config/firebase.ts` (`getMessagingOrNull`), `models/NotificationLog.ts` |
| 5B | Đăng ký Web Push ở web + Service Worker + M08 | `web/src/services/messaging.ts`, `web/public/sw.js`, `web/src/screens/M08.tsx`, `web/src/main.tsx`, `store/auth.tsx` (đăng xuất) |
| 5C | Banner + âm thanh khi trang mở + M02 nhận action | `web/src/hooks/useDueReminder.ts`, `components/DueBanner.tsx`, `utils/sound.ts`, `screens/M02.tsx`, `App.tsx` |
| 5D | M07 thật + phân quyền người thân | `web/src/screens/M07.tsx`, `backend/src/middlewares/familyAccess.ts`, `routes/doses.ts`, `routes/history.ts`, `routes/medications.ts` |

**Quyết định kỹ thuật**:
- Push dạng **data-only** (không dùng `webpush.notification`) + Service Worker tự hiển thị → kiểm soát được **actions** và mở `/dose/:id?action=…`; không cần xác thực trong SW.
- **Chống trùng** theo `(dose_id, kind)` trong `notification_logs`; **thử lại tối đa 3 lần** (backoff 1s/5s/15s); token hỏng → `Device.status='invalid'` + log `expired`.
- Cửa sổ gửi trễ tối đa **30 phút** (pending) / **120 phút** (overdue, snooze) → tránh “dội” thông báo cũ sau khi server bật lại.
- Không dùng thêm thư viện: `firebase` (web) + `firebase-admin` (backend) đã có sẵn.

**Thay đổi ngoài kế hoạch (đã được người dùng duyệt bằng câu hỏi trước khi làm)**: thêm query `?ownerId=` cho các API **đọc** (`GET /doses/today`, `GET /doses`, `GET /doses/:id`, `GET /medications`, `GET /medications/:id`, `GET /history`) và cho API **ghi thuốc** (đòi `manage_medication`, MVP = false → 403), kèm middleware `resolveOwnerAccess`. Lý do: PROJECT_PLAN mục 4 cho người thân quyền **xem lịch**, nhưng trước đó chưa có cách đọc hộ. Đã ghi vào API_SPEC mục 3.8.

**Sửa lệch tài liệu**: đổi `API_SPEC.md` mục 2.8 từ `/devices/register` → `/users/devices/register` (khớp code); thêm kind `overdue` và channel `fcm|in_app` cho `notification_logs` trong `DATABASE_PLAN.md`/`models/NotificationLog.ts`.

**Kiểm thử đã chạy**:
- Backend: **80/80** (Jest) — thêm `tests/notificationService.test.ts` (14: gửi/log/reminded_at, bỏ qua khi đã xác nhận hoặc ngừng thuốc, chống trùng, token hỏng, retry, snooze 2 lần, overdue, job cron) và `tests/family.test.ts` (9: S3, S4, S5, S6, S7).
- Web: **85/85** (Vitest) — thêm `messaging.test.ts`, `m08Notification.test.tsx`, `dueReminder.test.tsx`, `m07Family.test.tsx` + test M02 `?action=confirm` và `dueDoses`/`firstDueDose`.
- Typecheck/lint sạch cả hai; `npm run build` (web production) đạt (~448 kB, gzip ~137 kB). Dev server thật: `/health` OK; `/api/v1/family/connections` trả 401 khi thiếu token (đúng).

**Chưa kiểm thử (ghi rõ, KHÔNG đánh dấu đạt)**: push thật trên trình duyệt/thiết bị — cần **VAPID key** trong `web/.env` (việc của người dùng: Console → Cloud Messaging → Web Push certificates) + một trình duyệt thật. Vì vậy **N1–N10 chưa chạy**; N11 (banner trong trang) và các luồng API/family đã có test tự động. iOS Safari cần “Thêm vào màn hình chính” (chưa có thiết bị iOS để thử).

### 20/10/2026 — Hoàn tất Giai đoạn 6 (M08 + sức khỏe)

| Hạng mục | Kết quả |
|---|---|
| Tài khoản | M08 đổi **tên hiển thị** + **múi giờ** → `PATCH /users/me`; lưu xong gọi `refreshProfile()` (múi giờ mới áp cho mọi màn hình). Múi giờ lấy từ `Intl.supportedValuesOf('timeZone')` (không thêm thư viện) + danh sách dự phòng |
| Cài đặt nhắc lại | `PATCH /users/me/notification-settings` lưu `snoozeMinutes` (5–30) + `snoozeMax` (1–5) vào `users.preferences`; `snoozeDose` đọc `utils/preferences.ts` → backend **tuân theo**; thiếu/sai → mặc định 10 phút × 3 lần |
| Âm thanh | Công tắc ở M08 → `utils/sound.ts` (localStorage) |
| Giọng đọc | `utils/speech.ts` (Web Speech, mặc định TẮT, ẩn nếu không hỗ trợ) + nút “Thử giọng đọc”; `useDueReminder` đọc tên thuốc + hướng dẫn khi đến giờ |
| Thông báo người thân | Thêm `relative_alerts` (mặc định bật) vào `family_connections.permissions`; M08 liệt kê kết nối (vai trò chủ hồ sơ) + công tắc; khi chuyển `missed` → `notifyRelativeMissed` push tới thiết bị người thân, chống trùng theo dose+kind, cron quét trong cửa sổ 30 phút |
| Sức khỏe | Rà soát: chỉ tuân thủ uống thuốc; M01 + M06 đáp ứng; **không thêm mã/API/chỉ số** |

**Thay đổi ngoài kế hoạch (đã được người dùng duyệt bằng câu hỏi trước khi làm)**:
1. Cài đặt nhắc lại do người dùng chỉnh và **backend tuân theo** (không chỉ hiển thị).
2. **Gửi push thật cho người thân** khi chủ hồ sơ bỏ lỡ (đúng NOTIFICATION_PLAN §3.4 — vốn ghi “giai đoạn mở rộng”).

**File chính**: `backend/src/utils/preferences.ts` (mới), `services/doseService.ts`, `services/notificationService.ts` (`notifyRelativeMissed`, `sendPushToTokens`), `routes/users.ts`, `routes/family.ts`, `models/FamilyConnection.ts`; `web/src/screens/M08.tsx`, `store/auth.tsx`/`authContext.ts` (`refreshProfile`), `services/endpoints.ts`, `utils/speech.ts` (mới), `hooks/useDueReminder.ts`.

**Kiểm thử đã chạy**: backend **94/94** (Jest; thêm `tests/users.test.ts` 6 test, 1 test snooze theo cài đặt, 6 test relative alert, 1 test quyền `relative_alerts` — tổng +14); web **92/92** (Vitest; thêm `m08Settings.test.tsx` 7 test). Typecheck/lint sạch; `npm run build` (web) đạt (~455 kB, gzip ~138 kB).

**Chưa kiểm thử (GHI RÕ)**: push thật (relative alert + nhắc giờ) trên trình duyệt/thiết bị thật; **chưa chạy N1–N10** (thuộc Giai đoạn 7, cần VAPID key).

### 20/10/2026 — Hoàn tất Giai đoạn 7 (Kiểm thử tích hợp)

Bảng kết quả đầy đủ ở `docs/TEST_PLAN.md` §7: **45/47 đạt — 2/47 chưa kiểm thử — 0 không đạt** (cập nhật sau các đợt chạy tay, xem §7.8–§7.11).

| Hoạt động | Kết quả |
|---|---|
| Test tự động (hồi quy) | Backend **95/95** (7 suite, Jest) + web **99/99** (14 file, Vitest); `tsc`/typecheck + lint sạch; web build production OK (455,35 kB / gzip 138,69 kB). **Cập nhật sau khi triển khai R1–R3 (§7.11)**: backend **105/105**, web **108/108**; build 457,32 kB / gzip 139,17 kB |
| Smoke test API live (`:3000`) | `/health` 200; không token → 401; route lạ → 404; JSON hỏng → 400 |
| E2E thật (Firebase + backend + MongoDB) | **23/23 bước đạt** với tài khoản tạm (đã xoá sạch): đăng ký/sync, cài đặt nhắc lại, tạo thuốc 3 lịch, `/doses/today` đúng múi giờ + UTC, confirm idempotent, snooze 15 phút × 1, cannot-take, history, S3/S4/S5, mã mời/kết nối, `relative_alerts` |
| S9 (live MongoDB) | Bản ghi mã mời chỉ có `code_hash` SHA-256, không lưu mã thô |
| S8 | Rà soát: backend không có log request/token |
| U6 | Rà soát `App.tsx`: đúng M01–M08 + Login |

**Tìm thấy lỗi thật khi bạn chạy thao tác tay và đã xử lý** (xem các mục 20/10/2026 bên dưới + `TEST_PLAN.md` §7.7–§7.10); hồi quy sau mỗi lần sửa vẫn sạch. **Không còn kịch bản “không đạt”. Chưa kiểm thử**: N7 (iOS), N12 (chờ chạy lại cùng thay đổi ngưỡng cảnh báo).

### 20/10/2026 — Sửa lỗi chặn đăng nhập lần đầu (phát hiện khi chạy thao tác tay Giai đoạn 7)

**Triệu chứng người dùng báo**: không bật được thông báo; mọi chức năng đều báo “yêu cầu xác thực”.

| Lỗi | Nguyên nhân gốc | Cách sửa | Test tái hiện |
|---|---|---|---|
| D1 — đăng nhập lần đầu không tạo được bản ghi user | `web/src/store/auth.tsx` chỉ gọi `POST /users/me/sync` khi `GET /users/me` trả 404, nhưng backend trả **401** (token hợp lệ nhưng chưa có bản ghi user) → bản ghi không bao giờ được tạo → mọi API sau đều 401 | Coi **cả 401 lẫn 404** là “chưa có hồ sơ” → gọi `syncProfile()`; thêm khoá chống gọi trùng (in-flight) | `web/src/__tests__/authProvider.test.tsx` (4 ca; ca 401 **đỏ trước khi sửa**) |
| D2 — 2 tab đăng nhập lần đầu có thể nhận 500 | `POST /users/me/sync` kiểm tra tồn tại rồi `create`; 2 request đồng thời cùng `firebase_uid` → trúng unique index E11000 → 500 | Bắt `code === 11000` → đọc lại bản ghi vừa được tạo (idempotent) | `backend/tests/api.test.ts` “hai request sync đồng thời” (**đỏ trước khi sửa**: một request 500) |

**Chẩn đoán đã chạy**: đăng ký + đăng nhập Firebase + `POST /users/me/sync` + `GET /doses/today` đều 200 khi gọi tay qua proxy `:5173` → xác nhận backend/Firebase/proxy tốt, lỗi nằm ở luồng `AuthProvider`. Tài khoản tạm dùng để chẩn đoán đã xoá.

**Hồi quy sau khi sửa**: backend **95/95** (7 suite) + web **96/96** (14 file); oxlint/`tsc` sạch; web build OK (455,21 kB / gzip 138,61 kB).

### 20/10/2026 — Đợt 2: xử lý kết quả chạy tay đầu tiên (N1, N9)

**Người dùng báo**: thông báo tới **chậm ~2 phút**; bấm action **“Nhắc lại sau”** trên notification **không** có push nhắc lại.

**Bằng chứng đã thu thập (đọc DB thật, script tạm đã xoá)**:

- `notification_logs` chỉ có 2 dòng `scheduled_reminder` với `sent_at` = **giờ hẹn + 0,1 giây** → server gửi đúng giờ; độ trễ ~2 phút nằm ở FCM/Windows (ghi vào “giới hạn đã biết” Giai đoạn 8).
- Lần uống 18:59:00Z còn `status=pending`, `snooze_count=0`; **không có log `snooze`** → request snooze chưa từng được gửi (nguyên nhân gốc của N9 **chưa chốt**, cần 1 lần chạy lại với F12 → Network).

| # | Sửa | Test |
|---|---|---|
| D3 | M02 hiển thị sai cài đặt nhắc lại (hard-code “10 phút”/“3 lần” dù M08 đặt 5 phút × 5 lần) → lấy `snoozedUntil` backend trả về + `profile.preferences.snoozeMax` | `screens.test.tsx` (+2 test) |
| D4 | `sw.js`: `notificationclick` có thể mất hành động khi `client.navigate` lỗi → `try/catch` + mở cửa sổ mới | chạy tay |
| D5 | Thêm test cho `?action=snooze` và `?action=cannot` (trước chỉ có `confirm`) | `screens.test.tsx` (+1 test) |

**Hồi quy sau đợt 2**: web **99/99** (14 file); oxlint + `tsc -b` sạch; build OK (455,35 kB / gzip 138,69 kB). Backend không đổi (95/95).

### 20/10/2026 — Đợt 3: đổi múi giờ sang Asia/Bangkok + 2 lịch trùng giờ

**Người dùng báo**: sau khi đổi múi giờ sang `Asia/Bangkok`, thông báo chỉ còn chậm ~30 giây; tạo 2 lịch trùng giờ thì thấy 1 thông báo trước, xác nhận xong mới hiện cái thứ hai.

**Kiểm chứng bằng DB**:

- **Độ trễ**: `sent_at` luôn = giờ hẹn **+0,1…0,9 giây** (19:21:00.224Z, 19:25:00.942Z, 19:26:00.394Z…). `Asia/Bangkok` và `Asia/Ho_Chi_Minh` **cùng UTC+7** → việc đổi múi giờ không đổi mốc gửi; phần chậm còn lại là FCM/Windows (dao động).
- **N10**: 2 lần uống cùng `19:21:00Z` (2 thuốc khác nhau) có **2 log `scheduled_reminder status=sent`** (19:21:00.224Z và .450Z) và cả hai đều được xác nhận → server gửi 2 push riêng; Windows chỉ hiện **lần lượt từng banner** cho cùng một ứng dụng → **N10 = đạt**.
- **N9**: vẫn chưa có log `snooze` nào; ghi nhận thêm `snooze_count=1` trên một lần uống (chưa rõ từ nút action hay nút trong app) → giữ **không đạt**, chờ chạy lại với kiểm tra F12 → Network.

**Không đổi mã nguồn trong đợt 3** (chỉ cập nhật tài liệu kiểm thử).

### 20/10/2026 — Đợt 4–5: chạy tay N5/N8/U5/U7 + triển khai 3 yêu cầu mới (R1–R3)

**Kết quả chạy tay**: **N8 đạt** (bấm thân notification → mở đúng M02), **N5 đạt** (tắt mạng rồi bật lại → push vẫn tới, trễ ~30 giây), **U5 đạt** (zoom 200%), **U7 đạt** (375×667 và 1280×800). → `TEST_PLAN.md` §7 cập nhật **45/47 đạt — 2 chưa kiểm thử (N7, N12) — 0 không đạt**.

**3 yêu cầu mới của người dùng** (người dùng **đã duyệt** với các chốt: mốc 15 phút tính từ **lần nhắc lại cuối**; người thân xem **M03 + M04** ở chế độ chỉ xem; **giữ** trạng thái `missed` ở 120 phút):

| # | Yêu cầu | Đã làm |
|---|---|---|
| R1 | Mặc định **chưa xác nhận uống thuốc trong 15 phút → thông báo cho người thân** (thay vì chờ `missed` = 120 phút) | Thêm biến môi trường `RELATIVE_ALERT_AFTER_MINUTES=15` (đã ghi vào `backend/.env`); `processDueNotifications` thêm nhóm “lần uống chưa xác nhận quá ngưỡng” (status `pending`/`snoozed`/`overdue`, mốc = `snoozed_until ?? scheduled_at`, cửa sổ bù = ngưỡng + 30 phút) → gọi `notifyRelativeAlert` (đổi tên từ `notifyRelativeMissed`, bỏ điều kiện cứng `status==='missed'`); giữ nguyên mốc `missed` 120 phút cho hiển thị, làm lưới an toàn; chống trùng `(dose_id, 'relative_alert')` như cũ |
| R2 | **M07 (Người thân) thiếu nút quay lại** | Thêm “← Quay lại” (về trang trước; mở trực tiếp bằng URL thì về Trang chủ) |
| R3 | **Người thân xem được lịch uống thuốc + thuốc của chủ hồ sơ** | Backend: `GET /doses/:id` cho phép người thân có `view_schedule` đọc dose của chủ hồ sơ (**trước đây 404** — cũng là lý do bấm notification relative alert không mở được), trả thêm `canAct` + múi giờ chủ hồ sơ; `GET /family/connections` trả thêm `timezone`. Web: hook mới `useOwnerView` đọc `?ownerId=`; M07 thêm nút “Xem lịch uống thuốc” → `/schedule?ownerId=…`; M03 hiện banner “Đang xem lịch của …” + nút về danh sách + tính ngày/buổi theo **múi giờ của chủ hồ sơ**; M04 tương tự ở chế độ **chỉ xem** (ẩn Thêm/Sửa/Ngừng); M02 ẩn nút hành động khi `canAct=false` |

**Kiểm thử sau R1–R3** (chi tiết ở `TEST_PLAN.md` §7.11): backend **105/105** (+11 test: 6 ngưỡng 15 phút, 5 đọc hộ lần uống) + `tsc --noEmit` sạch; web **108/108** (+9 test M02/M03/M04/M07) + oxlint + `tsc -b` sạch + build OK (457,32 kB / gzip 139,17 kB).

Không thêm thư viện, không đổi lược đồ CSDL; chỉ thêm 1 biến môi trường và 2 trường trong phản hồi API. Backend dev đang chạy (`ts-node-dev --respawn`) nên đã tự nạp mã mới.

### 20/10/2026 — R4: thiết kế lại toàn bộ giao diện (đơn giản – dễ dùng – chuyên nghiệp)

**Yêu cầu người dùng** (đã chốt qua câu hỏi): (a) làm lại bố cục **toàn bộ 8 màn hình M01–M08 + trang đăng nhập**; (b) trang đăng nhập/đăng ký trở thành **trang giới thiệu ứng dụng** (công dụng, tiện ích, lợi ích) + form đăng nhập ở cuối trang; (c) **người thân phải THẤY lịch uống thuốc của chủ hồ sơ trực tiếp**, không chỉ có nút “Xem lịch uống thuốc”; (d) **giữ nguyên** chiều phân quyền MVP (chỉ người thân xem được của chủ hồ sơ, không ngược lại). Phạm vi: **không đổi API, không đổi luồng nghiệp vụ, không đổi lược đồ CSDL**.

**Nền tảng thiết kế** — `web/src/index.css` viết lại thành hệ thống thiết kế có token (màu, bo góc, bóng, `--font-mult`), giữ nguyên mọi quy tắc của INTERFACE_SPEC: chữ ≥ 18px, nút ≥ 56px, tương phản cao, trạng thái luôn kèm **icon + nhãn chữ** (không chỉ dùng màu), tab dưới trên điện thoại / nav ngang khi ≥ 768px.

**Component dùng chung mới**: `Section` (khối có tiêu đề + icon + mô tả), `Notice` (thông báo info/success/error/warning), `StatGrid` (cụm số liệu), `Segmented` + `ChoiceRow` (chuyển nhóm & ô chọn lớn). Các component cũ (`Button`, `Card`, `Fields`, `StateView`, `DoseRow`, `TabBar`) chuyển sang lớp CSS/token mới nhưng **giữ nguyên API props và tên truy cập** mà test đang kiểm.

**Từng màn hình**:

| Màn | Thay đổi |
|---|---|
| Đăng nhập | Trở thành **trang giới thiệu**: hero (tên app + slogan + 2 nút), khối “Công dụng và tiện ích” (6 thẻ), “Lợi ích khi sử dụng”, “Bắt đầu trong 3 bước”, rồi **form đăng nhập/đăng ký** ở cuối trang; vẫn 1 URL `/login` |
| M01 | Ưu tiên **một việc cần làm ngay** (thẻ nổi bật + nút “Đã uống thuốc” lớn) → tiến độ (thanh % + số liệu) → lịch theo buổi → lối tắt |
| M02 | Thẻ thông tin + 3 nút hành động xếp dọc; nhãn giữ đúng “Đã uống”, “Nhắc lại sau”, “Không thể uống”; chế độ người thân hiện nhãn **“Chỉ xem”** |
| M03 | Khối chọn ngày (Ngày trước/Hôm nay/Ngày sau) tách riêng; nhóm theo buổi có icon; banner “Đang xem lịch của …” giữ nguyên |
| M04 | Phân nhóm thẻ thuốc rõ ràng, tab Đang dùng/Đã ngừng, nút Sửa/**Ngừng** giữ nguyên nhãn |
| M05 | Biểu mẫu chia 3 nhóm (Thông tin thuốc → Giờ uống → Thời gian dùng); mỗi giờ là một dòng có nút Xóa; nút lưu nhãn **“Lưu”** |
| M06 | Bộ lọc gọn: chọn nhanh **7/30/90 ngày** + khoảng ngày + thuốc; tóm tắt số lần uống; thẻ lịch sử; phân trang |
| M07 | **Người thân thấy lịch uống thuốc ngay trong màn** (tải trực tiếp `GET /doses?date=&ownerId=`, nhóm theo buổi, có chuyển ngày); vẫn còn nút “Xem lịch uống thuốc” để mở M03 xem chi tiết; chủ hồ sơ vẫn thấy công tắc cấp quyền + ngắt kết nối |
| M08 | Mỗi nhóm cài đặt là một thẻ có tiêu đề/mô tả (Thông tin cá nhân, Cỡ chữ, Đăng xuất, Cài đặt nhắc lại, Âm thanh & giọng đọc, Thông báo đẩy, Thông báo cho người thân) |

**Thay đổi test (có chủ đích, do yêu cầu người dùng đổi)**: `web/src/__tests__/screens.test.tsx` — 2 test của M07 cập nhật theo thiết kế mới (người thân **thấy lịch trực tiếp** + vẫn mở được `/schedule?ownerId=`; khi mất quyền thì không hiện lịch lẫn nút). **Không** nới lỏng hay bỏ test nào khác.

**Kiểm chứng**: web **116/116 (vitest, 15 file)**, `tsc -b` sạch, `oxlint` không cảnh báo, build OK (**468,86 kB / gzip 142,63 kB**). Backend **không thay đổi** (`tsc --noEmit` sạch). Thêm 8 test cho trang đăng nhập/giới thiệu (`web/src/__tests__/login.test.tsx`) vì trước đó màn này chưa có test nào.

**Chưa kiểm thử (ghi rõ)**: chưa mở lại từng màn hình trên trình duyệt/điện thoại thật sau khi thiết kế lại (thuộc kiểm thử tay Giai đoạn 7 — cần chạy lại N1–N12/U1–U8); đặc biệt **U5 (zoom 200%) và U7 (375×667 / 1280×800)** cần chạy lại vì bố cục đã đổi. Luồng **người thân xem lịch trực tiếp trong M07** mới chỉ được kiểm bằng test đơn vị, **chưa chạy thật với 2 tài khoản**.

### 20/10/2026 — R5: chỉnh trang chủ (giới thiệu) + trang chủ M01 theo phản hồi người dùng

**Phản hồi người dùng** (đã chốt qua câu hỏi): (a) “trang chủ vẫn như cũ” → cần thiết kế lại **cả trang giới thiệu lẫn M01**; (b) trang giới thiệu là **trang chủ** hiện ra đầu tiên, nhưng khi bấm **Đăng nhập/Đăng ký** thì form phải **hiện ra giữa màn hình** (hộp thoại), không cuộn xuống cuối trang. Phạm vi giữ nguyên: **không đổi API, không đổi luồng nghiệp vụ, không đổi CSDL**; backend không sửa.

**Thay đổi**:

| Nhóm | Nội dung |
|---|---|
| `web/src/screens/Login.tsx` | Bỏ form nằm cuối trang → **thanh đầu trang** (logo thương hiệu + nút “Đăng nhập”/“Đăng ký”) + **hero hai cột** (nội dung + thẻ minh hoạ “Cần uống bây giờ”) + **dải số liệu tin cậy** + 3 khối giới thiệu; bấm nút auth mở **hộp thoại giữa màn hình** (`role="dialog"`, `aria-modal`, tiêu đề gắn `aria-labelledby`) với form đăng nhập/đăng ký, nút đóng `aria-label="Đóng"`, bấm nền cũng đóng |
| `web/src/screens/M01.tsx` | **Dải chào mừng** nền chuyển sắc (lời chào + ngày + thanh tiến độ) → **thẻ “Cần uống bây giờ”** nổi bật (giờ lớn 44px + tên thuốc + liều + nút lớn) → tiến độ (số liệu + tổng kết) → **lịch theo buổi** dạng dòng thời gian có số lần uống mỗi buổi → lối tắt |
| `web/src/index.css` | Thêm lớp CSS: `.site-header`/`.brand`, `.hero__preview`, `.trust-strip`, `.modal-backdrop`/`.modal` (có `prefers-reduced-motion`), `.greeting`, `.now-card`, `.day-part` |
| `web/src/__tests__/login.test.tsx` | Cập nhật theo hành vi mới (form nay nằm trong hộp thoại): mặc định **chưa** mở form; mở/đóng hộp thoại; giữ nguyên mọi assertion nghiệp vụ (validate email/mật khẩu, gọi `login`/`register`, cắt khoảng trắng). Thêm test mở/đóng hộp thoại → **10 test** (trước 8) |

**Sửa lỗi trùng tên truy cập phát hiện khi viết test**: nút trên thanh đầu trang và nút submit trong hộp thoại đều tên “Đăng nhập” → trình đọc màn hình không phân biệt được. Đã thêm `aria-label="Mở đăng nhập"` / `"Mở đăng ký"` cho nút thanh đầu trang và đổi nút hero thành “Tôi đã có tài khoản”.

**Kiểm chứng**: web **118/118** (15 file), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**470,78 kB / gzip 143,00 kB**). Backend **không thay đổi**. Dev server đã phục vụ bản mới (kiểm tra `Login.tsx` có `modal-backdrop`/`site-header`, `M01.tsx` có `greeting`/`now-card`).

**Chưa kiểm thử (ghi rõ)**: hộp thoại đăng nhập và bố cục M01 mới **chưa mở lại trên trình duyệt/điện thoại thật**; cần chạy lại **§5 (U1–U8)**, đặc biệt **U5 (zoom 200%)** và **U7 (375×667 / 1280×800)** vì có thêm phần tử `position: fixed`. Luồng người thân xem lịch trong M07 vẫn **chưa chạy thật với 2 tài khoản**.

### 20/10/2026 — R6: đổi phong cách sang giấy kem · mực nâu · đỏ gạch (tối giản, mộc)

**Phản hồi người dùng** (đã chốt qua câu hỏi): giao diện R4/R5 “hơi công nghiệp và bị AI hoá”; mong muốn **tối giản – simple – vintage – chuyên nghiệp – hiện đại**. Chốt: tông **giấy kem + mực nâu + đỏ gạch**; **tối giản tuyệt đối** (bỏ gradient, bóng đổ, emoji rực rỡ); **serif cho tiêu đề**, sans-serif cho nội dung. Phạm vi giữ nguyên: **không đổi API/CSDL/luồng nghiệp vụ**; backend không sửa; không thêm thư viện/font ngoài.

**Thay đổi**:

| Nhóm | Nội dung |
|---|---|
| Token màu | `:root` đổi toàn bộ: `--c-bg #f4efe4` (giấy kem), `--c-surface #fbf8f1`, `--c-surface-2 #f0e9db`, `--c-text #2b2320` (mực nâu), `--c-muted #6b5c50`, `--c-border #d8cdb9`; nhấn chính `--c-primary #9a2f22` (**đỏ gạch**), phụ `--c-accent #4a5a3a` (**xanh rêu**); trạng thái đổi sang tông trầm (danger `#8e2318`, success `#3f5b32`, warning `#8a5a12`) |
| Hình dáng | Bo góc nhỏ lại (4/6/8px thay 10/14/20); **`--shadow-1`/`--shadow-2` = `none`** → bỏ mọi bóng đổ |
| Typography | Thêm `--font-serif` (Georgia/Times) cho `h1–h3`, `.section-title`, `.brand`, số liệu, giá trị lớn; nội dung vẫn sans-serif. Bỏ `letter-spacing` âm |
| Trang trí | **Bỏ toàn bộ `linear-gradient`** (nền landing, thẻ highlight, dải chào mừng M01, thẻ “cần uống”, logo thương hiệu). Thay bằng nền phẳng + **viền màu mảnh làm điểm nhấn** (`border-left`/`border-top` đỏ gạch) |
| Lưới | `.stat-grid`, `.feature-grid`, `.trust-strip` chuyển từ “thẻ có khe hở” sang **lưới liền kề có đường kẻ 1px** (kiểu bảng in) |
| Segmented | Từ nút bo tròn có bóng → **gạch chân tab** (kiểu tab sách) |
| Badge trạng thái | Từ viên thuốc bo tròn `borderRadius: 999` → hình chữ nhật bo nhẹ 3px |
| Hộp thoại | `Dialog`, `Modal` (login), `DueBanner` bỏ bóng đổ, viền mảnh, điểm nhấn viền trên trái; nền mờ đổi sang nâu `rgba(43,35,32,.5)` |
| Chữ trắng trên nền đỏ | Đổi từ `#fff` sang `#fdf9f2` (trắng ngà) để hợp tông giấy |

**File chính**: `web/src/index.css` (phần lớn thay đổi), `web/src/components/{Button,Dialog,DoseRow,DueBanner}.tsx`, `web/src/screens/{M01,M04,M07,M08}.tsx` (màu cứng còn sót).

**Kiểm chứng**: web **118/118** (15 file — không đổi số lượng test), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**470,87 kB / gzip 142,95 kB**). Backend **không thay đổi**. Xác nhận dev server phục vụ bản mới: `index.css` có `#f4efe4`, `#9a2f22`, `Georgia`, **không còn** `linear-gradient`.

**Chưa kiểm thử (ghi rõ)**: phong cách mới **chưa mở lại trên trình duyệt/điện thoại thật**; cần chạy lại **§5 (U1–U8)** — đặc biệt **kiểm tra tương phản thực tế** (chữ nâu trên giấy kem, badge trạng thái) và **U5 (zoom 200%)**, **U7 (375×667 / 1280×800)**. Luồng người thân xem lịch trong M07 vẫn **chưa chạy thật với 2 tài khoản**. Lưu ý: `--shadow-*` giữ lại dưới dạng `none` để tương thích ngược nếu còn chỗ tham chiếu.

### 20/10/2026 — R7: đổi sang tông y tế (xanh dương + trắng + xanh lá), bỏ font serif

**Phản hồi người dùng** (đã chốt qua câu hỏi): phong cách kem/nâu/đỏ gạch ở R6 **không phù hợp** và **“nhiều chữ bị lỗi”**; muốn hướng **y tế** với tông **xanh dương + trắng + xanh lá**.

**Điều tra lỗi chữ trước khi sửa**: kiểm tra encoding toàn bộ `web/src/**/*.{ts,tsx,css}` — **không file nào** chứa ký tự thay thế U+FFFD; `index.css` đọc đúng UTF-8, tiếng Việt có dấu nguyên vẹn. Nghi vấn chính là **font serif** (Georgia/Times) không phủ đủ ký tự tiếng Việt ở một số kiểu chữ/cỡ chữ trên Windows → đã **bỏ hoàn toàn font serif**, dùng một font không chân (`system-ui`/`Segoe UI`/`Roboto`…) cho cả tiêu đề lẫn nội dung.

**Thay đổi**:

| Nhóm | Nội dung |
|---|---|
| Token màu | `--c-bg #f2f6fa` (nền xanh rất nhạt), `--c-surface #ffffff` (trắng), `--c-text #16232e`, `--c-muted #53646f`, `--c-border #d5dfe8`; **chính** `--c-primary #12659c` (xanh dương y tế), `--c-primary-dark #0d4d78`, `--c-primary-soft #e3eef7`; **phụ** `--c-accent #2e7d4f` (xanh lá y tế); success `#2e7d4f`, danger `#b3261e`, warning `#9a5b00` |
| Font | **Xoá `--font-serif`**, xoá hết 13 chỗ `var(--font-serif)`; `h1–h3`, `.section-title`, `.brand`, số liệu, `.segmented__item` đều dùng `--font-sans` (thêm `Arial` vào chuỗi fallback) |
| Hình dáng | Khôi phục bo góc 8/12/16px; **khôi phục bóng đổ nhẹ** (`--shadow-1`/`--shadow-2` có giá trị thật) cho cảm giác sạch, hiện đại |
| Bố cục | `.stat-grid`, `.trust-strip`, `.feature-grid` trở lại dạng **thẻ tách rời có bo góc + bóng nhẹ**; `.segmented` trở lại dạng **nút segmented** (bỏ gạch chân tab); badge trạng thái bo tròn 999px; `.progress` bo tròn 999px |
| Điểm nhấn | Landing có lại **hero nền chuyển sắc xanh nhạt**; `.greeting` (M01) có lại **nền gradient xanh dương** chữ trắng; `.now-card` viền vàng cảnh báo + bóng |

**File chính**: `web/src/index.css` (phần lớn), `web/src/components/{Button,Dialog,DoseRow,DueBanner}.tsx`, `web/src/screens/{M04,M07,M08}.tsx`.

**Kiểm chứng**: web **118/118** (15 file — số test không đổi), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**470,75 kB / gzip 142,98 kB**). Backend **không thay đổi**. Xác nhận dev server phục vụ bản mới: `index.css` có `#12659c`, **không còn** `Georgia`/`font-serif`.

**Chưa kiểm thử (ghi rõ)**: tông y tế mới **chưa mở lại trên trình duyệt/điện thoại thật**; cần xác nhận **lỗi chữ đã hết chưa** (đây là điểm người dùng báo, chỉ có thể xác nhận bằng mắt) và chạy lại **§5 (U1–U8)**: **U5 (zoom 200%)**, **U7 (375×667 / 1280×800)**, cùng kiểm tra tương phản. Luồng người thân xem lịch trong M07 vẫn **chưa chạy thật với 2 tài khoản**.

### 20/10/2026 — R8: M07 cảnh báo rõ cho người thân khi chủ hồ sơ chưa xác nhận

**Phản hồi người dùng**: sau khi chủ hồ sơ **không xác nhận thông báo uống thuốc quá 15 phút**, bên người thân **không thấy thông báo** và M07 **vẫn ghi “Đang chờ”**.

**Điều tra (đọc CSDL thật — chỉ đọc, đã xin phép)**: kết quả cho thấy **backend chạy đúng, không phải lỗi code**:

| Kiểm tra | Kết quả thật |
|---|---|
| Thiết bị | 2 thiết bị `status=active`, `notifications_enabled=true` (một của chủ hồ sơ, một của người thân) |
| Kết nối gia đình | 1 kết nối `status=active`, `permissions={view_schedule:true, manage_medication:false, relative_alerts:true}` |
| Nhật ký gửi | Có bản ghi `kind=relative_alert status=sent` cho lần uống `...aa07`, gửi lúc `05:52 UTC` (giờ uống `05:28 UTC`) — **đúng ngưỡng 15 phút** |

→ **Backend đã gửi push thành công** cho người thân. Việc không thấy thông báo nằm ở phía trình duyệt/hệ điều hành (tab đang mở, trung tâm thông báo Windows, Service Worker) — **không phải lỗi ứng dụng**.

**Hai điểm thật sự cần cải thiện (đã xử lý)**:

1. **“Đang chờ” là đúng thiết kế** — nhãn `pending` chỉ đổi thành “Quá giờ” sau **30 phút** và “Đã bỏ lỡ” sau **120 phút** (`doseService.ts`). Ở mốc 15–29 phút trạng thái vẫn là `pending`. **Không sửa** (sửa sẽ đụng luồng nghiệp vụ đã chốt).
2. **Người thân không thấy dấu hiệu nào trên giao diện** — M07 chỉ hiện “Đang chờ”, trông y hệt “chưa tới giờ”. **Đã thêm cảnh báo rõ**.

**Thay đổi (chỉ giao diện web, không đổi API/CSDL/luồng nghiệp vụ)**:

| File | Nội dung |
|---|---|
| `web/src/utils/doseStatus.ts` | Thêm `UNCONFIRMED_BY_OWNER_STATUSES`, `isUnconfirmedByOwner`, hằng `RELATIVE_ALERT_AFTER_MINUTES = 15` (khớp backend) và hàm `unconfirmedAlerts(doses, now, afterMinutes)` — chọn lần uống chưa xác nhận đã quá ngưỡng, tính mốc theo `snoozedUntil` nếu đã nhắc lại (giống `processDueNotifications` ở backend) |
| `web/src/components/RelativeUnconfirmedAlert.tsx` | **Mới** — khối cảnh báo `role="alert"`, liệt kê từng lần uống chưa xác nhận kèm giờ + trạng thái; câu khác nhau cho “hôm nay” và ngày đã qua |
| `web/src/screens/M07.tsx` | `RelativeSchedule` render `RelativeUnconfirmedAlert` ngay trên danh sách lần uống (chỉ khi người thân có `view_schedule`) |
| `web/src/index.css` | Thêm `.relative-alert`, `.relative-alert__head/__list/__hint` — viền đỏ trái, nền `--c-danger-soft` |

Luật hiển thị cảnh báo **khớp chính xác** luật gửi push ở backend (`UNCONFIRMED_STATUSES = pending/snoozed/overdue/missed` + ngưỡng 15 phút) → khi backend gửi thông báo thì giao diện cũng hiện cảnh báo, và ngược lại.

**Kiểm chứng**: web **126/126** (15 file; **+8 test mới**: 5 cho `unconfirmedAlerts`/`isUnconfirmedByOwner`, 3 cho M07 cảnh báo / đã xác nhận không cảnh báo / “Không thể uống” không cảnh báo), `oxlint` sạch, `tsc -b` sạch, `npm run build` OK (**472,12 kB / gzip 143,29 kB**). Backend **không thay đổi**.

**Chưa kiểm thử (ghi rõ)**: cảnh báo mới **chưa mở lại trên trình duyệt thật với 2 tài khoản** — cần chạy tay: chủ hồ sơ để một liều quá 15 phút không xác nhận → mở M07 bằng tài khoản người thân xem cảnh báo có hiện đúng. **Chưa điều tra được vì sao notification không hiện trên máy bạn** (nằm ngoài ứng dụng: tab đang mở / trung tâm thông báo Windows / Service Worker) — nếu vẫn cần, tôi sẽ hướng dẫn kiểm tra bằng DevTools.

### 20/10/2026 — R9: khu vực quản trị `/admin`

**Bối cảnh**: người dùng hỏi có nên có giao diện quản trị. Đối chiếu tài liệu: `API_SPEC.md` ghi admin “không có trong phạm vi”, nhưng README hứa tài khoản SĐT quên mật khẩu thì “liên hệ quản trị viên” — **không có công cụ nào tồn tại**. Người dùng chốt phạm vi **chỉ đọc + khóa/mở tài khoản + đặt lại mật khẩu**; duyệt thêm `users.role`, sau đó duyệt thêm `users.disabled_at`.

**Ranh giới**: `/admin` nằm **ngoài M01–M08**, không phải màn hình M09; không đổi luồng 8 màn hình; **không có xóa tài khoản** (Q4 chưa chốt). Không thêm thư viện.

**Backend**:

| File | Nội dung |
|---|---|
| `models/User.ts` | `role: 'user'\|'admin'` (mặc định `user`), `disabled_at: Date\|null` |
| `middlewares/auth.ts` | `authMiddleware` chặn tài khoản bị khóa bằng **403** trước khi gắn `req.user`; gắn `isAdmin`; thêm `requireAdminMiddleware` |
| `config/firebase.ts` | `setFirebaseUserDisabled`, `setFirebaseUserPassword`, `revokeFirebaseRefreshTokens`, `getFirebaseUserEmails` (1 lần/trang), `getFirebaseUserByEmail`, `isFirebaseReady` |
| `services/adminService.ts`, `routes/admin.ts` | Summary 24h; danh sách người dùng (tìm/phân trang, số đếm; **không** nội dung y tế); lỗi push; nhật ký; khóa/mở; đặt lại mật khẩu. Mọi thao tác ghi `audit_logs`, **không ghi mật khẩu** |
| `routes/users.ts` | `GET/PATCH /users/me` trả thêm `role` |
| `src/scripts/grantAdmin.ts` + `package.json` | `npm run admin:grant -- <email hoặc SĐT>` cấp admin đầu tiên; không có endpoint tự cấp |

**Web**: route `/admin` + layout riêng (không tab bar) trong `App.tsx`; `screens/Admin.tsx` (thanh tiêu đề có thời điểm cập nhật + “Tải lại”, tổng quan 8 thẻ số liệu, bố cục hai cột trên màn hình lớn, tìm kiếm + “Xóa lọc”, thẻ người dùng có avatar/badge trạng thái, phân trang, lỗi push, nhật ký, hộp thoại khóa/đặt lại mật khẩu); **nút “Quản trị hệ thống” cố định ở đầu trang, chỉ hiện khi `profile.role='admin'`** (đã bỏ khỏi M08); thêm types/endpoints admin; CSS `.admin-*` dùng token y tế.

**Kiểm chứng**: backend `tsc --noEmit` sạch + **146/146** test (9 suite; +24: 18 admin + 6 middleware R10–R15); web `tsc -b` sạch + oxlint sạch + **161/161** test (18 file; +12: 8 admin + 3 lối tắt + 1 tải lại) + build OK (**492,72 kB / gzip 147,69 kB**; CSS 24,32 kB / gzip 4,82 kB).

**Chưa kiểm thử (ghi rõ, không đánh dấu đạt)**: (1) chưa mở `/admin` trên trình duyệt thật; (2) các lời gọi **Firebase thật** cho khóa/mở/đặt lại mật khẩu/lấy email đang được **mock** trong test — cần chạy với service account thật; (3) chưa kiểm tra token cũ bị chặn 403 ngay và đăng nhập lại bị Firebase chặn; (4) chưa thử đặt lại mật khẩu tài khoản SĐT rồi đăng nhập lại. Kịch bản tay A8–A14 ở `TEST_PLAN.md` §7.18.

## Câu hỏi mới

- Cài đặt Git: bạn có muốn tôi hướng dẫn cài, hay tiếp tục không dùng Git?
- Firebase: bạn đã có tài khoản Google/Firebase để tạo dự án chưa? (cần cho Giai đoạn 2 phần xác thực thật)
