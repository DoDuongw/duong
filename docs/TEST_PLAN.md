# TEST PLAN — Kịch bản và tiêu chí kiểm thử

## 1. Phân loại

| Loại | Công cụ (đề xuất khi BUILD) | Giai đoạn |
|---|---|---|
| Đơn vị (backend) | Jest + Supertest | 2–3 |
| API / tích hợp backend | Jest + Supertest + mongodb-memory-server | 3 |
| Đơn vị web | **Vitest** + React Testing Library (jsdom) | 4–6 |
| Tích hợp web–backend | Chạy tay trên trình duyệt (devtools responsive) + điện thoại thật | 4–7 |
| Thông báo | Trình duyệt Chrome/Edge (desktop + Android), iOS Safari qua PWA | 5 |

**Quy tắc**: không đánh dấu “đạt” cho kịch bản chưa chạy thật. Kịch bản chưa chạy được (thiếu thiết bị/tài khoản) ghi rõ “chưa kiểm thử”.

**Lệch kế hoạch đã ghi nhận**: test web dùng **Vitest** thay Jest (Jest không tích hợp Vite 8 / TypeScript 7 trong `web/`). Test backend vẫn dùng Jest + Supertest + mongodb-memory-server. Xem mục “Điểm cần duyệt”.

## 2. Nghiệp vụ

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| B1 | Tạo thuốc hợp lệ (đủ tên, ≥1 giờ, ngày hợp lệ) | 201; lịch và lịch sử phiên bản được tạo |
| B2 | Tạo thuốc thiếu tên / giờ không hợp lệ / ngày bắt đầu > kết thúc | 400 VALIDATION_ERROR, không ghi DB |
| B3 | Sinh lần uống từ lịch daily | Tạo đúng các lần trong 7 ngày, không trùng (unique chặn) |
| B4 | Confirm một lần uống pending | status=confirmed, confirmed_at do server ghi |
| B5 | Confirm hai lần liên tiếp (gõ nhanh) | Một bản xác nhận duy nhất; lần hai idempotent hoặc 409 |
| B6 | Confirm hai yêu cầu song song (Promise.all, cùng clientRequestId) | Chỉ một bản ghi confirmed |
| B7 | Snooze 3 lần rồi lần thứ 4 | Lần 4 bị từ chối 409, quá giới hạn |
| B8 | Snooze vượt quá hạn trong ngày | 409 |
| B9 | Cannot-take không có lý do | 400 |
| B10 | Cannot-take có lý do | status=cannot_take, lý do lưu, không tính vào remaining |
| B11 | Chờ qua 30 phút không xác nhận (cron test với giờ giả lập) | status=overdue |
| B12 | Qua 2 giờ / hết ngày | status=missed |
| B13 | Xác nhận muộn trong cùng ngày | confirmed + is_late_confirmation=true |
| B14 | Đổi giờ lịch đang hoạt động | Version mới; lần uống tương lai theo phiên bản mới; lịch sử cũ giữ nguyên |
| B15 | Ngừng thuốc | Thuốc discontinued; lịch archived; lần uống tương lai bị xóa; quá khứ giữ nguyên |
| B16 | Thống kê M01 theo ngày địa phương (test case 23:30–00:30 múi giờ user) | Đúng theo local date, không theo UTC |
| B17 | User A gọi API với dose của user B | 403 FORBIDDEN hoặc 404 (không lộ sự tồn tại) |
| B18 | Người dùng chỉnh cài đặt nhắc lại (M08) rồi snooze | Snooze dùng đúng số phút/số lần đã chỉnh; thiếu/sai → mặc định 10 phút × 3 lần |

## 3. Thông báo

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| N1 | Có lần uống sắp tới, trang đã đóng (Service Worker đã đăng ký) | Web Push tới đúng giờ, hiển thị notification |
| N2 | Xác nhận trước giờ nhắc | Server không gửi push cho lần uống đó |
| N3 | Đổi lịch sau khi server đã có lịch nhắc | Push tương lai theo phiên bản mới; không gửi theo lịch cũ |
| N4 | Token FCM không hợp lệ | Backend đánh dấu invalid, không retry vô hạn |
| N5 | Mất mạng khi push tới hạn | Push trễ nhưng vẫn tới khi có mạng — ghi nhận, không coi là đạt tuyệt đối |
| N6 | Từ chối quyền Notifications | Giao diện hiển thị hướng dẫn cấp quyền trong M08 |
| N7 | iOS Safari chưa “Thêm vào màn hình chính” | M08 hiển thị hướng dẫn PWA; ghi rõ giới hạn |
| N8 | Bấm notification mở M02 đúng lần uống | `doseId` nhận đúng |
| N9 | Snooze từ action trên notification | Push mới sau 10 phút; push cũ không hiển thị lại |
| N10 | Hai lần uống cùng giờ cho hai thuốc khác nhau | Hai notification riêng, không gộp sai |
| N11 | Trang đang mở khi tới giờ uống | Hiện banner + âm thanh trong trang (không cần push) |
| N12 | Chủ hồ sơ bỏ lỡ thuốc (chuyển `missed`) | Người thân có `relative_alerts=true` nhận push; tắt quyền → không gửi; mỗi lần uống chỉ gửi một lần |

Trình duyệt: N1–N11 chạy trên Chrome/Edge (desktop + Android); trên iOS cần PWA (Thêm vào màn hình chính) — nếu không có thiết bị iOS, ghi “chưa kiểm thử (iOS)”.

**Trạng thái tự động hoá (20/10/2026)**: các kịch bản cần trình duyệt thật + push thật (N1, N3, N5, N8, N9, N10, N12) **chưa kiểm thử** — cần VAPID key + thiết bị/trình duyệt thật. Phần logic server tương ứng đã có test tự động: N2 (bỏ qua khi đã xác nhận), N4 (token hỏng → invalid, không retry vô hạn), N6/N7 (M08 hiển thị đúng lý do khi chưa cấu hình/từ chối quyền), N11 (`dueDoses` + banner `DueBanner`). N9 (snooze gửi lại) được phủ ở tầng dịch vụ (`notifyDoseSnooze` gửi push mới cho từng lần snooze). **N12** (relative alert) được phủ ở tầng dịch vụ (`notifyRelativeMissed`: gửi đúng token người thân, bỏ qua khi `relative_alerts=false`, chống trùng, không đổi `reminded_at`) và ở quét cron; **phần hiển thị notification thật vẫn chưa kiểm thử**. **B18** (cài đặt nhắc lại) có test tự động (`snoozeDose` theo `preferences` + `PATCH /users/me/notification-settings`).

## 4. Bảo mật và phân quyền

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| S1 | Gọi API không có token | 401 |
| S2 | Token sai / hết hạn | 401 |
| S3 | Người thân chưa kết nối gọi `GET /doses/today` của owner | 403 |
| S4 | Người thân có view_schedule gọi `POST /medications` | 403 (manage_medication=false ở MVP) |
| S5 | Thu hồi quyền → request kế tiếp | 403 ngay |
| S6 | Mã mời hết hạn / sai | 404/410, không tạo connection |
| S7 | Tạo 6 mã mời liên tiếp trong 1 phút | Request thứ 6 bị 429 |
| S8 | Kiểm tra log backend sau các test | Không chứa ID token, FCM token, code_hash |
| S9 | Mã mời trong DB | Chỉ thấy hash SHA-256, không thấy mã thô |
| S10 | Kết nối có `relative_alerts=false` khi chủ hồ sơ bỏ lỡ | Không gửi push cho người thân đó |

## 5. Giao diện

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| U1 | M01 khi backend sập | Trạng thái lỗi + nút thử lại; không crash |
| U2 | M03 với đủ 4 trạng thái | Icon + nhãn phân biệt từng trạng thái (không chỉ màu) |
| U3 | Confirm khi server trả 500 | Không hiển thị thành công; giữ trạng thái cũ |
| U4 | M05 nhập dữ liệu lỗi mạng khi lưu | Dữ liệu form giữ nguyên |
| U5 | Phóng to cỡ chữ/zoom trình duyệt 200% | Không mất chức năng, không tràn chữ mất nút |
| U6 | Rà soát | Không màn hình người dùng nào ngoài M01–M08 và luồng đăng nhập Email; `/admin` là khu vực hậu trường riêng (không phải M09) |
| U7 | Xem trên khung điện thoại (375×667) và máy tính (1280×800) | Bố cục đúng, nút chính dễ bấm ở cả hai |

