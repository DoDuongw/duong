# BUSINESS RULES — Logic nghiệp vụ và giá trị mặc định

Các giá trị đánh dấu *(mặc định đề xuất)* cần người dùng duyệt (Q3, OPEN_QUESTIONS.md).

## 1. Trạng thái lần uống

```mermaid
stateDiagram-v2
    [*] --> pending: cron sinh từ lịch
    pending --> confirmed: confirm
    pending --> snoozed: snooze
    snoozed --> snoozed: snooze tiếp
    snoozed --> confirmed: confirm
    pending --> cannot_take: không thể uống (bắt buộc lý do)
    snoozed --> cannot_take: không thể uống
    overdue --> cannot_take: không thể uống
    pending --> overdue: cron: quá 30 phút
    overdue --> confirmed: confirm muộn
    overdue --> snoozed: snooze
    pending --> missed: cron: quá 120 phút
    snoozed --> missed: cron: quá 120 phút
    overdue --> missed: cron: quá 120 phút
    confirmed --> [*]
    cannot_take --> [*]
    missed --> [*]
    note right of confirmed: cron gửi hỏi thăm sức khỏe sau 10 phút
```

### Điều kiện chuyển trạng thái

| Từ | Đến | Điều kiện |
|---|---|---|
| pending | confirmed | Chủ hồ sơ gọi confirm; nếu `now > scheduled_at` và vẫn trong cùng ngày địa phương → `is_late_confirmation=true` |
| pending | snoozed | Gọi snooze; `snooze_count < snoozeMax`; giờ nhắc lại cùng ngày và không vượt `scheduled_at + 120 phút` |
| snoozed | snoozed | Tiếp tục snooze trong cùng giới hạn |
| overdue | snoozed | Được phép snooze nếu còn lượt và còn trong giới hạn ngày/120 phút |
| pending/snoozed/overdue | cannot_take | Gọi cannot-take kèm lý do (bắt buộc, 1–500 ký tự) |
| pending | overdue | node-cron: quá 30 phút kể từ `scheduled_at` mà chưa xác nhận |
| overdue | confirmed | Xác nhận muộn; set `is_late_confirmation=true` nếu cùng ngày địa phương |
| pending/snoozed/overdue | missed | node-cron: quá 120 phút kể từ `scheduled_at` |
| confirmed/cannot_take/missed | — | Trạng thái kết thúc, không chuyển tiếp |

> Không có chuyển trực tiếp `snoozed → overdue`: cron chỉ chuyển `pending → overdue`, sau đó chuyển mọi trạng thái chưa kết thúc sang `missed` khi quá 120 phút.

### Quy tắc chống trùng

- Một lần uống chỉ có **một** bản xác nhận: unique `(schedule_id, scheduled_at)` + atomic update (`findOneAndUpdate`).
- Confirm đồng thời (hai yêu cầu song song): chỉ một kết quả thành công; yêu cầu kia nhận `409 CONFLICT` hoặc (nếu cùng `clientRequestId`) kết quả idempotent.
- Sửa lịch sử lần uống bằng API: **không có endpoint nào cho phép** sửa/ xóa `confirmed_at`, `status` đã kết thúc.

## 2. Nhắc lại (snooze)

| Quy tắc | Chi tiết |
|---|---|
| Giới hạn | Mặc định cách nhau **10 phút**, tối đa **3 lần**. Người dùng có thể chỉnh ở M08 (`users.preferences.snoozeMinutes` 5–30, `snoozeMax` 1–5) — backend tuân theo; thiếu/sai → mặc định |
| Không nhắc lại lần đã xác nhận | Snooze chỉ hợp lệ khi status ∈ {pending, snoozed, overdue} |
| Vượt quá hạn trong ngày | Nếu giờ nhắc lại vượt quá 23:59 giờ địa phương hoặc vượt `scheduled_at + 2 giờ`, server từ chối với `409 CONFLICT` |
| Thông báo | Mỗi lần snooze → server gửi push mới sau `snoozeMinutes`; push cũ không gửi lại |

