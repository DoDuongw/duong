# NOTIFICATION PLAN — Web Push (FCM for Web + Service Worker)

## 1. Tổng quan kênh

| Kênh | Công nghệ | Dùng cho |
|---|---|---|
| **Chính** | **Web Push** — FCM for Web, hiển thị qua Service Worker | Giờ uống cố định, nhắc lại sau snooze — server (node-cron) gửi push đúng giờ |
| **Phụ (trang đang mở)** | Hiển thị trong trang (banner + âm thanh theo cài M08) | Người dùng đang mở trang → hiện ngay tại M01/M03, bấm là vào M02 |

**Lý do đảo vai so với bản mobile**: trình duyệt không tự nhắc khi tab đã đóng — nên **server là bên duy nhất lên lịch và gửi push** (node-cron đã chạy mỗi phút, sẵn có). Service Worker chỉ là nơi nhận và hiển thị thông báo; khi trang đang mở thì hiện trong trang cho nhanh (có action “Đã uống / Nhắc lại sau / Không thể uống”).

**Bắt buộc**: PWA (manifest web app + Service Worker) — điều kiện để Web Push hoạt động, đặc biệt **iOS Safari ≥ 16.4 chỉ push khi trang được “Thêm vào màn hình chính”**.

## 2. Nơi lưu lịch và thành phần phát hiện thời điểm

| Thành phần | Vị trí | Trách nhiệm |
|---|---|---|
| Sinh lần uống | Backend `src/jobs` (node-cron, mỗi phút) | Tạo `dose_occurrences` cho các ngày kế tiếp |
| Lên lịch push nhắc giờ uống | Backend node-cron | Đến `scheduled_at` (và các mốc snooze) → gửi Web Push cho từng token active của người dùng |
| Quá giờ / missed | Backend node-cron | Chuyển trạng thái, gửi FCM `dose_overdue` nhắc (nếu cần) |
| Nhận push | Service Worker (`web/public/sw.js`) | Trang đóng/mở → hiển thị thông báo; bấm → mở M02 đúng lần uống |
| Hiển thị trong trang | Web app | Trang đang mở → banner + âm thanh thay cho notification của SW |

## 3. Kịch bản chi tiết

### 3.1 Nhắc giờ uống (kênh chính — Web Push từ server)

1. node-cron quét lần uống `pending/snoozed` trong hôm nay đến hạn → gửi push tại `scheduled_at`.
2. Nội dung: tên thuốc, giờ uống, hướng dẫn (ngắn gọn); actions: “Đã uống”, “Nhắc lại sau”, “Không thể uống”.
3. Push tới **mọi token active** của người dùng (mọi trình duyệt/thiết bị đã đăng nhập).
4. Bấm thông báo → mở trang `M02?doseId=...` đúng lần uống (notificationclick trong Service Worker).
5. Xác nhận (qua trang hoặc action của thông báo) → server ghi nhận, các push tiếp theo của lần uống đó bị hủy/không gửi.
6. Chống trùng: server kiểm tra `notification_logs` trước khi gửi — cùng `kind` + `doseId` thì bỏ qua; `doses/today` khi trang mở cũng tự hiện trạng thái nên không cần “đặt lịch cục bộ”.

### 3.2 Nhắc lại (snooze)

- User chọn “Nhắc lại sau” (hoặc action trên thông báo) → server tăng `snooze_count`, **lên lịch push mới sau 10 phút** *(đề xuất)*.
- Vượt giới hạn (3 lần) hoặc vượt hạn trong ngày → server từ chối, giao diện hiển thị lý do.

### 3.3 Nhắc từ server khi quá giờ (FCM)

- Backend phát hiện lần uống `overdue` (quá 30 phút) → gửi FCM Web Push `{ type: "dose_overdue", doseId }` tới mọi token active.
- Trang đóng → Service Worker hiển thị; trang mở → hiện trong trang. Bấm → mở M02.
- Chỉ gửi **một lần** mỗi lần uống (ghi `notification_logs.kind='scheduled_reminder'/'overdue'` để chống trùng).

### 3.4 Thông báo người thân (FCM)

- **Ngưỡng (thay đổi 20/10/2026 — yêu cầu của người dùng)**: khi lần uống **chưa được xác nhận quá `RELATIVE_ALERT_AFTER_MINUTES` phút** (mặc định **15** — trước đó là khi chuyển `missed` = 2 giờ) và connection có `permissions.relative_alerts=true` → push tới người thân: “Người thân X chưa uống thuốc Y lúc HH:mm” *(đã triển khai ở Giai đoạn 6, đổi ngưỡng ở Giai đoạn 7; hàm `notifyRelativeAlert`)*.
- **Mốc tính từ giờ đến hạn cuối cùng**: nếu lần uống đã “nhắc lại sau” thì mốc là `snoozed_until` (mốc được kéo dài), không tính lại từ giờ hẹn gốc — tránh báo người thân trong khi người già đang thao tác.
- Người thân **đã xác nhận** hoặc **đánh dấu không thể uống** → không gửi. Chống trùng theo `(dose_id, kind='relative_alert')` — mỗi lần uống chỉ một push.
- Cửa sổ bù (server vừa bật lại): `RELATIVE_ALERT_AFTER_MINUTES + 30` phút. Lưới an toàn: nếu tới lúc chuyển `missed` (2 giờ) mà chưa từng gửi thì vẫn báo.
- Số phút cấu hình ở `backend/.env` (`RELATIVE_ALERT_AFTER_MINUTES`, mặc định 15).
- Chỉ gửi khi connection active và có quyền; payload chỉ gồm tên thuốc + tên chủ hồ sơ + giờ.

