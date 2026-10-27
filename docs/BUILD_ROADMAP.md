# BUILD ROADMAP — Lộ trình thực thi

Chỉ bắt đầu khi người dùng ra lệnh BUILD rõ ràng. Mỗi giai đoạn: đọc tài liệu PLAN liên quan và OPEN_QUESTIONS.md → nêu kế hoạch ngắn (file tạo/sửa, thư viện cài, lệnh chạy) → chờ người dùng đồng ý nếu có thay đổi cấu hình/CSDL/thư viện mới → làm nhỏ, kiểm thử ngay → báo cáo theo mẫu ở mục dưới → dừng chờ duyệt.

Mỗi giai đoạn một nhánh Git riêng (`build/phase-N-...`), commit nhỏ. Không commit `.env`, khóa Firebase, token.

## Bảng tổng quan

| Giai đoạn | Nội dung | Nhãn | Phụ thuộc | Song song |
|---|---|---|---|---|
| 0 | Kiểm tra dự án hiện có (chỉ đọc) | — | Không | Không |
| 1 | Chốt kiến trúc, dữ liệu, API (tài liệu) | MVP | 0 | Không |
| 2 | Nền tảng kỹ thuật (backend + web khung) | MVP | 1 | Web và backend song song được |
| 3 | Thuốc, lịch uống, lần uống (backend) | MVP | 2 | Không |
| 4 | M04 → M05 → M03 → M01 → M02 → M06 | MVP | 3 | Tuỳ màn hình |
| 5 | Thông báo (Web Push) và M07 | MVP | 3, 4 | Push từ server trước, hiển thị trong trang sau |
| 6 | M08 và sức khỏe (đã chốt: tuân thủ) | MVP | 2, 5 | Bỏ qua chỉ số, ghi rõ |
| 7 | Kiểm thử tích hợp | MVP | 4, 5, 6 | Không |
| 8 | Hoàn thiện và bàn giao | MVP | 7 | Không |

**Mở rộng** (chỉ khi còn thời gian và được duyệt): quyền `manage_medication` cho người thân, thông báo người thân khi quên uống, giọng đọc, lịch sử phiên bản lịch chi tiết, chỉ số sức khỏe đầy đủ (đã loại khỏi phạm vi).

## Chi tiết từng giai đoạn

### Giai đoạn 0 — Kiểm tra dự án hiện có (chỉ đọc)

- Liệt kê cấu trúc, package.json, phiên bản Node/React, thư viện đang dùng.
- Kiểm tra backend, CSDL, Firebase (Authentication, FCM Web Push, credentials), cơ chế đăng nhập.
- **Đầu ra**: `docs/CURRENT_STATE.md` — hiện trạng, rủi ro, việc cần làm, câu hỏi mới.
- **Hoàn thành khi**: người dùng xác nhận báo cáo; chưa có thay đổi nào.
- *Ghi chú*: `D:\duong` trống — giai đoạn này xác nhận “không có dự án hiện có” và chốt khởi tạo mới.

### Giai đoạn 1 — Chốt kiến trúc, dữ liệu, API (MVP)

- Hoàn thiện ARCHITECTURE.md, DATABASE_PLAN.md (migration), API_SPEC.md.
- Chốt giá trị mặc định nghiệp vụ và đăng nhập (đã chốt: Firebase Email + Mật khẩu — Spark plan; CSDL MongoDB + Mongoose).
- Liệt kê biến môi trường cần có (không điền giá trị thật).
- **Hoàn thành khi**: người dùng duyệt; OPEN_QUESTIONS.md không còn mục chặn.

### Giai đoạn 2 — Nền tảng kỹ thuật (MVP)

**Backend**: khởi tạo Express + TypeScript; cấu hình môi trường; Mongoose + MongoDB (schema users, devices); middleware xác minh Firebase ID token (Firebase Admin) + map UID → user; middleware lỗi và response thống nhất; validation; `GET /health`, `POST /users/me/sync`, `GET/PATCH /users/me`.

**Web**: khởi tạo React + Vite + TypeScript; PWA (manifest + Service Worker); điều hướng responsive mobile-first (bottom tab ở viewport nhỏ); theme chữ lớn tương phản cao; lớp gọi API gắn token; xử lý lỗi mạng; khung rỗng M01–M08; luồng đăng nhập Firebase Email + Mật khẩu.