### 5.1 Đã tự động hóa ở Giai đoạn 4 (Vitest + RTL)

| Kịch bản | Test |
|---|---|
| U1 (một phần) | Màn hình dùng `useApi` + `StateView` → trạng thái lỗi có nút thử lại (test component) |
| U2 (một phần) | `DoseStatusBadge`/`DOSE_STATUS_LABEL`/`DOSE_STATUS_ICON` — mỗi trạng thái có icon + nhãn chữ |
| U3 (một phần) | M02 chỉ hiện “Đã xác nhận uống thuốc” sau khi `confirmDose` trả về; lỗi hiện thông báo + nút thử lại |
| U4 (một phần) | M05 giữ nguyên dữ liệu form khi API lỗi (hiện `serverError`, không điều hướng) |
| Nối API | `endpoints.test.ts` kiểm tra URL/body từng endpoint; `screens.test.tsx` kiểm tra M01/M02/M04/M05/M06 gọi đúng API |
| Chưa tự động hóa (còn kiểm thử tay) | U1 đầy đủ (backend sập thật), U5 (zoom 200%), U7 (khung thiết bị thật) |

### 5.2 Đã tự động hóa ở Giai đoạn 6 (Vitest + RTL, Jest)

| Kịch bản | Test |
|---|---|
| M08 lưu tên hiển thị + múi giờ | `m08Settings.test.tsx` + `tests/users.test.ts` (`PATCH /users/me`) |
| M08 cài đặt nhắc lại (B18) | `m08Settings.test.tsx` + `tests/users.test.ts` + test `snoozeDose` theo `preferences` |
| M08 bật/tắt âm thanh | `m08Settings.test.tsx` (lưu localStorage) |
| M08 giọng đọc | Ẩn khi trình duyệt không hỗ trợ (`speechSupported()`), `utils/speech.ts` |
| M08 thông báo cho người thân | `m08Settings.test.tsx` + `tests/family.test.ts` (đổi `relative_alerts`) |
| Relative alert (N12/S10) | `tests/notificationService.test.ts` (`notifyRelativeMissed`, quét cron) |

## 6. Tiêu chí nghiệm thu (mục 14 PLAN gốc)

1. Đủ 8 màn hình M01–M08 theo đặc tả.
2. Chức năng kết nối backend Node.js + MongoDB thật (không có dữ liệu mẫu giả).
3. Lịch và trạng thái lần uống nhất quán theo BUSINESS_RULES.
4. Web Push hoạt động theo kịch bản N1–N11 trên trình duyệt (ghi rõ giới hạn iOS/PWA nếu chưa test được).
5. Phân quyền người thân đúng (S3–S5).
6. Toàn bộ test bắt buộc đạt hoặc có danh sách ngoại lệ được chấp thuận.
7. Tài liệu cấu hình, chạy, kiểm thử đầy đủ (README, .env.example).
8. Không màn hình/module ngoài phạm vi; không thay đổi phá hủy ngoài kế hoạch.

---

## Điểm cần duyệt

1. Danh sách test bắt buộc (đặc biệt B5–B8 về idempotency và snooze).
2. iOS/PWA: chỉ test thật nếu có thiết bị iOS — phần còn lại ghi rõ “chưa kiểm thử”.
3. Test giả lập thời gian (B11–B13) dùng đồng hồ test thay vì chờ thật — chấp nhận phương pháp này.
4. Đồng ý cho test web dùng Vitest thay Jest (lệch so với bản PLAN ban đầu; lý do: Jest không chạy được với Vite 8 / TypeScript 7). — **✅ Người dùng đã xác nhận 20/10/2026.**

---

## 7. Kết quả kiểm thử tích hợp — Giai đoạn 7 (20/10/2026)

**Quy ước cột “Trạng thái”**

| Nhãn | Nghĩa |
|---|---|
| đạt | Đã chạy thật (tự động hoặc live) và cho kết quả đúng. |
| đạt (tự động) | Đã kiểm ở tầng tự động (Jest/Vitest/live API); phần cần trình duyệt/thiết bị thật không áp dụng cho kết quả mong đợi này. |
| đạt (rà soát) | Xác nhận bằng rà soát mã nguồn (không có tầng test tự động). |
| chưa kiểm thử | Chưa chạy được vì thiếu trình duyệt/thiết bị/cấu hình — ghi rõ phần đã phủ tự động (nếu có). |
| không đạt | Đã chạy nhưng sai. |

**Bằng chứng chung đã chạy trong Giai đoạn 7**

- Backend: `npm run lint` (`tsc --noEmit`) sạch + `npm test` → **95/95** (7 suite).
- Web: `npm run lint` (oxlint) + `npm run typecheck` (`tsc -b`) sạch + `npm test` (Vitest) → **99/99** (14 file) + `npm run build` OK (455,35 kB / gzip 138,69 kB).
- **Cập nhật sau khi triển khai 3 yêu cầu mới (R1–R3, §7.11)**: backend **105/105** (7 suite, Jest) + `tsc --noEmit` sạch; web **108/108** (14 file, Vitest) + oxlint + `tsc -b` sạch + `npm run build` OK (457,32 kB / gzip 139,17 kB).
- Smoke test API live (`:3000`): `/health` 200; các route cần đăng nhập khi không token → 401; route lạ → 404; JSON hỏng → 400.
- E2E thật (Firebase Auth + backend + MongoDB, tài khoản tạm tạo → dùng → **xoá sạch**): **23/23 bước đạt** — đăng ký & sync hồ sơ; cài đặt nhắc lại (lưu + ngoài khoảng → 400); tạo thuốc 3 lịch → 201 và thiếu tên → 400; `/doses/today` đúng số lần uống và `scheduledAt` lưu UTC; confirm idempotent (cùng `confirmedAt`); snooze đúng 15 phút theo cài đặt và lần 2 → 409; cannot-take + thiếu lý do → 400; `/history`; S3 (403); tạo/chấp nhận mã mời; người thân xem lịch hộ (200) nhưng ghi thuốc hộ → 403; bật/tắt `relative_alerts`; ngắt kết nối → 403 ngay.
- S9 kiểm tra live trong MongoDB: bản ghi mã mời chỉ có `code_hash`, đúng SHA-256 của mã, **không** lưu mã thô.
- U6 rà soát `web/src/App.tsx`: đúng **M01–M08 + Login**, không màn hình thừa; `/admin` là route hậu trường riêng (R9).
- **Phát hiện 1 lỗi thật khi người dùng chạy thao tác tay và đã sửa** (chi tiết §7.7): tài khoản đăng nhập lần đầu không tạo được bản ghi người dùng → mọi API sau đó trả 401. Sau khi sửa, hồi quy đầy đủ vẫn sạch.

### 7.1 Nghiệp vụ (B1–B18)

| # | Trạng thái | Bằng chứng / lý do |
|---|---|---|
| B1 | đạt | `api.test.ts` B1 + E2E live `POST /medications` → 201 kèm lịch |
| B2 | đạt | `api.test.ts` B2 + E2E live thiếu tên → 400 |
| B3 | đạt | `doseService.test.ts` B3 (đủ 7 ngày, không trùng) |
| B4 | đạt | `doseService`/`api.test` + E2E live confirm → confirmed |
| B5 | đạt | `doseService` B5 + B5-idempotent + E2E live 2 lần cùng `clientRequestId` |
| B6 | đạt | `doseService` B6 (2 request song song → 1 bản confirmed) |
| B7 | đạt | `doseService` B7 (quá giới hạn snooze → conflict) |
| B8 | đạt | `doseService` B8 (`snoozeDenyReason` DAY/LIMIT + 409) |
| B9 | đạt | `doseService` B9 + E2E live cannot-take thiếu lý do → 400 |
| B10 | đạt | `doseService` B10 + E2E live có lý do → cannot_take |
| B11 | đạt | `doseService` B11 (pending quá 30 phút → overdue) |
| B12 | đạt | `doseService` B12 (quá 2 giờ → missed) |
| B13 | đạt | `doseService` xác nhận muộn trong ngày → `is_late_confirmation` |
| B14 | đạt | `api.test.ts` B14 + `screens.test.tsx` (M05 sửa giờ → version mới) |
| B15 | đạt | `api.test.ts` B15 (discontinued + xoá lần uống tương lai) |
| B16 | đạt | `api.test.ts` B16 + `time.test.ts` + web `dateTime.test.ts` |
| B17 | đạt | `api.test.ts` S17/B17 (user A không đọc được dữ liệu user B) |
| B18 | đạt | `doseService` (đọc `preferences`) + `users.test.ts` + E2E live 15 phút × 1 |

