# OPEN_QUESTIONS — Câu hỏi cần người dùng duyệt

Mọi mục dưới đây cần người dùng trả lời trước (hoặc trong) giai đoạn BUILD liên quan. Agent không tự quyết.

| # | Câu hỏi | Ảnh hưởng | Đề xuất của agent | Trạng thái |
|---|---|---|---|---|
| Q1 | Firebase plan: người dùng dùng Spark (miễn phí) → Phone/OTP SMS không khả dụng. Đã chuyển sang Email/Mật khẩu. Xác nhận? | Giai đoạn 2 (xác thực) | Dùng Email/Mật khẩu trên Spark | Chờ xác nhận |
| Q2 | iOS/PWA: có thiết bị iPhone/iPad để kiểm thử Web Push qua “Thêm vào màn hình chính” không? | Giai đoạn 5, 8 | Nếu không: chỉ test Chrome/Edge + Android, ghi rõ giới hạn iOS trong README | Chờ duyệt |
| Q3 | Giá trị mặc định nghiệp vụ: quá giờ sau 30 phút; nhắc lại cách 10 phút tối đa 3 lần; tự chuyển “bỏ qua” sau 2 giờ hoặc hết ngày; cho phép xác nhận muộn trong cùng ngày. | BUSINESS_RULES, backend, thông báo | Dùng đúng các giá trị trên | Chờ duyệt |
| Q4 | Chính sách lưu giữ và xóa dữ liệu: giữ lịch sử uống thuốc bao lâu? Khi người dùng xóa tài khoản thì xóa mềm hay cứng? | DATABASE_PLAN, backend, **/admin** | Giữ vô thời hạn đến khi người dùng xóa tài khoản; xóa cứng toàn bộ dữ liệu trong 30 ngày sau yêu cầu. **Chưa quyết → chưa có nút xóa tài khoản ở `/admin`** | Chờ duyệt |
| Q5 | Phải xác nhận hành động quan trọng nào trên giao diện? (lưu lịch mới, đổi lịch đang hoạt động, ngắt kết nối người thân, ngừng thuốc) | INTERFACE_SPEC | Xác nhận cả 4 hành động trên | Chờ duyệt |
| Q6 | Múi giờ hiển thị mặc định: Asia/Ho_Chi_Minh có đúng cho mọi người dùng không? | DATABASE_PLAN, backend | Đúng, cho phép người dùng đổi ở M08 | Chờ duyệt |
| Q7 | Người thân chỉ có quyền “xem lịch” ở MVP; quyền “thiết lập thuốc” nằm ở giai đoạn mở rộng — xác nhận phân tầng. | BUILD_ROADMAP, M07 | Đúng như phân tầng đã viết | Chờ duyệt |
| Q8 | Mã mời kết nối người thân: dùng số 6 chữ số dễ đọc cho người cao tuổi (thay vì mã dài) — có chấp nhận đánh đổi bảo mật nhẹ không? | M07, backend | Mã 6 chữ số, có hạn 15 phút, mỗi lần tạo thì mã cũ vô hiệu | Chờ duyệt |
| Q11 | Đăng nhập bằng SĐT không dùng OTP (Spark plan không hỗ trợ Phone Auth) mà qua **email nội bộ `<sđt>@med.local`** — chấp nhận đánh đổi: SĐT không được xác thực thật, quên mật khẩu phải liên hệ admin? | Xác thực, M08 | Dùng email nội bộ; SĐT/địa chỉ lưu vào hồ sơ (`users.phone`/`users.address`) | **Đã chốt 20/10/2026** (người dùng chọn) |

## Các câu hỏi đã đóng

| # | Câu hỏi | Quyết định |
|---|---|---|
| Q9 | Quy tắc snooze “không vượt quá 23:59 giờ địa phương” chưa được cài? | **Đã cài 20/10/2026** (`snoozeDenyReason`, trả `409` nếu giờ nhắc lại sang ngày địa phương kế tiếp); có test B8 |
| Q10 | M05 khi SỬA thuốc: API đã duyệt không có cách thêm/xóa một giờ trong lịch? | **Đã bổ sung 20/10/2026 theo duyệt của người dùng**: thêm `POST /medications/:id/schedules` và `DELETE /medications/schedules/:id` để sửa đầy đủ (đây là việc ngoài kế hoạch Giai đoạn 4, có test; xem API_SPEC 2.3–2.4) |
| Q12 | Có nên có giao diện quản trị? Nếu có thì làm gì? | **Đã chốt và triển khai 20/10/2026, mở rộng 27/10/2026**: khu vực `/admin` ngoài M01–M08 (không phải M09) — manager xem số liệu/danh sách + khóa/mở tài khoản người dùng; admin thêm đặt lại mật khẩu + đổi vai trò; thêm `users.role` (`user`/`manager`/`admin`) + `users.disabled_at`. Không xóa tài khoản (Q4) |

## Các câu hỏi đã đóng

| # | Câu hỏi | Quyết định |
|---|---|---|
| Q-đã | Cơ chế đăng nhập? | ~~Firebase SĐT + OTP SMS~~ → **Firebase Email + Mật khẩu** (Spark plan, đổi 19/10/2026) |
| Q-đã | Phạm vi theo dõi sức khỏe? | Hạn chế ở tuân thủ uống thuốc (người dùng chọn) |
| Q-đã | Thư viện thông báo? | ~~Notifee (cục bộ trên thiết bị)~~ → **Web Push (FCM for Web + Service Worker)**, server node-cron làm kênh chính (đổi 19/10/2026) |
| Q-đã | Nền tảng giao diện? | ~~React Native (app di động)~~ → **React + Vite + TypeScript (website responsive, PWA)** (đổi 19/10/2026; `mobile/` đã gỡ) |
| Q-đã | Lập lịch phía server? | node-cron |
| Q-đã | Cơ sở dữ liệu? | ~~MySQL + Sequelize~~ → **MongoDB + Mongoose** (đổi 19/10/2026 theo yêu cầu) |

---

## Điểm cần duyệt

1. Trả lời Q1–Q8 (ít nhất Q1, Q3 trước Giai đoạn 2–3).
2. Xác nhận danh sách câu hỏi đóng.