**Kiểm thử**: gọi API có/không token, token sai; đăng nhập và lấy profile từ backend thật.
**Hoàn thành khi**: trang chạy trên trình duyệt (devtools responsive + điện thoại thật), gọi backend thật có xác thực.

**Trạng thái — ✅ HOÀN THÀNH 20/10/2026**: đã kiểm chứng đầu-cuối với tài khoản Firebase thật (sync → profile → tạo thuốc → sinh lần uống → xác nhận → thống kê), tài khoản kiểm thử đã xóa. Chi tiết trong `CURRENT_STATE.md` (mục Nhật ký BUILD). Ba lỗi phát hiện khi kiểm chứng đã sửa: chặn tạo user lần đầu, JSON hỏng trả 500, lệch múi giờ khi sinh lần uống/lọc theo ngày.

### Giai đoạn 3 — Thuốc, lịch uống, lần uống (backend, MVP)

Thứ tự: bảng/API thuốc → lịch uống → dịch vụ sinh lần uống (khóa unique) → API lần uống (today, confirm, snooze, cannot-take) → máy trạng thái (atomic update) → lịch sử (lọc, phân trang) → thay đổi lịch (phiên bản).

**Kiểm thử bắt buộc**: B1–B17 trên CSDL thật.
**Hoàn thành khi**: test API và đơn vị máy trạng thái đạt.

**Trạng thái — ✅ HOÀN THÀNH 20/10/2026**: routes/services thuốc, lịch, lần uống, lịch sử, người thân + máy trạng thái + cron đã có; **52/52 test backend đạt**, phủ hết B1–B17. Hai quy tắc còn thiếu đã được cài:
- **B8** — nhắc lại không vượt quá 23:59 giờ địa phương (thêm `snoozeDenyReason`, `snoozeDose(…, tz, now)`).
- **B14** — đổi giờ lịch: xóa lần uống tương lai theo lịch cũ rồi sinh lại theo phiên bản mới (`regenerateScheduleDoses`), quá khứ giữ nguyên phiên bản cũ.
- **B15** — ngừng thuốc: xóa lần uống tương lai (`deleteFutureDosesForMedication`), giữ quá khứ; thuốc `discontinued`, lịch `archived`.
- **B3/B6/B16** — thêm test: sinh lần uống 7 ngày không trùng; confirm song song cùng `clientRequestId` chỉ ra một bản; thống kê `/doses/today` đúng ngày địa phương ở mốc 23:30–00:30.

**Ghi chú kỹ thuật**: `snoozeDose` và `confirmDose` nhận múi giờ người dùng (`users.timezone`); các hàm sinh/xóa lần uống nhận `now` để test được với đồng hồ cố định (không phụ thuộc giờ chạy test).

### Giai đoạn 4 — M01–M06 (MVP)

Thứ tự: **M04 → M05 → M03 → M01 → M02 → M06**. Mỗi màn hình: nối API thật; trạng thái tải/rỗng/lỗi/thử lại; chỉ báo thành công khi server xác nhận; nút lớn, nhãn trạng thái (không chỉ màu); kiểm tra responsive bằng devtools và trên điện thoại thật với cỡ chữ lớn.