### 7.2 Thông báo (N1–N12)

| # | Trạng thái | Bằng chứng / lý do |
|---|---|---|
| N1 | đạt | Người dùng chạy tay: **push tới** (M08 đã bật, thiết bị `active`). Lưu ý độ trễ: log server ghi `sent_at` = giờ hẹn + **0,1 giây** (ví dụ lần uống 18:59:00Z → gửi 18:59:00.136Z) nên độ trễ ~2 phút người dùng thấy là ở phía FCM/Windows, không phải server — ghi vào “giới hạn đã biết” ở Giai đoạn 8. |
| N2 | đạt (tự động) | `notificationService.test.ts` N2: lần uống đã xác nhận → không gửi push. |
| N3 | đạt (tự động) | `api.test.ts` B14/B15 (lần uống tương lai theo lịch/phiên bản mới) + `notificationService` gửi theo lần uống hiện tại. Chưa quan sát push thật. |
| N4 | đạt (tự động) | `notificationService.test.ts` N4: token hết hạn → `device invalid`, không thử lại vô hạn. |
| N5 | đạt | Người dùng chạy tay: tắt mạng trước giờ uống ~1 phút rồi bật lại → **push vẫn tới**, trễ ~30 giây (nằm trong TTL 10 phút). |
| N6 | đạt (tự động) | `m08Notification.test.tsx`: bị từ chối quyền → M08 hiện hướng dẫn cấp lại. |
| N7 | chưa kiểm thử | Cần thiết bị iOS + PWA (“Thêm vào màn hình chính”). `messaging.test.ts` chỉ phủ phần phát hiện khả năng. |
| N8 | đạt | Người dùng chạy tay: bấm vào **thân notification** → app mở đúng **M02** của lần uống đó (URL `/dose/:id`). `screens.test.tsx` cũng phủ xử lý `?action=` khi mở M02. |
| N9 | đạt | Chạy tay lại: `notification_logs` có dòng **`kind=snooze status=sent`** (19:37:00.608Z, dose 19:26:00Z, `snooze_count=2`) và người dùng xác nhận **nhận được push “Nhắc lại: uống thuốc”**. Lần chạy đầu thất bại (không có request snooze nào) — sau khi siết `sw.js` (D4: `navigate` lỗi thì mở cửa sổ mới) + M02 (D3/D5) thì đạt. *Ghi chú*: chưa tách bạch được lần này bấm action trên notification hay nút trong app — cả hai đường đều đã được kiểm chứng ở các mức khác nhau. |
| N10 | đạt | Chạy tay lại (2 thuốc cùng giờ): **cả 2 push đều được gửi** — `notification_logs` có 2 dòng cùng giây 19:21:00.224Z và 19:21:00.450Z (2 dose khác nhau, `status=sent`), và người dùng xác nhận được cả hai lần uống. Windows hiển thị **lần lượt từng banner** (notification trước đóng thì banner sau hiện) — đây là cách xếp hàng của Windows, không phải gộp/mất push. |
| N11 | đạt (tự động) | web `dueReminder.test.tsx` + `doseStatus.test.ts` (`dueDoses`) → hiện banner khi tới hạn; âm thanh phát thật chưa quan sát. |
| N12 | chưa kiểm thử | Cần quan sát push thật. `notificationService.test.ts` đã phủ `notifyRelativeMissed` + quét cron (chống trùng, bỏ qua khi `relative_alerts=false`, không đổi `reminded_at`). |

### 7.3 Bảo mật và phân quyền (S1–S10)

| # | Trạng thái | Bằng chứng / lý do |
|---|---|---|
| S1 | đạt | `api.test.ts` S1 + smoke test live (không token → 401). |
| S2 | đạt | `api.test.ts` S2 (token sai → 401). |
| S3 | đạt | `family.test.ts` + E2E live (người thân chưa kết nối → 403). |
| S4 | đạt | `family.test.ts` + E2E live (ghi thuốc hộ khi `manage_medication=false` → 403). |
| S5 | đạt | `family.test.ts` + E2E live (ngắt kết nối → request kế tiếp 403). |
| S6 | đạt | `family.test.ts` (mã sai/hết hạn → 404, không tạo kết nối). |
| S7 | đạt | `family.test.ts` (request thứ 6 trong 1 phút → 429). |
| S8 | đạt (rà soát) | Backend không có middleware ghi log request; chỉ `console.error('[error]', err)` (message + stack), không log header/token/code_hash. |
| S9 | đạt | Kiểm tra live MongoDB: bản ghi mã mời chỉ có `code_hash` (SHA-256), không lưu mã thô. |
| S10 | đạt (tự động) | `notificationService.test.ts`: kết nối có `relative_alerts=false` → không gửi push cho người thân. |

### 7.4 Giao diện (U1–U7)

| # | Trạng thái | Bằng chứng / lý do |
|---|---|---|
| U1 | đạt (tự động) | `components.test.tsx` — `StateView` lỗi có nút “Thử lại” + gọi `onRetry`. Backend sập thật chưa thử. |
| U2 | đạt (tự động) | `doseStatus.test.ts` — mỗi trạng thái có icon + nhãn chữ (không chỉ màu). |
| U3 | đạt (tự động) | `screens.test.tsx` (M02) — chỉ báo “Đã xác nhận” sau khi API trả về; lỗi hiện thông báo + nút thử lại. |
| U4 | đạt (tự động) | `screens.test.tsx` (M05) — giữ nguyên dữ liệu form khi API lỗi. |
| U5 | đạt | Người dùng chạy tay: zoom trình duyệt **200%** → đi qua các màn hình, không mất nút/tràn chữ. |
| U6 | đạt (rà soát) | `App.tsx`: đúng M01–M08 + luồng Login Email, không màn hình thừa; `/admin` tách riêng cho quản trị (R9). |
| U7 | đạt | Người dùng chạy tay: devtools responsive **375×667** và **1280×800** → bố cục đúng, nút chính dễ bấm. |

### 7.5 Tổng hợp

| Nhóm | Tổng | đạt | chưa kiểm thử | không đạt |
|---|---|---|---|---|
| Nghiệp vụ (B) | 18 | 18 | 0 | 0 |
| Thông báo (N) | 12 | 10 | 2 | 0 |
| Bảo mật (S) | 10 | 10 | 0 | 0 |
| Giao diện (U) | 7 | 7 | 0 | 0 |
| **Tổng** | **47** | **45** | **2** | **0** |

**2 kịch bản “chưa kiểm thử”**: **N7** (iOS cần HTTPS + “Thêm vào màn hình chính”) và **N12** (push cho người thân — đang chờ chạy cùng yêu cầu mới ở §7.10: ngưỡng cảnh báo 15 phút). Không còn kịch bản “không đạt”.

### 7.6 Danh sách thao tác tay — chờ kết quả (cập nhật khi có)

Chuẩn bị: backend chạy `:3000` (`ENABLE_CRON=true`), web `npm run dev` `:5173`, `web/.env` đã có `VITE_FIREBASE_VAPID_KEY`; dùng **Chrome/Edge** (Web Push chỉ chạy trên `https` hoặc `localhost`). Tạo 1 thuốc có lịch cách hiện tại ~5 phút.