## 3. Thay đổi lịch uống

| Quy tắc | Chi tiết |
|---|---|
| Hiệu lực | Lịch mới có hiệu lực từ `effectiveFrom`; các lần uống có `scheduled_at >= thời điểm lưu` dùng phiên bản mới |
| Lịch sử | Các lần uống đã xảy ra (pending trở đi đã có bản ghi) **không bị sửa**; giữ nguyên `schedule_version` cũ |
| Đổi lịch đang hoạt động | App yêu cầu xác nhận trước khi lưu; server tăng `current_version`, lưu snapshot vào `schedule_versions` |
| Nhắc giờ uống | Server (node-cron) tự tính lại push cho các lần uống tương lai theo phiên bản mới; không có thông báo cục bộ nào cần hủy ở client |
| Ngừng thuốc | Thuốc → `discontinued`; mọi lịch liên quan → `archived`; lần uống tương lai bị xóa; lần uống quá khứ giữ nguyên |

## 4. Sinh lần uống (node-cron)

- Chạy mỗi phút, quét lịch `status=active` có `effective_from <= ngày <= effective_to` (hoặc không thời hạn).
- Sinh `dose_occurrences` cho các ngày cần thiết (MVP: sinh trước 7 ngày).
- Gửi push tại `scheduled_at` và các mốc snooze; bỏ qua nếu lần uống không còn ở trạng thái `pending/snoozed` (đã xác nhận, đã bỏ qua, hoặc lịch đã ngừng).
- Không sinh trùng: unique `(schedule_id, scheduled_at)`.
- node-cron chỉ chạy trên một instance (single-instance MVP); nếu mở rộng đa instance cần cơ chế khóa (ghi nhận).

## 5. Người thân

| Quy tắc | Chi tiết |
|---|---|
| Mã mời | 6 chữ số, có hạn *(15 phút — Q8)*; lưu SHA-256; mỗi lần tạo, mã cũ vô hiệu |
| Mã không đồng nghĩa quyền | Nhập đúng mã → tạo connection; connection mới chỉ có quyền được cấp khi chấp nhận |
| Kiểm tra quyền | Mọi thao tác xem/sửa kiểm tra tại backend; không tin client |
| Thu hồi | Ngắt kết nối hoặc đổi quyền → có hiệu lực ngay ở yêu cầu kế tiếp |
| Dữ liệu | Không gửi dữ liệu lịch/sức khỏe khi connection không `view_schedule` |
| Cảnh báo bỏ lỡ | Chỉ lần uống đã `confirmed` là **không** báo người thân. Mọi trạng thái khác — kể cả `cannot_take` (không uống được / đang bận) — đều báo. Lần uống **chưa được xác nhận** quá `RELATIVE_ALERT_AFTER_MINUTES` phút (mặc định **10**, cấu hình ở `backend/.env`) → push cho người thân có `relative_alerts=true`; mốc tính từ giờ đến hạn **cuối cùng** (`snoozed_until` nếu đã “nhắc lại sau”). Bấm “không thể uống” → gửi ngay (nếu chưa từng gửi cho lần uống đó). Mỗi người nhận tối đa **một push** cho mỗi lần uống (chống trùng theo dose+kind+người nhận) |
| Xem lịch hộ | Người thân có `view_schedule` xem được lịch uống (M03) và thuốc (M04) của chủ hồ sơ ở chế độ **chỉ xem** (`?ownerId=`); **không** ghi thay được lần uống (xác nhận/nhắc lại/không thể uống luôn dành cho chủ hồ sơ) |

## 6. Thống kê M01

- Tính theo **ngày hiện tại theo múi giờ người dùng** (`users.timezone`, mặc định Asia/Ho_Chi_Minh).
- `confirmed` = số lần có status = confirmed trong ngày.
- `remaining` = tổng lần trong ngày − confirmed − cannot_take − missed.
- Đúng cả khi “bữa nửa đêm”: ngày thống kê theo local date của người dùng, không theo UTC.

