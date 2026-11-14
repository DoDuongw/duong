# Bộ sơ đồ MedReminder

Tất cả file PlantUML nằm trong `source/` và được đặt tên theo **số thứ tự + loại sơ đồ** để dễ nhận biết.

- `so-do-kien-truc`, `so-do-chuc-nang`, `so-do-dieu-huong`, `so-do-du-lieu-erd`: sơ đồ cấu trúc/nền tảng.
- `so-do-trang-thai-...`: sơ đồ trạng thái (state machine).
- `so-do-trinh-tu-...`: sơ đồ trình tự (sequence diagram).
- `danh-muc-api`: danh mục endpoint, không phải sơ đồ luồng.

## Bảng phân loại

| STT | File | Loại sơ đồ | Nội dung |
|---|---|---|---|
| 01 | `source/01-so-do-kien-truc.puml` | Kiến trúc (component) | Expo app native + Expo Web, Express API, MongoDB, Firebase Auth, FCM/Expo Push, node-cron, uploads cục bộ |
| 02 | `source/02-so-do-chuc-nang.puml` | Use case | Tác nhân và chức năng theo vai trò chủ hồ sơ, người thân, manager, admin |
| 03 | `source/03-so-do-dieu-huong.puml` | Điều hướng màn hình | Expo Router: tabs, stack, deep link từ push, tab Vận hành theo vai trò |
| 04 | `source/04-so-do-du-lieu-erd.puml` | ERD | 12 collection MongoDB và quan hệ logic |
| 05 | `source/05-so-do-trang-thai-lan-uong.puml` | State machine | Trạng thái lần uống và điều kiện chuyển |
| 06 | `source/06-danh-muc-api.puml` | Danh mục API | 40 endpoint, có mount prefix `/api/v1` |
| 07 | `source/07-so-do-trinh-tu-dang-nhap.puml` | Sequence | Firebase Auth, đồng bộ hồ sơ, đăng ký thiết bị |
| 08 | `source/08-so-do-trinh-tu-them-thuoc.puml` | Sequence | Tạo thuốc, lịch, phiên bản lịch và audit log |
| 09 | `source/09-so-do-trinh-tu-xac-nhan-uong.puml` | Sequence | Xác nhận lần uống, kiểm tra quyền và idempotency |
| 10 | `source/10-so-do-trinh-tu-gui-push.puml` | Sequence | Cron, chọn payload, FCM/Expo Push và deep link |
| 11 | `source/11-so-do-trinh-tu-moi-nguoi-than.puml` | Sequence | Tạo mã mời, giới hạn tần suất và kết nối người thân |
| 12 | `source/12-so-do-trinh-tu-canh-bao-nguoi-than.puml` | Sequence | Cảnh báo người thân khi lần uống chưa xác nhận hoặc `cannot_take` |
| 13 | `source/13-so-do-trinh-tu-hoi-tham-suc-khoe.puml` | Sequence | Push hỏi thăm sức khỏe 10 phút sau khi xác nhận và lưu câu trả lời |
| 14 | `source/14-so-do-trinh-tu-admin-khoa-tai-khoan.puml` | Sequence | Khóa/mở tài khoản qua khu vận hành |

Hiện bộ sơ đồ **không có activity diagram riêng**. Các luồng hoạt động được mô tả bằng:

- **Sequence diagram**: các file `07`–`14`.
- **State machine**: file `05` cho vòng đời lần uống.

Nếu cần activity diagram cho một luồng cụ thể (ví dụ xác nhận uống hoặc gửi push), có thể bổ sung sau.

## Tạo và xem sơ đồ (PowerShell)

Chạy từ thư mục gốc repository:

```powershell
node tools/diagram-generator/generate.mjs
node tools/diagram-generator/generate.mjs render
```

Lệnh `generate` tạo lại `source/06-danh-muc-api.puml` từ các khai báo tĩnh trong `backend/src/routes/*.ts` và đọc mount prefix từ `backend/src/app.ts`, nên nhãn hiển thị đầy đủ dạng `GET /api/v1/users/me`.

Lệnh `render` cần Java và PlantUML CLI trong `PATH` (hoặc biến `PLANTUML_CMD`); SVG/PNG được tạo cạnh file `.puml`.

Theo dõi route khi đang phát triển:

```powershell
node tools/diagram-generator/generate.mjs watch
```

Watch mode tự động tạo lại danh mục route. Khi logic nghiệp vụ trong service/model thay đổi, cần xem lại các sơ đồ trình tự viết tay; không thể suy ra đúng ý nghĩa nghiệp vụ chỉ từ thay đổi TypeScript.

## Phạm vi và giới hạn

- Sơ đồ là tài liệu kỹ thuật, không thay thế API spec, business rules hay test plan.
- Route inventory phụ thuộc khai báo tĩnh `router.get/post/put/patch/delete(..., '/path', ...)`; route dựng động có thể không được phát hiện.
- ERD mô tả quan hệ logic; dữ liệu thực tế lưu trong MongoDB với `ObjectId`.
- Push có thể trễ do mạng, quyền thông báo, trình duyệt và chính sách hệ điều hành.
- iOS native push cần tài khoản Apple Developer và cấu hình APNs; Expo Web cần HTTPS công khai để FCM Web Push ổn định ngoài localhost/LAN.
- Phạm vi “theo dõi sức khỏe” hiện tại là tuân thủ uống thuốc và hỏi thăm cảm giác sau uống, không chẩn đoán hay tư vấn y tế.
- Không đưa `.env`, khóa Firebase, token hay dữ liệu người dùng vào sơ đồ.