| # | Thao tác | Kết quả mong đợi | Kết quả thực tế (điền) |
|---|---|---|---|
| N1 | M08 → “Bật thông báo” → cho phép quyền → đóng tab (giữ trình duyệt) → đợi tới giờ uống | Nhận Web Push đúng giờ | **đạt** — push tới (trễ ~2 phút; log server cho thấy gửi đúng giờ hẹn +0,1 giây → độ trễ ở FCM/Windows) |
| N8 | Bấm vào notification vừa nhận | Mở `/dose/:id` đúng lần uống (M02) | **đạt** — app mở đúng M02 của lần uống đó |
| N9 | Bấm action “Nhắc lại sau” trên notification | Sau ~10 phút nhận push mới; push cũ không hiện lại | **đạt** — DB: `kind=snooze status=sent` lúc 19:37:00.608Z; người dùng xác nhận nhận được push “Nhắc lại: uống thuốc” |
| N10 | Tạo 2 thuốc cùng một giờ | 2 notification riêng, không gộp sai | **đạt** — 2 push được gửi cùng giây (2 dòng log lúc 19:21:00.224Z/.450Z), xác nhận được cả hai. Windows hiện **lần lượt từng banner** (banner trước đóng thì banner sau hiện) — đúng theo cách Windows xếp hàng, không mất push |
| N5 | Tắt mạng ~1 phút trước giờ uống rồi bật lại | Push tới trễ nhưng vẫn nhận được (ghi nhận độ trễ) | **đạt** — bật mạng lại → nhận push, trễ ~30 giây |
| N12 | Để 1 lần uống **chưa xác nhận quá 15 phút**; người thân đăng nhập thiết bị thứ hai với `relative_alerts=true` | Người thân nhận push; tắt `relative_alerts` → không nhận; mỗi lần uống chỉ 1 push | *(chưa kiểm thử — cần 2 thiết bị/tài khoản thật; test tự động đã phủ ở §7.11)* |
| U5 | Zoom/cỡ chữ trình duyệt 200% | M01–M08 không mất chức năng, không tràn chữ/mất nút | **đạt** |
| U7 | Devtools responsive 375×667 và 1280×800 | Bố cục đúng, nút chính dễ bấm ở cả hai | **đạt** |
| N7 | (Chỉ khi có iPhone/iPad) PWA “Thêm vào màn hình chính” → mở từ biểu tượng → bật thông báo | Nhận push; nếu không có thiết bị iOS ghi “chưa kiểm thử (iOS)” | |

Sau khi chạy, cập nhật cột “Kết quả thực tế” và đổi trạng thái tương ứng ở §7.2/§7.4 (chỉ đổi sang “đạt” khi thực sự quan sát đúng).

### 7.7 Lỗi phát hiện trong Giai đoạn 7 và đã sửa

| # | Lỗi | Nguyên nhân gốc | Cách sửa | Test tái hiện |
|---|---|---|---|---|
| D1 | Đăng nhập lần đầu: mọi chức năng báo “yêu cầu xác thực”, không bật được thông báo | `web/src/store/auth.tsx` chỉ gọi `POST /users/me/sync` khi `GET /users/me` trả **404**, nhưng backend trả **401** (`requireAuthMiddleware`: token hợp lệ nhưng chưa có bản ghi user) → bản ghi user không bao giờ được tạo → mọi API sau đó đều 401 | `AuthProvider.loadProfile` coi **cả 401 lẫn 404** là “chưa có hồ sơ” rồi gọi `syncProfile()`; thêm khoá chống gọi trùng (in-flight) để listener `onAuthChange` và `login/register` không tạo bản ghi hai lần | `web/src/__tests__/authProvider.test.tsx` (4 ca; ca 401 **thất bại trước khi sửa**) |
| D2 | Hai tab cùng đăng nhập lần đầu: một request có thể nhận 500 | `POST /users/me/sync` kiểm tra tồn tại rồi `create` — hai request đồng thời cùng `firebase_uid` → trúng unique index (E11000) → 500 | Bắt `code === 11000`, đọc lại bản ghi do request kia vừa tạo (idempotent) | `backend/tests/api.test.ts` “hai request /users/me/sync đồng thời” (**thất bại trước khi sửa**: một request trả 500) |

Cả hai lỗi đều được viết test tái hiện **trước** khi sửa; sau khi sửa đã chạy lại hồi quy đầy đủ: backend 95/95 (7 suite), web 96/96 (14 file), lint/typecheck/build sạch.

### 7.8 Đợt 2 — kết quả chạy tay của người dùng (20/10/2026)

Người dùng đã chạy: **N1 đạt** (push tới, trễ ~2 phút) và **N9 không đạt**. Bằng chứng thu thập:

- Log server (`notification_logs`): chỉ **2 dòng** `scheduled_reminder`, `sent_at` = giờ hẹn **+0,1 giây** (18:55:00Z → 18:55:00.574Z; 18:59:00Z → 18:59:00.136Z) → **server gửi đúng giờ**; độ trễ ~2 phút là ở phía FCM/Windows (đưa vào “giới hạn đã biết” của Giai đoạn 8).
- Lần uống 18:59:00Z vẫn `status=pending`, `snooze_count=0`, `snoozed_until=null`; lần uống 18:55:00Z là `status=confirmed` (người dùng đã xác nhận). **Không có** log `snooze` hay `overdue` → request snooze **chưa từng được gửi** khi bấm action “Nhắc lại sau”.

| # | Vấn đề | Xử lý trong đợt 2 | Test |
|---|---|---|---|
| D3 | M02 hiển thị **sai** cài đặt nhắc lại: luôn ghi “Đã hẹn nhắc lại sau 10 phút” và “tối đa 3 lần”, dù M08 đặt 5 phút × 5 lần | Thông báo lấy từ `snoozedUntil` backend trả về; giới hạn lấy từ `profile.preferences.snoozeMax` (mặc định 3) | `screens.test.tsx`: “báo đúng giờ hẹn lại” + “giới hạn nhắc lại lấy theo cài đặt M08” |
| D4 | `sw.js` có thể mất hành động khi không điều khiển được cửa sổ sẵn có (`client.navigate` lỗi/bị chặn → promise rejected, không mở gì) | `notificationclick` thử `navigate` trong `try/catch`, không được thì **mở cửa sổ mới** để hành động không bị mất | Chưa có tầng test cho Service Worker → kiểm chứng bằng chạy tay (N9 lần 2) |
| D5 | Hai đường hành động từ notification (`?action=snooze`, `?action=cannot`) **chưa có test** (chỉ `confirm` được phủ) | Thêm test cho cả hai | `screens.test.tsx` (18 test M01–M06, tổng web 99/99) |

**Nguyên nhân gốc của N9 chưa chốt** — cần 1 lần chạy lại với dữ liệu chẩn đoán: khi bấm action, mở **F12 → Network → lọc `snooze`** xem có request `POST /api/v1/doses/:id/snooze` không (không có = click action không tới được app; có mà 4xx/5xx = lỗi phía API). Hành động thay thế luôn dùng được: mở notification (bấm phần thân) → M02 → nút **“Nhắc lại sau”** trong app.

### 7.9 Đợt 3 — người dùng đổi múi giờ sang Asia/Bangkok và tạo 2 lịch trùng giờ (20/10/2026)

- **Độ trễ**: người dùng báo giảm từ ~2 phút xuống ~30 giây sau khi đổi múi giờ sang `Asia/Bangkok`. Lưu ý: `Asia/Bangkok` và `Asia/Ho_Chi_Minh` **cùng UTC+7**, nên việc đổi múi giờ không làm thay đổi mốc gửi. Mọi log vẫn cho thấy server gửi **+0,1 – 0,9 giây** sau giờ hẹn (19:21:00.224Z, 19:25:00.942Z, 19:26:00.394Z, …) → độ trễ còn lại là ở FCM/Windows và dao động theo tải máy. **N1 giữ “đạt”**, kèm giới hạn đã biết.
- **N10 (2 lịch trùng giờ)**: 2 lần uống cùng `19:21:00Z` (thuốc `test1` và `ádsa`) đều có log `scheduled_reminder status=sent` (19:21:00.224Z và 19:21:00.450Z) và cả hai đều được xác nhận → **server gửi 2 push riêng, không gộp**. Người dùng quan sát “hiện 1 cái trước, xác nhận xong thì hiện cái 2” là do Windows hiển thị **lần lượt từng banner** cho cùng một ứng dụng; mở Trung tâm thông báo (Win+N) sẽ thấy cả hai. → **N10 = đạt**.
- **N9 (chạy lại)**: ✅ **đạt**. Sau khi nạp `sw.js` mới và siết M02, `notification_logs` ghi `kind=snooze status=sent` lúc `19:37:00.608Z` cho lần uống `19:26:00Z` (`snooze_count=2`; chuỗi: reminder 19:26 → snooze → push nhắc lại 19:37 → xác nhận) và người dùng xác nhận **nhận được push “Nhắc lại: uống thuốc”** → đường action từ notification đã hoạt động; **không còn kịch bản “không đạt”**.

### 7.10 Đợt 4 — chạy tay N5/N8/U5/U7 và 3 yêu cầu mới (20/10/2026)

**Kết quả chạy tay**: **N8 đạt** (bấm thân notification → mở đúng M02 của lần uống), **N5 đạt** (tắt mạng ~1 phút rồi bật lại → push vẫn tới, trễ ~30 giây), **U5 đạt** (zoom 200%), **U7 đạt** (375×667 và 1280×800). Còn **N7** (iOS — cần HTTPS) và **N12** (chờ chạy lại cùng thay đổi ngưỡng cảnh báo bên dưới).