## 7. Nguyên tắc nghiệp vụ chung

1. Không suy luận liều lượng: mọi nội dung thuốc do người dùng nhập, ứng dụng chỉ lưu/hiển thị.
2. Không có chỉ định y tế, không có cảnh báo y tế.
3. Mọi thao tác ghi quan trọng đều ghi `audit_logs` (tạo/sửa/ngừng thuốc, đổi lịch, kết nối/ngắt người thân).
4. Thông báo “đã gửi” ≠ “đã xác nhận uống” — tách bạch trong dữ liệu và UI.

## 8. Khu vực vận hành (`/admin`)

| Quy tắc | Nội dung |
|---|---|
| Ai được vào | `users.role = 'manager'` hoặc `'admin'`. Người dùng thường → 403; chưa đăng nhập → 401. Không có màn hình đăng ký admin |
| Quyền của quản lý | Xem số liệu/danh sách, khóa/mở **tài khoản người dùng**; không đặt lại mật khẩu, không đổi vai trò, không thao tác tài khoản manager/admin |
| Quyền của admin | Toàn bộ quyền quản lý + đổi vai trò `user`/`manager`/`admin` + xóa vĩnh viễn tài khoản `user` |
| Cấp quyền | Admin đổi trong `/admin` (có audit); CLI: `npm run admin:grant -- <email/SĐT> [--role user\|manager\|admin]` hoặc `npm run role:set -- ...`. Không có API tự cấp quyền |
| Phạm vi dữ liệu | **Chỉ đọc số đếm** + danh sách người dùng (tên, SĐT, email, vai trò, trạng thái khóa, số thuốc/liều/thiết bị). **Không** trả tên thuốc, hướng dẫn, lý do không uống cho bất kỳ vai trò nào |
| Khóa tài khoản | Gọi Firebase `disabled=true` + thu hồi refresh token + lưu `disabled_at`; `authMiddleware` chặn **ngay** mọi API bằng 403. Không thể tự khóa chính mình. Manager chỉ khóa được tài khoản người dùng |
| Mở khóa | `disabled=false` + `disabled_at=null`; người dùng đăng nhập lại bình thường |
| Đặt lại mật khẩu | Khu vực admin **không** đặt lại mật khẩu; route trả 403 vì lý do bảo mật. Người dùng tự đổi/khôi phục mật khẩu qua Firebase ở màn hình đăng nhập hoặc hồ sơ |
| Đổi vai trò | **Chỉ admin**; không thể tự đổi vai trò của mình; không thể hạ quyền admin đang hoạt động cuối cùng; hiệu lực ngay ở API, UI cần tải lại |
| Nhật ký | Mỗi lần khóa/mở/đổi vai trò/xóa tài khoản ghi `audit_logs` (`admin_lock`, `admin_unlock`, `admin_set_role`, `admin_delete_user`) kèm `details.admin_id`; không ghi mật khẩu |
| Xóa tài khoản | **Chỉ admin**, chỉ tài khoản `role='user'`, không tự xóa mình. Xóa dữ liệu liên quan trong MongoDB, xóa Firebase user (best-effort) và ghi audit `admin_delete_user` |

---

## Điểm cần duyệt

1. Bảng giá trị mặc định: quá giờ 30 phút, snooze 10 phút × 3 lần, missed sau 2 giờ.
2. Xác nhận muộn trong cùng ngày được đánh dấu `is_late_confirmation`.
3. Sinh trước 7 ngày các lần uống.
4. Quy tắc đổi lịch: không sửa lịch sử, sinh lại lần uống tương lai theo phiên bản mới.
5. Mã mời 6 chữ số, hạn 15 phút, mỗi lần tạo thì mã cũ vô hiệu.
6. `/admin` có 2 vai trò hậu trường — `manager` (xem số liệu/danh sách, khóa/mở tài khoản người dùng) và `admin` (thêm đổi vai trò, xóa vĩnh viễn tài khoản `user`). Không xem nội dung y tế chi tiết; không đặt lại mật khẩu qua khu vực admin.