**Trạng thái — ✅ HOÀN THÀNH (code + test tự động) 20/10/2026**: cả 6 màn hình đã nối API thật:
- **M04** — `GET /medications?status=`; ngừng thuốc có hộp thoại xác nhận → `POST /medications/:id/discontinue`.
- **M05** — tạo (`POST /medications`), sửa (`PATCH /medications/:id`), đổi giờ lịch đang hoạt động (`PUT /medications/schedules/:id`, có hộp thoại xác nhận), thêm giờ (`POST /medications/:id/schedules`), xóa giờ (`DELETE /medications/schedules/:id`). Route mới `/medications/:id/edit`.
- **M03** — `GET /doses?date=`, nhóm theo buổi, bấm dòng → M02.
- **M01** — `GET /doses/today`, thẻ “thuốc kế tiếp” + nút lớn “Đã uống thuốc” (`POST /doses/:id/confirm`, idempotent), thống kê, 4 nhóm buổi, lối tắt M03/M07.
- **M02** — `GET /doses/:id`; “Đã uống” / “Nhắc lại sau” / “Không thể uống” (hộp thoại lý do có sẵn + nhập tự do); chỉ báo thành công khi server trả 2xx; trạng thái đã kết thúc → chỉ đọc.
- **M06** — `GET /history?from=&to=&medicationId=&page=`, lọc theo thuốc, phân trang.
- **Nền tảng chung**: `services/endpoints.ts` (typed API), `utils/doseStatus.ts`, `components/Dialog.tsx`, `components/DoseRow.tsx`; `AuthProvider` nạp hồ sơ backend và cấp `timezone` cho mọi màn hình.
- **Ngoài kế hoạch (đã được người dùng duyệt)**: thêm 2 API `POST /medications/:id/schedules` và `DELETE /medications/schedules/:id` để M05 sửa được thêm/bớt giờ; làm giàu `GET /doses/:id` (kèm tên thuốc/liều/hướng dẫn cho M02); cho phép `PATCH /medications/:id` nhận `endDate: null`.
- **Kiểm thử tự động**: backend **57/57** (Jest) + web **62/62** (Vitest); `tsc --noEmit`/typecheck và lint sạch cả hai. Web build production OK. Đã chạy dev server thật: `/health` OK, proxy `/api/v1` qua Vite trả 401 khi thiếu token (đúng).
- **Chưa kiểm thử**: bấm tay trên trình duyệt/điện thoại thật với tài khoản Firebase thật cho từng màn hình (giai đoạn 7 sẽ làm đầy đủ) — hiện mới kiểm chứng qua test tự động + dev server.

### Giai đoạn 5 — Thông báo và M07 (MVP)

- **Web Push (server node-cron)**: lên lịch gửi push đúng giờ uống và các mốc snooze; hủy không gửi khi đã xác nhận/ngừng thuốc; xử lý token hết hạn (`registration-token-not-registered` → device `invalid`).
- **Service Worker + PWA**: đăng ký worker, xin quyền Notifications, hiển thị notification (actions: Đã uống / Nhắc lại sau / Không thể uống), bấm → mở M02 đúng lần uống; manifest PWA + hướng dẫn “Thêm vào màn hình chính” trên iOS.
- **Hiển thị trong trang**: trang đang mở → banner + âm thanh theo cài M08.
- FCM server-side: thử lại có giới hạn, chống trùng qua `notification_logs`.
- **M07**: mã mời có hạn, chấp nhận/từ chối, quyền xem, ngắt kết nối; kiểm tra quyền backend; thu hồi ngay; ghi log.
- **Kiểm thử**: N1–N9, S3–S7.