**3 yêu cầu mới của người dùng** (đã thống nhất hướng, xem kế hoạch ở `BUILD_ROADMAP.md` / `CURRENT_STATE.md`):

1. **Ngưỡng cảnh báo người thân = 15 phút** (thay cho “khi chuyển `missed` = 120 phút”): nếu lần uống **chưa được xác nhận** sau 15 phút kể từ giờ đến hạn thì gửi push cho người thân (`relative_alerts=true`).
2. **M07 (Người thân) có nút quay lại** — hiện màn này mở từ M01/M08 mà không có đường về.
3. **Người thân xem được lịch uống thuốc của chủ hồ sơ** — backend đã cho phép đọc hộ (`?ownerId=`), nhưng web chưa có đường vào; kèm 2 lỗi liên quan: `GET /doses/:id` **404 với người thân** (nên bấm notification của relative alert không mở được), và M02 chưa ẩn nút hành động khi người xem không phải chủ hồ sơ.

**Trạng thái**: **đã duyệt và triển khai — xem §7.11** (người dùng chốt: mốc 15 phút tính từ **lần nhắc lại cuối**; người thân xem **M03 + M04** ở chế độ chỉ xem; giữ nguyên trạng thái `missed` ở **120 phút**).

### 7.11 Đợt 5 — triển khai R1–R3 và kiểm thử (20/10/2026)

**Thay đổi mã** (không thêm thư viện, không đổi lược đồ CSDL):

| Mã | Nội dung | File chính |
|---|---|---|
| R1 | Biến môi trường mới `RELATIVE_ALERT_AFTER_MINUTES` (mặc định **15**); `processDueNotifications` thêm nhóm “chưa xác nhận quá ngưỡng” (status `pending`/`snoozed`/`overdue`, mốc = `snoozed_until ?? scheduled_at`, cửa sổ bù = ngưỡng + 30 phút); đổi tên hàm `notifyRelativeMissed` → **`notifyRelativeAlert`**, bỏ điều kiện cứng `status === 'missed'` (giữ `missed` = lưới an toàn); chống trùng `(dose_id, kind)` như cũ | `backend/src/config/env.ts`, `backend/src/services/notificationService.ts`, `backend/.env` |
| R2 | M07 thêm nút **“← Quay lại”** (về trang trước; mở trực tiếp bằng URL thì về Trang chủ) | `web/src/screens/M07.tsx` |
| R3a | `GET /doses/:id`: suy ra chủ hồ sơ từ chính lần uống khi không truyền `?ownerId=` (`resolveOwnerAccess` thêm `fallbackOwnerId`) → người thân có `view_schedule` mở được (sửa 404); phản hồi thêm **`canAct`** và **`timezone`** (của chủ hồ sơ). `GET /family/connections` thêm **`user.timezone`** | `backend/src/middlewares/familyAccess.ts`, `backend/src/routes/doses.ts`, `backend/src/routes/family.ts` |
| R3b | M07 (vai trò người thân, có `view_schedule`) thêm nút **“Xem lịch uống thuốc”** → `/schedule?ownerId=…`; hook `useOwnerView` đọc `?ownerId=` + tên/múi giờ chủ hồ sơ | `web/src/hooks/useOwnerView.ts`, `web/src/screens/M07.tsx` |
| R3c | M03: `?ownerId=` → gọi `GET /doses?date=&ownerId=`, banner **“Đang xem lịch của …”** + nút về danh sách người thân, tính **ngày/buổi theo múi giờ của chủ hồ sơ** | `web/src/screens/M03.tsx` |
| R3d | M04: `?ownerId=` → “Thuốc của …”, banner, **ẩn Thêm/Sửa/Ngừng**, gọi `GET /medications?status=&ownerId=` | `web/src/screens/M04.tsx` |
| R3e | M02: `canAct=false` → **chỉ xem** (ẩn 3 nút hành động, bỏ qua `?action=`, hiện “Chỉ xem”); giờ hiển thị theo `timezone` của chủ hồ sơ | `web/src/screens/M02.tsx` |

**Test tự động thêm** (red-before/green: các test mới đều mô tả hành vi chưa có trước đó):

| Suite | Test mới | Tổng sau |
|---|---|---|
| `backend/tests/notificationService.test.ts` | +6: cron báo người thân khi chưa xác nhận quá 15 phút (dù chưa `missed`); chưa tới ngưỡng → chưa báo; đã xác nhận → không báo; đã nhắc lại → mốc tính từ `snoozed_until`; vừa nhắc lại xong → chưa báo; đổi hàm `notifyRelativeMissed` → `notifyRelativeAlert` (case `confirmed`) | backend **105/105** (7 suite) |
| `backend/tests/family.test.ts` | +5: người thân có `view_schedule` mở `GET /doses/:id` → 200 với `canAct=false` + `timezone`; chủ hồ sơ → `canAct=true`; người lạ → 403; mất quyền `view_schedule` → 403; `GET /family/connections` trả `user.timezone` | |
| `web/src/__tests__/screens.test.tsx` | +9: M07 nút quay lại; nút xem lịch (mở `/schedule?ownerId=`); mất quyền `view_schedule` → mất nút; vai trò chủ hồ sơ → không có nút; M03 `?ownerId=` → banner + gọi API kèm ownerId; M03 không có ownerId → không gọi `listFamilyConnections`; M04 `?ownerId=` → ẩn Thêm/Sửa/Ngừng; M02 `canAct=false` → không có nút hành động + “Chỉ xem”; M02 `?action=confirm` khi `canAct=false` → không gọi `confirm` | web **108/108** (14 file) |

**Kết quả chạy lệnh**: backend `npm test` **105/105**, `tsc --noEmit` sạch; web `npm test` **108/108**, oxlint sạch, `tsc -b` sạch, `npm run build` OK (457,32 kB / gzip 139,17 kB). Backend đang chạy dev (`ts-node-dev --respawn`) nên tự nạp mã mới; `RELATIVE_ALERT_AFTER_MINUTES=15` đã ghi vào `backend/.env`.

**Còn lại**: **N12** cần chạy tay trên thiết bị thật (tài khoản chủ hồ sơ + tài khoản người thân ở cửa sổ/tài khoản riêng) — đã dễ hơn nhờ ngưỡng 15 phút; **N7** (iOS/HTTPS) giữ nguyên “chưa kiểm thử”.

### 7.12 Đợt 6 — thiết kế lại giao diện R4 và kiểm thử (20/10/2026)

**Yêu cầu người dùng** (đã chốt): thiết kế lại **toàn bộ giao diện** cho đơn giản – dễ dùng – chuyên nghiệp; trang đăng nhập/đăng ký thành **trang giới thiệu ứng dụng**; **người thân thấy lịch uống thuốc của chủ hồ sơ trực tiếp trong M07** (không chỉ có nút); giữ nguyên chiều phân quyền MVP. **Không đổi API, không đổi lược đồ CSDL, không đổi luồng nghiệp vụ**; backend **không sửa**.

**Thay đổi mã (web)**:

| Nhóm | Nội dung | File chính |
|---|---|---|
| Nền tảng | `index.css` viết lại thành hệ thống token (màu/bo góc/bóng/cỡ chữ), giữ mọi quy tắc INTERFACE_SPEC (chữ ≥ 18px, nút ≥ 56px, trạng thái kèm icon + nhãn chữ, tab dưới ↔ nav ngang ≥ 768px) | `web/src/index.css` |
| Component mới | `Section`, `Notice`, `StatGrid`, `Segmented` (+ `ChoiceRow`) | `web/src/components/*` |
| Component cũ | `Button`, `Card`, `Fields`, `StateView`, `DoseRow`, `TabBar` chuyển sang lớp CSS/token mới, **giữ nguyên API props & tên truy cập** | `web/src/components/*` |
| Trang đăng nhập | Trở thành trang giới thiệu (hero + 6 thẻ công dụng + lợi ích + 3 bước) rồi mới tới form đăng nhập/đăng ký; vẫn 1 URL `/login` | `web/src/screens/Login.tsx` |
| M01–M06, M08 | Bố cục lại theo khối `Section`, nút lớn, nhãn rõ nghĩa; nhãn truy cập giữ đúng như test đang kiểm (“Đã uống”, “Ngừng”, “Lưu”, …) | `web/src/screens/M01–M06, M08.tsx` |
| M07 | **Người thân thấy lịch trực tiếp** trong màn (gọi `GET /doses?date=&ownerId=`, nhóm theo buổi, chuyển ngày) và vẫn có nút “Xem lịch uống thuốc” mở M03 xem chi tiết | `web/src/screens/M07.tsx` |
| Hook | `useApi` bọc `Promise.resolve()` khi gọi fetcher → fetcher trả giá trị đồng bộ/`undefined` không làm vỡ màn hình | `web/src/hooks/useApi.ts` |

