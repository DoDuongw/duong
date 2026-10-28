# INTERFACE SPEC — Đặc tả màn hình M01–M08 + khu vực vận hành

## Yêu cầu chung cho người cao tuổi

- Chữ lớn (cỡ chữ cơ bản tối thiểu 18px ≈ 1.125rem, mặc định 20px; tùy chọn trong M08), độ tương phản cao.
- Nút lớn, nhãn rõ nghĩa; mỗi màn hình tối đa một hành động chính nổi bật.
- Không chỉ dùng màu để biểu thị trạng thái — luôn kèm icon hoặc nhãn chữ.
- Trạng thái: **tải** (spinner + text), **rỗng** (icon + hướng dẫn), **lỗi** (thông báo + nút thử lại).
- Không báo thành công khi server chưa xác nhận.
- **Responsive mobile-first**: đúng tỉ lệ trên điện thoại (ưu tiên) đến màn hình lớn; bottom tab ở viewport nhỏ, nav ngang ở màn hình lớn; không thao tác vuốt phức tạp cho hành động chính.
- Có thể “Thêm vào màn hình chính” (PWA) — nhắc nhẹ trong M08, không chặn luồng chính.
- Xác nhận hành động quan trọng (theo Q5): lưu lịch mới, đổi lịch đang hoạt động, ngừng thuốc, ngắt kết nối người thân.

---

## Luồng đăng nhập (bước hệ thống trước M01 — không phải màn hình thứ 9)

Không có màn hình đăng nhập riêng trong danh sách M01–M08. Đăng nhập là luồng xác thực hệ thống, hiển thị khi trang chưa có phiên hợp lệ:

1. Nhập email + mật khẩu (đăng nhập hoặc tạo tài khoản) → Firebase tạo ID token.
2. Web gọi `POST /users/me/sync` để tạo/cập nhật bản ghi user trong backend.
3. Vào M01.

Giao diện luồng này đơn giản (email + mật khẩu, chữ lớn), dùng chung component Auth trong `src/screens/Login/`. Nếu token hết hạn → yêu cầu xác thực lại, giữ nguyên dữ liệu đã nhập.

---

## M01. Trang chủ

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Tổng quan hôm nay: thuốc tiếp theo, thống kê, truy cập nhanh |
| Thành phần | Chào + tên người dùng; ngày hiện tại (theo timezone user); card “Thuốc cần uống tiếp theo” (tên, giờ, hướng dẫn); 4 nhóm sáng/trưa/chiều/tối; thống kê “Đã xác nhận X / còn Y”; nút nhanh tới M03, M07 |
| API | `GET /doses/today` |
| Hành động chính | Nút lớn “Đã uống thuốc” (chỉ hoạt động khi có lần uống pending/overdue sắp tới hoặc hiện tại) |
| Trạng thái | Tải: skeleton; Rỗng: “Hôm nay chưa có lịch uống thuốc” + nút tới M04; Lỗi: nút thử lại |
| Kiểm tra | Chặn xác nhận trùng (đã confirm → disabled, hiển thị “Đã xác nhận”) |

## M02. Nhắc uống thuốc

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Xác nhận một lần uống cụ thể (mở từ thông báo Web Push hoặc M01/M03) |
| Thành phần | Tên thuốc; liều đã thiết lập; giờ dự kiến; hướng dẫn đã nhập; trạng thái hiện tại |
| API | `POST /doses/:id/confirm`, `POST /doses/:id/snooze`, `POST /doses/:id/cannot-take` |
| Hành động | “Đã uống” / “Nhắc lại sau” / “Không thể uống” (bắt buộc chọn/nhập lý do — hộp thoại có sẵn lý do phổ biến + nhập tự do) |
| Trạng thái | Thành công chỉ khi server xác nhận 2xx; lỗi mạng → giữ nguyên trạng thái, nút thử lại; đang gửi → disabled tránh bấm trùng |
| Ghi chú | Lưu thời điểm xác nhận do server ghi (`confirmed_at`); hiển thị “xác nhận muộn” nếu sau giờ dự kiến. **Người thân mở hộ** (bấm từ notification relative alert, hoặc từ lịch xem hộ) → server trả `canAct=false` → chỉ hiện “Chỉ xem”, ẩn 3 nút hành động và bỏ qua `?action=`; giờ hiển thị theo múi giờ của **chủ hồ sơ** (`timezone` trong phản hồi) |

## M03. Lịch uống thuốc

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Xem lịch theo ngày, phân biệt trạng thái |
| Thành phần | Chọn ngày (hôm nay / ngày trước / ngày sau); nhóm theo buổi và giờ; mỗi dòng: tên thuốc, giờ, trạng thái kèm **icon + nhãn** (đã xác nhận / đang chờ / quá giờ / đã bỏ qua hoặc không thể uống) |
| API | `GET /doses?date=`; nếu trên URL có `?ownerId=` → `GET /doses?date=&ownerId=` |
| Hành động | Bấm dòng → M02 (nếu còn chờ) hoặc chi tiết read-only |
| Trạng thái | Phân biệt lịch dự kiến (tương lai) với lịch sử thực tế; không tự đánh dấu đã uống khi đến giờ |
| Xem hộ (người thân) | Có `?ownerId=` → hiện banner “Đang xem lịch của &lt;tên&gt;” + nút “Về danh sách người thân”; ngày/buổi tính theo múi giờ **của chủ hồ sơ**; không có thao tác ghi ở màn này |