**Trạng thái — ✅ HOÀN THÀNH (code + test tự động) 20/10/2026**:
- **5A — Web Push phía server**: `services/notificationService.ts` — dựng nội dung push (data-only) cho 3 mốc `scheduled_reminder`/`snooze`/`overdue`; gửi tới mọi `devices` active; **thử lại có giới hạn** (3 lần, backoff 1s/5s/15s); **chống trùng** qua `notification_logs` (cùng dose+kind); token hỏng → device `invalid` + log `expired`; **bỏ qua** khi lần uống đã xác nhận/không thể uống hoặc thuốc đã ngừng. Job cron mỗi phút trong `jobs/scheduler.ts` (`processDueNotifications`), có cửa sổ chống “dội” thông báo cũ. `NotificationLog` bổ sung kind `overdue`, channel `fcm|in_app`.
- **5B — Đăng ký Web Push ở web**: `services/messaging.ts` (`enableWebPush` xin quyền → đăng ký SW → lấy token FCM bằng VAPID → `POST /users/devices/register`; `disableWebPush` khi đăng xuất + đóng notification); `sw.js` nhận payload FCM (dạng `data`), hiển thị actions **Đã uống / Nhắc lại sau / Không thể uống**, bấm → mở `/dose/:id?action=…`; M08 nối nút bật thông báo thật + hướng dẫn iOS “Thêm vào màn hình chính”.
- **5C — Hiển thị trong trang (N11)**: hook `useDueReminder` (poll `GET /doses/today` mỗi phút khi tab hiển thị + nhận push foreground) → `components/DueBanner.tsx` hiện banner + âm thanh (`utils/sound.ts`); “Đã uống” gọi `POST /doses/:id/confirm` rồi phát sự kiện `dose:changed` để các màn hình tự tải lại. M02 đọc `?action=confirm|snooze|cannot` do notification mở ra và tự thực hiện (một lần).
- **5D — M07 + phân quyền người thân**: M07 nối thật `/family/*` (tạo mã 6 chữ số + đếm ngược 15 phút, nhập mã, danh sách kết nối, bật/tắt quyền xem lịch, ngắt kết nối có xác nhận). Middleware `middlewares/familyAccess.ts` cho phép **đọc hộ** qua `?ownerId=` (cần quyền `view_schedule`, sai → 403) trên `GET /doses/today`, `GET /doses`, `GET /doses/:id`, `GET /medications`, `GET /medications/:id`, `GET /history`; ghi/sửa thuốc đòi `manage_medication` (MVP = false → 403).
- **Ngoài kế hoạch (đã được người dùng duyệt)**: thêm query `?ownerId=` cho API đọc/ghi thuốc + middleware phân quyền (xem API_SPEC mục 3.8) — cần thiết để người thân xem lịch theo PROJECT_PLAN mục 4.
- **Kiểm thử tự động**: backend **80/80** (Jest) + web **85/85** (Vitest); typecheck/lint sạch; web build production OK. Đã kiểm tra dev server thật: `/health` OK, `/api/v1/family/connections` trả 401 khi thiếu token (đúng).
- **Chưa kiểm thử**: **push thật** trên trình duyệt/thiết bị (cần VAPID key trong `web/.env` do người dùng tạo + trình duyệt thật) — N1–N10 chưa chạy; chỉ N11 và các luồng API có test tự động. Không đánh dấu “đạt” cho các kịch bản push chưa chạy.

### Giai đoạn 6 — M08 và sức khỏe (MVP)

- M08: cỡ chữ, nhắc lại, âm thanh (Web Speech đọc hướng dẫn nếu hỗ trợ), cấu hình thông báo người thân, hướng dẫn cấp quyền Notifications + “Thêm vào màn hình chính” trên iOS, đăng xuất an toàn (hủy token web).
- Sức khỏe: **đã chốt — giới hạn ở tuân thủ uống thuốc**; thống kê M01 + lịch sử M06 đáp ứng; không thêm chỉ số.

**Trạng thái — ✅ HOÀN THÀNH (code + test tự động) 20/10/2026**:
- **Tài khoản (M08)**: đổi **tên hiển thị** và **múi giờ** → `PATCH /users/me`; sau khi lưu gọi `refreshProfile()` để mọi màn hình dùng ngay múi giờ mới. Múi giờ lấy từ `Intl.supportedValuesOf('timeZone')` (không thêm thư viện), có danh sách dự phòng.
- **Cài đặt nhắc lại**: `PATCH /users/me/notification-settings` merge vào `users.preferences` (`snoozeMinutes` 5–30, `snoozeMax` 1–5). Backend **tuân theo** khi snooze: `snoozeDose` đọc `utils/preferences.ts` (`readSnoozeSettings`) thay cho hằng số cố định; giá trị sai/thiếu → mặc định 10 phút × 3 lần (giữ nguyên BUSINESS_RULES).
- **Âm thanh + giọng đọc**: công tắc âm thanh (`utils/sound.ts`) và công tắc giọng đọc (`utils/speech.ts`, mặc định TẮT); ẩn mục giọng đọc nếu trình duyệt không hỗ trợ `speechSynthesis`; `useDueReminder` đọc to tên thuốc + hướng dẫn khi đến giờ nếu bật.
- **Thông báo cho người thân (relative alerts)**: thêm quyền `relative_alerts` (mặc định bật) cho `family_connections.permissions`; M08 liệt kê các kết nối tôi là chủ hồ sơ, bật/tắt từng người. Khi lần uống chuyển `missed` → `notifyRelativeMissed` gửi push tới thiết bị người thân có `relative_alerts=true` (data-only), chống trùng theo `(dose_id, kind='relative_alert')`; job cron mỗi phút quét nhóm `missed` trong cửa sổ 30 phút.
- **Sức khỏe**: rà soát — chỉ tuân thủ uống thuốc; M01 (thống kê hôm nay) + M06 (lịch sử) đã đáp ứng; **không thêm mã/API/chỉ số mới**.
- **Ngoài kế hoạch (đã được người dùng duyệt)**: (1) cài đặt nhắc lại do người dùng chỉnh và backend tuân theo; (2) gửi push thật cho người thân khi bỏ lỡ (đúng NOTIFICATION_PLAN §3.4 — vốn ghi là “giai đoạn mở rộng”).
- **Kiểm thử tự động**: backend **94/94** (7 suite) + web **92/92** (13 file); typecheck/lint sạch; web build production OK.
- **Chưa kiểm thử**: push thật (relative alert + nhắc giờ) trên trình duyệt/thiết bị thật — thuộc Giai đoạn 7 (N1–N10).