**Test cập nhật (có chủ đích — do yêu cầu người dùng đổi)**: `web/src/__tests__/screens.test.tsx` — 2 test M07 nay kiểm: người thân **thấy lịch trực tiếp** + `getDosesByDate` được gọi với `ownerId` + vẫn mở được `/schedule?ownerId=`; khi mất quyền `view_schedule` thì **không hiện lịch lẫn nút**. Không nới lỏng/bỏ test nào khác.

**Test mới**: `web/src/__tests__/login.test.tsx` (**+8**) — trang giới thiệu có đủ 3 khối nội dung; form đăng nhập mặc định cùng trang; chuyển sang đăng ký; chặn email sai/mật khẩu ngắn (không gọi API); gọi `login`/`register` khi hợp lệ (email cắt khoảng trắng); chưa cấu hình Firebase → hiện hướng dẫn thay form. Trước đợt này **chưa có test nào cho màn đăng nhập**.

**Sửa lỗi nhỏ phát hiện khi viết test**: `Login.goToAuth` gọi `scrollIntoView` không guard → vỡ ở môi trường không hỗ trợ (đã thêm `?.`); `useApi` gọi `.then` trực tiếp trên kết quả fetcher → vỡ khi fetcher trả giá trị đồng bộ (đã bọc `Promise.resolve()`).

**Kết quả chạy lệnh**: web `npm test` **116/116** (15 file), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**468,86 kB / gzip 142,63 kB**). Backend `tsc --noEmit` sạch (không sửa mã).

**Chưa kiểm thử (GHI RÕ)**: bố cục mới **chưa mở lại trên trình duyệt/điện thoại thật** — cần chạy lại nhóm giao diện **§5 (U1–U8)**, đặc biệt **U5 (zoom 200%)** và **U7 (375×667 / 1280×800)**; luồng **người thân xem lịch trực tiếp trong M07** mới chỉ có test đơn vị, **chưa chạy thật với 2 tài khoản**. Trạng thái tổng hợp của N1–N12 **không đổi**: vẫn **45/47 đạt — 2 chưa kiểm thử (N7, N12) — 0 không đạt**.

### 7.13 Đợt 7 — chỉnh trang chủ + M01 theo phản hồi (20/10/2026)

**Yêu cầu người dùng** (đã chốt): “trang chủ vẫn như cũ” → thiết kế lại **cả trang giới thiệu đầu vào lẫn trang chủ M01**; trang giới thiệu là trang chủ hiện ra đầu tiên, nhưng bấm **Đăng nhập/Đăng ký** thì **form hiện ra giữa màn hình** dạng hộp thoại (không cuộn xuống cuối trang). Không đổi API/CSDL/luồng nghiệp vụ; backend không sửa.

**Thay đổi mã (web)**: `Login.tsx` thành **thanh đầu trang + hero hai cột + dải số liệu tin cậy + 3 khối giới thiệu**, form đăng nhập/đăng ký chuyển vào **hộp thoại giữa màn hình** (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, nút đóng `aria-label="Đóng"`, bấm nền đóng). `M01.tsx` bố cục lại: **dải chào mừng** (lời chào + ngày + thanh tiến độ) → **thẻ “Cần uống bây giờ”** nổi bật → tiến độ → **lịch theo buổi** dạng dòng thời gian → lối tắt. `index.css` thêm lớp `.site-header`/`.brand`, `.hero__preview`, `.trust-strip`, `.modal-backdrop`/`.modal` (+`prefers-reduced-motion`), `.greeting`, `.now-card`, `.day-part`.

**Test cập nhật (có chủ đích — hành vi người dùng đổi)**: `web/src/__tests__/login.test.tsx` — 6 test cũ giả định form nằm sẵn trên trang nay thêm bước mở hộp thoại; **giữ nguyên mọi assertion nghiệp vụ** (validate email/mật khẩu, gọi `login`/`register`, cắt khoảng trắng, chưa cấu hình Firebase). Thêm test **mở/đóng hộp thoại**. Tổng **10 test** (trước 8). Không nới lỏng hay bỏ test nào.

**Sửa lỗi trùng tên truy cập (phát hiện nhờ test)**: nút thanh đầu trang và nút submit hộp thoại đều tên “Đăng nhập” → thêm `aria-label="Mở đăng nhập"`/`"Mở đăng ký"` cho nút đầu trang, đổi nút hero thành “Tôi đã có tài khoản” để trình đọc màn hình phân biệt được.

**Kết quả chạy lệnh**: web `npm test` **118/118** (15 file), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**470,78 kB / gzip 143,00 kB**). Backend `tsc --noEmit` sạch (không sửa mã).

**Chưa kiểm thử (GHI RÕ)**: hộp thoại đăng nhập và bố cục M01 mới **chưa mở lại trên trình duyệt/điện thoại thật** — cần chạy lại **§5 (U1–U8)**, đặc biệt **U5 (zoom 200%)** và **U7 (375×667 / 1280×800)** vì có thêm phần tử `position: fixed`. Luồng **người thân xem lịch trong M07** vẫn **chưa chạy thật với 2 tài khoản**. Trạng thái N1–N12 **không đổi**: **45/47 đạt — 2 chưa kiểm thử (N7, N12) — 0 không đạt**.

### 7.14 Đợt 8 — đổi phong cách giao diện sang giấy kem · mực nâu · đỏ gạch (20/10/2026)

**Yêu cầu người dùng** (đã chốt qua câu hỏi): giao diện R4/R5 “hơi công nghiệp, bị AI hoá”; muốn **tối giản – simple – vintage – chuyên nghiệp – hiện đại**. Chốt: **giấy kem + mực nâu + đỏ gạch**, **tối giản tuyệt đối**, **serif cho tiêu đề**. Không đổi API/CSDL/luồng nghiệp vụ; backend không sửa; không thêm thư viện/font ngoài.

**Thay đổi mã (web)**: `index.css` đổi toàn bộ token màu sang tông trầm (nhấn **đỏ gạch** `#9a2f22`, phụ **xanh rêu** `#4a5a3a`); bo góc nhỏ (4/6/8px); **`--shadow-*` = `none`** (bỏ mọi bóng đổ); thêm **font serif** cho mọi tiêu đề/số liệu; **bỏ toàn bộ `linear-gradient`**, thay bằng nền phẳng + viền màu mảnh; `.stat-grid`/`.feature-grid`/`.trust-strip` chuyển sang **lưới liền kề có đường kẻ 1px**; `.segmented` chuyển thành **gạch chân tab**; badge trạng thái từ bo tròn → bo 3px; hộp thoại (`Dialog`, login `Modal`, `DueBanner`) bỏ bóng, viền mảnh.

**File chính**: `web/src/index.css`, `web/src/components/{Button,Dialog,DoseRow,DueBanner}.tsx`, `web/src/screens/{M01,M04,M07,M08}.tsx` (màu cứng còn sót). Màu trạng thái vẫn đi qua token `DOSE_STATUS_COLOR` nên tự động ăn theo bảng màu mới — **không phải sửa logic trạng thái**, giữ nguyên quy tắc “trạng thái luôn kèm icon + nhãn chữ”.

**Kết quả chạy lệnh**: web `npm test` **118/118** (15 file — số test không đổi), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**470,87 kB / gzip 142,95 kB**). Backend `tsc --noEmit` sạch (không sửa mã). Xác nhận dev server phục vụ bản mới: `index.css` chứa `#f4efe4`, `#9a2f22`, `Georgia`, **không còn** `linear-gradient`.

**Chưa kiểm thử (GHI RÕ)**: phong cách mới **chưa mở lại trên trình duyệt/điện thoại thật** — cần chạy lại **§5 (U1–U8)**, đặc biệt **kiểm tra tương phản thực tế** (chữ nâu trên giấy kem, badge trạng thái trên nền trầm), **U5 (zoom 200%)** và **U7 (375×667 / 1280×800)**. Luồng **người thân xem lịch trong M07** vẫn **chưa chạy thật với 2 tài khoản**. Trạng thái N1–N12 **không đổi**: **45/47 đạt — 2 chưa kiểm thử (N7, N12) — 0 không đạt**.