### 3.5 Đổi lịch / ngừng thuốc

- Backend sau khi lưu phiên bản lịch mới → gửi push `sync` tới chủ hồ sơ.
- Server tự tính lại các lần nhắc tương lai theo phiên bản mới — **không có “thông báo cục bộ đang chờ” cần hủy ở client** nữa (toàn bộ lịch nằm ở server).
- Ngừng thuốc: lần uống tương lai bị xóa → các push tương ứng không được gửi (kiểm tra lại `dose_occurrences` ngay trước khi gửi).

## 4. Xử lý đa token và trạng thái

| Tình huống | Xử lý |
|---|---|
| Nhiều trình duyệt/thiết bị cùng tài khoản | FCM gửi tới mọi token active |
| Token hết hạn / xóa PWA khỏi màn hình chính | Backend khi gửi nhận error `registration-token-not-registered` → đánh dấu device `invalid` |
| Lỗi gửi FCM | Thử lại tối đa 3 lần, backoff 1s/5s/15s; ghi `notification_logs.status='failed'` + lỗi; không retry vô hạn |
| Đăng xuất | App gọi `DELETE /devices/unregister`; hủy thông báo đang hiển thị (SW `closeNotification`) |
| PWA chưa cài trên iOS | Không có token → không push; M08 hiển thị hướng dẫn “Thêm vào màn hình chính” |

## 5. Chống trùng

- Server gửi theo lịch tập trung: mỗi lần uống chỉ một push mỗi mốc thời điểm — kiểm tra `notification_logs` trước khi gửi.
- Phân biệt: `notification_logs.status='sent'` ≠ `dose_occurrences.status='confirmed'`.

## 6. Mất mạng, trình duyệt đóng, quyền

| Tình huống | Xử lý / hướng dẫn |
|---|---|
| Mất mạng lúc server gửi | FCM giữ hàng đợi và giao khi có mạng trở lại — **có thể trễ, không cam kết chính xác tuyệt đối** |
| Trang/tab đóng hoàn toàn | Push vẫn tới (Service Worker của trình duyệt hiển thị) — đây là kênh chính |
| Chrome/Edge/Android | Hỏi quyền Notifications khi lần đầu vào M01 (sau khi người dùng đã tương tác với trang) |
| iOS/iPadOS Safari | **Bắt buộc “Thêm vào màn hình chính”** (PWA) mới có push; hiển thị hướng dẫn trong M08 khi phát hiện iOS |
| Từ chối quyền thông báo | Giao diện hiển thị hướng dẫn cấp lại quyền trong M08 |
| Không có tab nào mở + PWA chưa cài | Không nhận push — giới hạn được chấp nhận, ghi rõ trong README |

## 7. Giới hạn được chấp nhận (không cam kết)

- Thông báo luôn đến chính xác tuyệt đối: **không cam kết** — phụ thuộc quyền trình duyệt, mạng, chính sách push của từng trình duyệt.
- iOS yêu cầu PWA (Thêm vào màn hình chính); Android cần quyền notification; hướng dẫn hiển thị trong M08.

## 8. Cấu hình liên quan

- Backend: service account Firebase / `FCM_SERVER_KEY` (env, không commit).
- Web: file cấu hình Firebase web (`firebase-messaging-sw.js` hoặc tích hợp FCM SDK + VAPID key trong `.env`); manifest PWA + Service Worker.
- Âm thanh thông báo trong trang: theo cài đặt ở M08 (Web Audio).

---

## Điểm cần duyệt

1. **Server (node-cron) làm kênh nhắc chính, Web Push hiển thị qua Service Worker** — thay mô hình Notifee cục bộ (xem ARCHITECTURE.md mục 4).
2. PWA bắt buộc cho iOS — hướng dẫn “Thêm vào màn hình chính” đặt trong M08.
3. FCM `dose_overdue` gửi một lần mỗi lần uống.
4. ~~Thông báo người thân chỉ ở mở rộng~~ → **đã triển khai ở Giai đoạn 6** (20/10/2026), dùng `permissions.relative_alerts`; **đổi ngưỡng 15 phút ở Giai đoạn 7** (20/10/2026, `RELATIVE_ALERT_AFTER_MINUTES`).