### Giai đoạn 7 — Kiểm thử tích hợp (MVP)

- Chạy toàn bộ TEST_PLAN; lập bảng kết quả (đạt/không đạt/chưa kiểm thử + lý do).
- Sửa theo mức độ ưu tiên; chạy lại hồi quy.
- Không đánh dấu “đạt” cho test chưa chạy thật.

**Trạng thái — ✅ HOÀN THÀNH (phần chạy được ở môi trường dòng lệnh) 20/10/2026**:
- Đã chạy toàn bộ TEST_PLAN; bảng kết quả chi tiết ở `TEST_PLAN.md` §7: **45/47 đạt — 2/47 chưa kiểm thử — 0 không đạt** (xem §7.7–§7.11).
- **Test tự động**: backend **95/95** (7 suite) + web **99/99** (14 file); `tsc`/typecheck + lint sạch; web build production OK (455,35 kB / gzip 138,69 kB).
- **Smoke test API live** (`:3000`): `/health` 200; thiếu token → 401; route lạ → 404; JSON hỏng → 400.
- **E2E thật** (Firebase Auth + backend + MongoDB; tài khoản tạm tạo → dùng → **xoá sạch**): **23/23 bước đạt**, gồm các luồng live cho B4/B5/B9/B18 và S3/S4/S5 (đọc hộ, ghi hộ, ngắt kết nối).
- **Kiểm tra live S9**: bản ghi mã mời chỉ lưu `code_hash` SHA-256 (không có mã thô). **S8** rà soát mã: backend không có log request/token.
- **Phát hiện 5 lỗi thật khi người dùng chạy thao tác tay và đã sửa** (`TEST_PLAN.md` §7.7–§7.9): D1 đăng nhập lần đầu không tạo được bản ghi user (auth.tsx chỉ xử lý 404, backend trả 401) → mọi API 401; D2 hai tab sync đồng thời → 500; D3 M02 hiển thị sai cài đặt nhắc lại; D4 `sw.js` mất hành động khi `navigate` lỗi; D5 thiếu test cho `?action=snooze/cannot`. D1/D2 có test tái hiện **đỏ trước khi sửa**; hồi quy sau mỗi lần sửa đều sạch.
- **Không còn kịch bản “không đạt”**: N1 và N9 (chạy lại) đã đạt; N10 đạt (2 push cùng giây, Windows hiện lần lượt); N5, N8, U5, U7 đạt nhờ chạy tay (§7.8, §7.10).
- **Chưa kiểm thử (2)**: **N7** (iOS — cần HTTPS + “Thêm vào màn hình chính”), **N12** (push người thân — cần 2 tài khoản/thiết bị thật). VAPID key đã có trong `web/.env`.

**Thay đổi phạm vi giữa chừng (R1–R3 — người dùng yêu cầu và đã duyệt, xem `TEST_PLAN.md` §7.11)**: (R1) ngưỡng báo người thân chuyển từ “khi `missed` (2 giờ)” sang **“chưa xác nhận quá 15 phút”** (`RELATIVE_ALERT_AFTER_MINUTES=15`, mốc tính từ lần nhắc lại cuối); (R2) M07 thêm nút **quay lại**; (R3) người thân **xem được lịch uống (M03) và thuốc (M04) của chủ hồ sơ** ở chế độ chỉ xem, kèm sửa 2 lỗi liên quan (`GET /doses/:id` 404 với người thân → notification relative alert không mở được; M02 không có chế độ chỉ xem). **Không thêm màn hình mới** (vẫn đúng M01–M08). Sau thay đổi: backend **105/105**, web **108/108**, lint/typecheck/build sạch.