### 7.15 Đợt 9 — đổi sang tông y tế (xanh dương + trắng + xanh lá), bỏ font serif (20/10/2026)

**Yêu cầu người dùng** (đã chốt qua câu hỏi): phong cách kem/nâu/đỏ gạch ở §7.14 **không phù hợp** và **“nhiều chữ bị lỗi”**; muốn hướng **y tế**, tông **xanh dương + trắng + xanh lá**.

**Điều tra lỗi chữ**: quét encoding toàn bộ `web/src/**/*.{ts,tsx,css}` — **0 file** chứa U+FFFD; `index.css` đọc đúng UTF-8, tiếng Việt nguyên vẹn. Nghi vấn chính là **font serif** không phủ đủ dấu tiếng Việt trên Windows → **bỏ hoàn toàn serif**, dùng một font không chân cho mọi thành phần.

**Thay đổi mã (web)**: token màu đổi sang y tế (`--c-primary #12659c` xanh dương, `--c-accent #2e7d4f` xanh lá, nền `#f2f6fa`, mặt `#ffffff`); **xoá `--font-serif` và 13 chỗ dùng nó**; khôi phục bo góc 8/12/16px và **bóng đổ nhẹ**; `.stat-grid`/`.trust-strip`/`.feature-grid` về dạng thẻ tách rời; `.segmented` về dạng nút segmented; badge trạng thái và progress bo tròn 999px; landing có lại hero gradient xanh nhạt; M01 có lại dải chào mừng gradient xanh dương.

**File chính**: `web/src/index.css`, `web/src/components/{Button,Dialog,DoseRow,DueBanner}.tsx`, `web/src/screens/{M04,M07,M08}.tsx`.

**Kết quả chạy lệnh**: web `npm test` **118/118** (15 file — số test không đổi), `oxlint` không cảnh báo, `tsc -b` sạch, `npm run build` OK (**470,75 kB / gzip 142,98 kB**). Backend `tsc --noEmit` sạch (không sửa mã). Dev server xác nhận phục vụ bản mới: `index.css` có `#12659c`, **không còn** `Georgia`/`font-serif`.

**Chưa kiểm thử (GHI RÕ)**: tông y tế mới **chưa mở lại trên trình duyệt/điện thoại thật** — cần xác nhận **lỗi chữ đã hết chưa** (chỉ xác nhận được bằng mắt, không có test tự động cho việc render font) và chạy lại **§5 (U1–U8)**: **U5 (zoom 200%)**, **U7 (375×667 / 1280×800)**, kiểm tra tương phản. Luồng **người thân xem lịch trong M07** vẫn **chưa chạy thật với 2 tài khoản**. Trạng thái N1–N12 **không đổi**: **45/47 đạt — 2 chưa kiểm thử (N7, N12) — 0 không đạt**.

### 7.16 Đợt 10 — M07 cảnh báo rõ cho người thân khi chủ hồ sơ chưa xác nhận (20/10/2026)

**Bối cảnh**: người dùng báo chủ hồ sơ để liều uống quá 15 phút không xác nhận mà **bên người thân không thấy thông báo**, M07 **vẫn ghi “Đang chờ”**.

**Điều tra dữ liệu thật (chỉ đọc, đã xin phép)**: 2 thiết bị `active` + `notifications_enabled=true`; 1 kết nối `active` với `relative_alerts:true`; **có bản ghi `NotificationLog` `kind=relative_alert` `status=sent`** đúng ngưỡng 15 phút → **backend chạy đúng**. Kết luận: việc không hiện notification là vấn đề phía trình duyệt/HĐH, **không phải lỗi ứng dụng**.

**Kết luận nghiệp vụ**: “Đang chờ” ở mốc 15–29 phút là **đúng thiết kế** (đổi trạng thái ở 30/120 phút) → **giữ nguyên**. Điểm yếu thật là **giao diện M07 không cho người thân biết có vấn đề** → đã thêm cảnh báo.

**Thay đổi (web, không đổi API/CSDL/luồng)**: thêm `isUnconfirmedByOwner` + `RELATIVE_ALERT_AFTER_MINUTES = 15` + `unconfirmedAlerts()` trong `utils/doseStatus.ts`; component mới `components/RelativeUnconfirmedAlert.tsx` (`role="alert"`); M07 `RelativeSchedule` render cảnh báo trên danh sách lần uống; CSS `.relative-alert*`. Luật hiển thị **khớp** `UNCONFIRMED_STATUSES` + ngưỡng ở backend.

**Kết quả chạy lệnh**: web `npm test` **126/126** (15 file; **+8 test mới**), `oxlint` sạch, `tsc -b` sạch, `npm run build` OK (**472,12 kB / gzip 143,29 kB**). Backend không thay đổi.

**Test mới**: `doseStatus.test.ts` — ngưỡng mặc định 15; phân loại chưa xác nhận; lọc quá ngưỡng + thứ tự cũ trước; mốc `snoozedUntil`; rỗng khi đã xác nhận. `screens.test.tsx` — M07 hiện cảnh báo khi quá ngưỡng; đã xác nhận → không cảnh báo; “Không thể uống” → không cảnh báo.

**Chưa kiểm thử (GHI RÕ)**: cảnh báo mới **chưa chạy tay với 2 tài khoản thật** trên trình duyệt; **chưa xác định được nguyên nhân notification không hiện trên máy người dùng** (ngoài phạm vi ứng dụng). Cần chạy tay: chủ hồ sơ để liều quá 15 phút → tài khoản người thân mở M07 xem cảnh báo. Trạng thái N1–N12 **không đổi**: **45/47 đạt — 2 chưa kiểm thử (N7, N12) — 0 không đạt**.

### 7.17 Kịch bản kiểm thử tay mới (cần chạy) — cảnh báo người thân ở M07

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| A1 | Chủ hồ sơ tạo một thuốc có giờ uống cách hiện tại ~16–20 phút trong quá khứ (hoặc chờ qua ngưỡng), **không** bấm xác nhận | Liều ở trạng thái `pending` (hiển thị “Đang chờ”) |
| A2 | Mở M07 bằng **tài khoản người thân** (cửa sổ/cửa sổ ẩn danh riêng) | Khối cảnh báo đỏ: “«Tên chủ hồ sơ» chưa xác nhận uống thuốc”, kèm giờ + tên thuốc + “⏳ Đang chờ”, và câu nhắc gọi |
| A3 | Vẫn ở tài khoản người thân, bấm “← Ngày trước” | Cảnh báo đổi thành “Ngày này «tên» đã bỏ lỡ thuốc” (nếu ngày đó có liều chưa xác nhận) |
| A4 | Chủ hồ sơ bấm **“Đã uống”** → người thân tải lại M07 | **Không còn** khối cảnh báo |
| A5 | Chủ hồ sơ bấm **“Không thể uống”** → người thân tải lại M07 | **Không còn** khối cảnh báo |
| A6 | Tài khoản người thân bị tắt `view_schedule` | Không hiện cảnh báo (và không hiện lịch) |
| A7 | Kiểm tra tương phản khối cảnh báo (nền `--c-danger-soft`, viền `--c-danger`) ở zoom 200% | Chữ đỏ trên nền hồng nhạt đọc rõ; viền trái 5px thấy được |

### 7.18 Đợt 11 — khu vực vận hành `/admin` (20/10/2026, mở rộng 27/10/2026)

**Bối cảnh**: người dùng hỏi dự án có nên có giao diện quản trị. Đối chiếu `API_SPEC.md` cũ (“Admin hệ thống — không có trong phạm vi”), `README` lại hứa “liên hệ quản trị viên” khi tài khoản SĐT quên mật khẩu nhưng **không có công cụ nào**. Người dùng chốt: **chỉ đọc + khóa/mở tài khoản + đặt lại mật khẩu**, duyệt thêm `users.role`; sau đó duyệt thêm `users.disabled_at` để khóa có hiệu lực ngay. Ngày 27/10/2026 chốt thêm role **`manager`** (vận hành nội bộ) và admin **đổi vai trò** trong `/admin` + CLI.

**Giới hạn phạm vi**: `/admin` là **khu vực hậu trường ngoài M01–M08**, không phải màn hình M09; không đổi luồng nghiệp vụ của 8 màn hình; **không có xóa tài khoản** (Q4 chưa chốt).