## M04. Danh sách thuốc

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Quản lý thuốc đang dùng / đã ngừng |
| Thành phần | Tab “Đang dùng” / “Đã ngừng”; mỗi dòng: tên, ảnh nhỏ, liều, tóm tắt lịch; bấm → chi tiết |
| API | `GET /medications?status=`; `POST /medications/:id/discontinue` |
| Hành động | “Thêm thuốc” (→ M05); “Sửa” (→ M05); “Ngừng” (xác nhận; không xóa lịch sử) |
| Quyền | Nút thêm/sửa/ngừng ẩn hoặc disabled nếu không có quyền (người thân chỉ xem ở MVP) |
| Trạng thái | Rỗng: “Chưa có thuốc nào” + hướng dẫn |
| Xem hộ (người thân) | Có `?ownerId=` → tiêu đề “Thuốc của &lt;tên&gt;”, banner “Bạn đang xem thuốc của …” + nút quay lại; ẩn “Thêm thuốc”/“Sửa”/“Ngừng”; gọi `GET /medications?status=&ownerId=` |

## M05. Thêm hoặc chỉnh sửa thuốc

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Tạo/sửa thuốc và lịch uống |
| Thành phần | Tên (bắt buộc); ảnh (tùy chọn); liều theo đơn (text); số lần/ngày + giờ cụ thể (danh sách giờ); ngày bắt đầu (bắt buộc) / kết thúc; ghi chú trước/sau ăn; hướng dẫn |
| API | `POST /medications`, `PATCH /medications/:id`, `PUT /schedules/:id` |
| Kiểm tra đầu vào | Tên 1–200 ký tự; ≥1 giờ; giờ hợp lệ; ngày bắt đầu ≤ kết thúc; hiển thị lỗi ngay dưới trường |
| Hành động | “Lưu”; nếu đổi lịch đang hoạt động → hộp thoại xác nhận (“Thay đổi sẽ áp dụng cho các lần uống tương lai, lịch sử giữ nguyên”) |
| Trạng thái | Đang gửi: disabled; lỗi server: giữ dữ liệu đã nhập, nút thử lại |

## M06. Lịch sử uống thuốc

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Xem các lần nhắc trong quá khứ |
| Thành phần | Bộ lọc: khoảng ngày, thuốc; danh sách phân trang (trước/sau); mỗi dòng: tên thuốc, giờ dự kiến, giờ gửi nhắc, giờ xác nhận (hoặc lý do không thể uống / bỏ qua), badge “xác nhận muộn” |
| API | `GET /history?from=&to=&medicationId=&page=` |
| Trạng thái | Rỗng: “Không có dữ liệu trong khoảng này”; phân trang tải dần |

## M07. Người thân và kết nối

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Kết nối với người thân, quản lý quyền |
| Thành phần | **Nút “← Quay lại”** (về trang trước, mở trực tiếp bằng URL thì về Trang chủ); danh sách người thân đã kết nối + quyền hiện tại; “Tạo mã mời” → hiển thị mã 6 chữ số + đếm ngược hạn; nhập mã mời (tab “Nhập mã”); từng kết nối: xem quyền, đổi quyền (owner), ngắt kết nối; ở vai trò **người thân** (có quyền `view_schedule`): nút **“Xem lịch uống thuốc”** → M03 với `?ownerId=` |
| API | `POST /family/invites`, `POST /family/invites/:code/accept`, `GET /family/connections`, `PATCH /family/connections/:id/permissions`, `DELETE /family/connections/:id` |
| Kiểm tra | Mã sai/hết hạn → thông báo rõ; mỗi thao tác ghi log; ngắt kết nối cần xác nhận |
| Trạng thái | Rỗng: “Chưa có người thân kết nối” |

## M08. Cá nhân và cài đặt

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Tài khoản, tùy chỉnh, đăng xuất |
| Thành phần | Email (đã xác thực); tên hiển thị; múi giờ; cỡ chữ (nhỏ/vừa/lớn); âm thanh; giọng đọc hướng dẫn (Web Speech API — ẩn nếu trình duyệt không hỗ trợ); cài đặt nhắc lại (số phút 5–30, số lần 1–5 — backend tuân theo); cấu hình thông báo cho người thân (bật/tắt `relative_alerts` theo từng kết nối); trạng thái quyền Notifications + hướng dẫn cấp quyền / “Thêm vào màn hình chính” (iOS); đăng xuất. **Không chứa lối vào quản trị** (đã chuyển thành nút cố định ngoài M08) |
| API | `PATCH /users/me`, `PATCH /users/me/notification-settings`, `DELETE /users/devices/unregister` |
| Kiểm tra trình duyệt | Giọng đọc: kiểm tra `speechSynthesis` trước khi hiển thị; quyền Notifications: hiển thị trạng thái thật; không lưu mật khẩu dạng văn bản |
| Hành động | Đăng xuất → xác nhận → hủy token thiết bị, xóa phiên local, về luồng đăng nhập |