**Thay đổi phạm vi sau GĐ8 (R4 — người dùng yêu cầu và đã duyệt 20/10/2026)**: **đăng nhập bằng email HOẶC số điện thoại + đăng ký kèm SĐT & địa chỉ**.
- **Backend**: `users.address` (trường mới); `POST /users/me/sync` và `PATCH /users/me` nhận `phone`/`address`; `utils/profile.ts` chuẩn hoá SĐT VN (`+84…`/`84…`/khoảng trắng → `0xxxxxxxxx`, đầu số 03/05/07/08/09) và validate địa chỉ ≤ 200 ký tự. SĐT sai định dạng → 400; `""`/`null` = xoá.
- **Web**: ô đăng nhập **gộp một trường** “Email hoặc số điện thoại”; `services/firebase.ts` chuyển SĐT → **email nội bộ `<sđt>@med.local`** (Spark không có Phone Auth OTP SMS — đã chốt với người dùng); `utils/phone.ts` (chuẩn hoá dùng chung, giống hệt backend); form đăng ký thêm ô SĐT + địa chỉ (không bắt buộc, chuyển vào `POST /users/me/sync` lần đầu); **M08** hiển thị “Số điện thoại đăng nhập” khi tài khoản tạo bằng SĐT, thêm ô sửa SĐT/địa chỉ.
- **Không thêm màn hình mới** (đăng nhập/đăng ký vẫn là bước hệ thống trước M01).
- **Đánh đổi đã chốt**: SĐT **không được xác thực thật**; tài khoản tạo bằng SĐT **không tự khôi phục mật khẩu** được (phải liên hệ admin) — ghi rõ trong README mục Giới hạn.
- **Kiểm thử**: backend **122/122** (8 suite, thêm `userProfile.test.ts` 17 test) + web **149/149** (17 file, thêm `phone.test.ts` + `firebaseAuth.test.ts`); typecheck/lint/build sạch; web build production OK.
- **Nhánh**: `build/feature-auth-phone`.

### Giai đoạn 8 — Hoàn thiện và bàn giao (MVP)

- README cài đặt và chạy (backend, web, CSDL, Firebase); `.env.example` không chứa giá trị thật.
- Hướng dẫn tạo dự án Firebase, hướng dẫn kiểm thử.
- Danh sách giới hạn đã biết (độ tin cậy Web Push, iOS cần PWA để nhận push).
- Rà soát mã không để lộ bí mật; kiểm tra theo README trên thư mục sạch.

**Trạng thái — ✅ HOÀN THÀNH 20/10/2026**:
- **Git đã có trên máy** (Git 2.55.0 cài qua winget) — repo khởi tạo tại gốc, nhánh `main` chứa trạng thái GĐ0–7, công việc GĐ8 trên nhánh `build/phase-8-hoan-thien-ban-giao`. Quy tắc nhánh/commit của PLAN từ nay áp dụng được.
- **`.env.example`**: bổ sung `RELATIVE_ALERT_AFTER_MINUTES` (trước đây chỉ có trong `.env` thật); rà soát cả backend và web — chỉ chứa giá trị mẫu, không có bí mật.
- **Quét bí mật**: `git grep` tìm API key (`AIza…`), khối private key (`BEGIN PRIVATE KEY`), email service account (`firebase-adminsdk-…`) trong mã đã commit → **không có kết quả thật**, chỉ có tên biến.
- **README cập nhật**: số test đúng (backend 105, web 126), màn hình đã nối API thật (thay ghi chú “khung”), Web Push đã cài (GĐ5), Git đã có, bổ sung mục giới hạn đã biết (45/47 TEST_PLAN đạt) + mục Git.
- **Kiểm thử**: chạy lại toàn bộ sau khi sửa — backend **105/105**, web **126/126**, `tsc`/lint sạch, web build production OK (472,12 kB / gzip 143,29 kB).