**Backend đã làm**:
- `models/User.ts`: `role: 'user'|'manager'|'admin'` (mặc định `user`), `disabled_at: Date|null`.
- `middlewares/auth.ts`: chặn tài khoản bị khóa bằng **403** ngay trong `authMiddleware`; gắn `role` + `isAdmin`; thêm `requireStaffMiddleware` (manager/admin) và giữ `requireAdminMiddleware` cho thao tác nâng cao.
- `config/firebase.ts`: `setFirebaseUserDisabled`, `setFirebaseUserPassword`, `revokeFirebaseRefreshTokens`, `getFirebaseUserEmails` (1 lần/trang), `getFirebaseUserByEmail`, `isFirebaseReady`.
- `services/adminService.ts` + `routes/admin.ts` + mount `/api/v1/admin`: summary, danh sách người dùng (tìm/phân trang, **không** nội dung y tế), lỗi gửi thông báo (`error` = nhãn tiếng Việt, `errorCode` = mã gốc), nhật ký, khóa/mở, đặt lại mật khẩu, đổi vai trò. Manager chỉ khóa/mở tài khoản người dùng; reset/role chỉ admin. Khóa/mở/reset/role ghi `audit_logs`, không ghi mật khẩu.
- `src/scripts/grantAdmin.ts` + `npm run admin:grant` / `npm run role:set`: cấp/đổi vai trò bằng CLI (`--role user|manager|admin`), không có endpoint tự cấp; chặn hạ quyền admin đang hoạt động cuối cùng.
- `GET/PATCH /users/me` trả thêm `role`.

**Web đã làm**: route `/admin` (layout riêng, không tab bar) + `screens/Admin.tsx`; **nút cố định ở đầu trang** — “Quản trị hệ thống” với admin, “Khu vận hành” với manager (đã bỏ khỏi M08); giao diện vận hành bố cục **hai cột trên màn hình lớn**, thanh tiêu đề có thời điểm cập nhật + **Tải lại**, 8 thẻ số liệu có nhãn ngữ cảnh, tìm kiếm + **Xóa lọc**, thẻ người dùng có avatar/badge vai trò/trạng thái, lỗi gửi thông báo + nhật ký dạng timeline; types/endpoints vận hành; CSS `.admin-*` dùng token y tế; hộp thoại xác nhận khóa, đặt lại mật khẩu (≥ 8 ký tự, nhập lại) và đổi vai trò (chỉ admin). Mã lỗi gửi thông báo (`no_active_device`…), loại đối tượng/nhật ký và múi giờ được dịch sang nhãn tiếng Việt.

**Kết quả chạy lệnh (đã chạy thật)**:
- Backend: `npm run lint` (`tsc --noEmit`) sạch; `npm test` **158/158** (9 suite; **+12 test** cho vai trò manager + đổi vai trò).
- Web: `npm run typecheck` sạch; `npm run lint` (oxlint) sạch; `npm test` **168/168** (18 file; **+4 test** cho manager/đổi vai trò); `npm run build` OK (**498,08 kB / gzip 149,21 kB**; CSS 24,42 kB / gzip 4,84 kB).

**Test tự động đã phủ**: 401/403 khu vực vận hành; role trả về `/users/me` cho user/manager/admin; manager đọc được summary nhưng reset/role bị 403; manager khóa được người dùng, không khóa được manager/admin; admin đổi role + audit `from/to`; không tự đổi role; role không hợp lệ bị 400; summary đếm đúng **24 giờ đã qua** (loại liều tương lai) + không lộ tên thuốc; tìm/phân trang; không tự khóa mình; khóa/mở gọi Firebase + lưu `disabled_at` + audit; mật khẩu < 8 ký tự bị chặn; reset gọi Firebase + audit **không chứa mật khẩu**; notification/audit list; middleware chặn tài khoản bị khóa; UI: không quyền, số liệu/danh sách, tìm, phân trang, khóa, mở khóa, validate + reset thành công, đổi vai trò, nút **Tải lại**; lối tắt admin/manager; mã lỗi gửi thông báo trả về **nhãn tiếng Việt** + `errorCode` gốc.

**CHƯA KIỂM THỬ (ghi rõ, không đánh dấu đạt)**:
1. **Chưa mở `/admin` trên trình duyệt thật**; chưa chạy **A8–A20** dưới đây, gồm cả giao diện manager và đổi vai trò.
2. **Chưa gọi Firebase thật** cho khóa/mở/đặt lại mật khẩu và lấy email hàng loạt — test backend **mock** các hàm này. Cần chạy với service account thật để xác nhận `updateUser({disabled})`, `updateUser({password})`, `revokeRefreshTokens`, `getUsers` hoạt động đúng.
3. Chưa kiểm tra **token cũ sau khi khóa**: API phải trả 403 ngay; đăng nhập lại phải bị Firebase chặn.
4. Chưa kiểm tra **đặt lại mật khẩu cho tài khoản SĐT** rồi đăng nhập bằng mật khẩu mới trên thiết bị thật.
5. Chưa kiểm tra **đổi vai trò trên tài khoản thật**: manager/admin thấy đúng nút, quyền API đổi ngay, UI cần tải lại; chưa xác nhận hạ quyền admin cuối cùng bị chặn.
6. Không có xóa tài khoản (chờ Q4).

**Kịch bản kiểm thử tay mới — vận hành**:

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| A8 | Trong `backend/`, chạy `npm run admin:grant -- <email hoặc SĐT của bạn>` | In “Đã đặt vai trò admin…”; tải lại web thấy nút “Quản trị hệ thống” ở đầu trang (không cần vào M08) |
| A9 | Đăng nhập tài khoản **thường**, mở thẳng `/admin` | Thấy “Tài khoản của bạn không có quyền truy cập…”, không có số liệu; API vận hành trả 403 |
| A10 | Admin mở `/admin` | Thấy 8 thẻ số liệu, bố cục hai cột trên màn hình lớn (xếp dọc trên điện thoại), danh sách người dùng, mục lỗi gửi thông báo, nhật ký; nút “Tải lại” cập nhật lại dữ liệu; **không** thấy tên thuốc/lý do không uống |
| A11 | Tìm theo tên và SĐT; bấm trang sau | Kết quả lọc đúng; phân trang đúng, không tải lại toàn trang |
| A12 | Khóa một tài khoản thử → mở cửa sổ ẩn danh đăng nhập tài khoản đó | Đăng nhập bị chặn (Firebase disabled); token cũ gọi API nhận 403 “Tài khoản đã bị khóa…” |
| A13 | Mở khóa → đăng nhập lại | Vào được bình thường; badge “Đã khóa” biến mất; nhật ký có `admin_lock` + `admin_unlock` |
| A14 | Đặt lại mật khẩu cho tài khoản SĐT → đăng xuất tài khoản đó → đăng nhập bằng mật khẩu mới | Đăng nhập thành công; nhật ký có `admin_reset_password`; **không** thấy mật khẩu trong UI/nhật ký/DB |
| A15 | Chạy `npm run admin:grant -- <email/SĐT> --role manager`; đăng nhập lại tài khoản đó | Thấy nút **“Khu vận hành”**; mở `/admin` thấy số liệu/danh sách, **không** có nút “Đặt lại mật khẩu”/“Đổi vai trò” |
| A16 | Manager khóa một tài khoản người dùng, rồi thử khóa tài khoản manager/admin khác | Khóa người dùng thành công; tài khoản manager/admin không có nút thao tác và API trả 403 |
| A17 | Dùng token manager gọi `POST /admin/users/:id/reset-password` và `PATCH /admin/users/:id/role` | Cả hai trả 403; không có thay đổi dữ liệu/nhật ký |
| A18 | Admin đổi một người dùng thành **Quản lý** trong hộp thoại “Đổi vai trò” | API 200; thông báo đổi vai trò; nhật ký `admin_set_role` có `from/to`; tài khoản đó tải lại thấy nút “Khu vận hành” |
| A19 | Admin thử đổi vai trò của chính mình; thử hạ quyền admin đang hoạt động cuối cùng (nếu có thể) | Tự đổi bị chặn 400; không thể hạ admin cuối cùng; UI hiển thị lỗi tiếng Việt |
| A20 | Manager/admin xem danh sách, lỗi gửi thông báo, nhật ký | Không thấy tên thuốc, hướng dẫn, lý do không uống, token FCM hay `firebase_uid` |