---

## Khu vực vận hành `/admin` — NGOÀI M01–M08 (không phải M09)

Khu vực hậu trường cho tài khoản `role='manager'` hoặc `'admin'`, giao diện riêng (không dùng bottom tab), mật độ thông tin cao hơn ứng dụng người cao tuổi nhưng vẫn dùng chung token màu y tế.

| Hạng mục | Nội dung |
|---|---|
| Mục tiêu | Theo dõi hoạt động hệ thống, khóa/mở tài khoản; admin đặt lại mật khẩu và phân quyền cho người quên mật khẩu (đặc biệt tài khoản SĐT dùng email nội bộ) |
| Điều kiện vào | `profile.role='manager'` hoặc `'admin'`; người thường thấy thông báo “không có quyền” + link về trang chủ, **không gọi API vận hành**. Lối vào là **nút cố định ở đầu trang**: “Quản trị hệ thống” với admin, “Khu vận hành” với quản lý; hiện trên mọi màn hình ứng dụng (không nằm trong M08); nút tự ẩn khi đang ở `/admin` |
| Thành phần | Thanh tiêu đề có **thời điểm cập nhật + nút “Tải lại”** và nút “← Về ứng dụng”; khối tổng quan 8 thẻ số liệu 24 giờ (người dùng, tài khoản khóa, thuốc đang dùng, liều, chưa xác nhận, kết nối người thân, thiết bị, lỗi gửi thông báo) có nhãn ngữ cảnh; bố cục **hai cột trên màn hình lớn** (danh sách người dùng bên trái, lỗi gửi thông báo + nhật ký bên phải), xếp dọc trên điện thoại; ô tìm theo tên/SĐT + “Xóa lọc”; danh sách người dùng dạng thẻ (avatar chữ cái, tên, SĐT, email, badge **Quản trị/Quản lý/Đang hoạt động/Đã khóa**, 4 số đếm, ngày tạo, múi giờ); phân trang; mục lỗi gửi thông báo; nhật ký thao tác |
| Hành động | Manager: “Khóa tài khoản”/“Mở khóa tài khoản” với tài khoản **người dùng** → hộp thoại xác nhận. Admin: thêm “Đặt lại mật khẩu” (hộp thoại mật khẩu mới + nhập lại, ≥ 8 ký tự) và “Đổi vai trò” (chọn Người dùng/Quản lý/Quản trị); “Tải lại” tải lại số liệu, người dùng, lỗi gửi thông báo và nhật ký |
| API | `GET /admin/summary`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/notifications`, `GET /admin/audit-logs`; admin thêm `POST /admin/users/:id/reset-password`, `PATCH /admin/users/:id/role` |
| Riêng tư | **Không hiển thị** tên thuốc, hướng dẫn, lý do không uống; không hiển thị token FCM hay `firebase_uid` |
| Trạng thái | Đang tải / lỗi (có thông báo + tải lại khi thao tác) / rỗng (“Không tìm thấy người dùng phù hợp”, “Không có lỗi gửi thông báo”, “Chưa có thao tác nào”) |
| Truy cập | Nút ≥ 56px, chữ chính ≥ 15–16px (nhãn phụ ≥ 14px) cho bảng vận hành; hộp thoại `role="dialog"` + `aria-modal="true"`, đóng bằng nút ✕/Hủy; nhãn `aria-label` riêng cho từng người dùng để tránh trùng tên nút |

---

## Truy cập (accessibility)

- Tương phản chữ/nền tối thiểu WCAG AA.
- Nút chính cao ≥ 56px.
- Hỗ trợ phóng to cỡ chữ/zoom trình duyệt (tới 200%) mà không mất chức năng, không tràn nút.
- Mô tả accessibility (`aria-label`) cho icon trạng thái trên M03; điều hướng bằng bàn phím cho người dùng máy tính.

---

## Điểm cần duyệt

1. Luồng đăng nhập Email/Mật khẩu như bước xác thực hệ thống trước M01 (không thêm màn hình M09).
2. Danh sách hành động cần xác nhận (Q5).
3. Hộp thoại lý do “Không thể uống” có sẵn một số lý do phổ biến + nhập tự do.
4. Mục hướng dẫn quyền Notifications/PWA đặt trong M08.
5. **Đã duyệt 20/10/2026, mở rộng 27/10/2026**: khu vực `/admin` là công cụ vận hành ngoài M01–M08 (không phải M09); manager xem số liệu/danh sách + khóa/mở tài khoản người dùng; admin thêm đặt lại mật khẩu + đổi vai trò; không hiển thị nội dung y tế chi tiết.