**Còn lại sau bàn giao (không thuộc phạm vi tự động hoá)**: 2 kịch bản push cần thiết bị/tài khoản thật (**N7** iOS, **N12** người thân); xoay/xóa khóa service account cũ trên Firebase Console nếu nghi ngờ lộ.

### Bổ sung sau Giai đoạn 8 — R9: khu vực quản trị `/admin` (20/10/2026)

**Ngoài roadmap gốc, do người dùng yêu cầu và đã duyệt**: khu vực hậu trường **không phải M09**, chỉ đọc + khóa/mở tài khoản + đặt lại mật khẩu. Thay đổi CSDL đã duyệt: `users.role`, `users.disabled_at`.

- **Backend**: `models/User.ts`, `middlewares/auth.ts` (chặn tài khoản khóa + `requireAdminMiddleware`), `config/firebase.ts` (disabled/password/revoke/email batch), `services/adminService.ts`, `routes/admin.ts`, mount `/api/v1/admin`, script `src/scripts/grantAdmin.ts` + `npm run admin:grant`.
- **Web**: route `/admin` + `screens/Admin.tsx`, link trong M08 chỉ khi `role='admin'`, types/endpoints, CSS `.admin-*`, test `admin.test.tsx`.
- **Tài liệu**: API_SPEC §2.9, DATABASE_PLAN §3.1 + migration 006, BUSINESS_RULES §8, INTERFACE_SPEC (khu vực `/admin`), TEST_PLAN §7.18 (A8–A14), CURRENT_STATE R9.
- **Kiểm thử**: backend **146/146**, web **164/164**, typecheck/lint sạch, build web OK. **Chưa chạy Firebase thật** cho khóa/mở/đặt lại mật khẩu (test mock) và **chưa mở `/admin` trên trình duyệt thật** — xem TEST_PLAN §7.18.
- **Không làm**: xóa tài khoản (Q4), phân quyền admin chi tiết hơn (nhiều cấp), xem nội dung y tế.

## Phụ thuộc giữa các giai đoạn

| Giai đoạn | Phụ thuộc | Song song |
|---|---|---|
| 0 | Không | Không |
| 1 | 0 | Không |
| 2 | 1 | Backend / web song song |
| 3 | 2 | Không |
| 4 | 3 | Màn hình làm tuần tự |
| 5 | 3, 4 | Push từ server trước, hiển thị trong trang sau |
| 6 | 2 (M08), 5 (cài đặt nhắc) | Sức khỏe chỉ duyệt |
| 7 | 4, 5, 6 | Không |
| 8 | 7 | Không |

## Mẫu báo cáo cuối mỗi giai đoạn

1. **Đã hoàn thành**: liệt kê theo tính năng, kèm file chính liên quan.
2. **Chưa hoàn thành**: và lý do.
3. **Kiểm thử đã chạy**: tên kịch bản, kết quả thật; chưa chạy ghi rõ.
4. **Lỗi đã biết và rủi ro**.
5. **Thay đổi ngoài kế hoạch** (nếu có) và lý do.
6. **Câu hỏi cần người dùng duyệt** trước giai đoạn kế tiếp.

## Khi gặp sự cố trong lúc BUILD

- Thư viện lỗi/không tương thích: báo cáo nguyên nhân + 1–2 phương án, không tự đổi công nghệ chính.
- Yêu cầu mâu thuẫn/thiếu: ghi OPEN_QUESTIONS.md, dừng phần bị ảnh hưởng, làm tiếp phần không bị ảnh hưởng.
- Test không chạy được (thiếu thiết bị/tài khoản): ghi rõ “chưa kiểm thử”, không suy diễn là đạt.
- Nguy cơ mất dữ liệu: dừng ngay và hỏi trước khi tiếp tục.
- Phát hiện ý tưởng hay ngoài phạm vi: ghi vào mục “đề xuất mở rộng” của báo cáo, không tự làm.

---

## Điểm cần duyệt

1. Thứ tự giai đoạn và phụ thuộc ở bảng tổng quan.
2. Nhãn MVP/mở rộng.
3. Điều kiện chuyển giai đoạn: chỉ khi đạt hoàn thành và được người dùng duyệt.
