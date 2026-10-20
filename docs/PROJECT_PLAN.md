# PROJECT PLAN — Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi

## 1. Mục tiêu

Ứng dụng **website responsive (mobile-first)** giúp người cao tuổi: xem lịch uống thuốc, xác nhận đã uống, ghi nhận trường hợp chưa thể uống, kết nối với người thân, và theo dõi tuân thủ uống thuốc. Mở vừa màn hình điện thoại (không cần cài đặt), đồng thời dùng tốt trên máy tính.

Ưu tiên: giao diện đơn giản, dễ đọc, chữ lớn; dữ liệu nhất quán; thông báo đáng tin cậy có cơ chế xử lý khi trễ hoặc không xác nhận; bảo vệ thông tin cá nhân và sức khỏe; kiến trúc dễ bảo trì, dễ kiểm thử.

## 2. Phạm vi

- **Trong phạm vi**: 8 màn hình M01–M08 (không thêm, xóa, đổi tên) trên website responsive; xác thực Firebase Email/Mật khẩu (Spark plan); thông báo Web Push (FCM for Web + Service Worker, PWA); backend Node.js/Express + MongoDB/Mongoose; kết nối người thân với phân quyền; theo dõi tuân thủ uống thuốc qua thống kê M01 và lịch sử M06.
- **Ngoài phạm vi**: màn hình thứ chín; quản lý bệnh viện; tư vấn y tế bằng AI; chẩn đoán bệnh; chỉ định/liều lượng y tế; thêm vai trò ngoài “người cao tuổi (chủ hồ sơ)” và “người thân”.

## 3. Công nghệ đã chốt

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện web | React + Vite + TypeScript | SPA responsive mobile-first, kèm PWA (manifest + Service Worker) |
| Backend API | Node.js + Express (TypeScript) | Một backend duy nhất, không FastAPI/backend thứ hai |
| Thông báo | Web Push — Firebase Cloud Messaging for Web + Service Worker | Kênh chính: server (node-cron) gửi push đúng giờ; đồng bộ, thông báo người thân; PWA để bật push trên iOS Safari |
| Xác thực | Firebase Authentication (Email + Mật khẩu — Spark plan) | Backend xác minh ID token; Phone/OTP bị loại vì Spark không hỗ trợ |
| Cơ sở dữ liệu | MongoDB + Mongoose | |
| Lập lịch phía server | node-cron | Sinh lần uống, gửi Web Push đúng giờ, chuyển trạng thái quá giờ |
| Cấu hình | Biến môi trường, tách dev/test/prod | Không commit .env, khóa dịch vụ |
| Kiểm thử | Đơn vị, API, tích hợp, trình duyệt/thiết bị thật | |

## 4. Quyết định cần duyệt đã chốt (người dùng đã chọn)

| Hạng mục | Quyết định |
|---|---|
| Nền tảng | **Website responsive, mobile-first + PWA** (đổi từ ứng dụng di động React Native — 19/10/2026; `mobile/` đã gỡ, `web/` thay thế) |
| Đăng nhập | Firebase Authentication Email + Mật khẩu (Spark plan — Phone/OTP SMS không hỗ trợ trên Spark) — luồng xác thực hệ thống trước M01, không phải màn hình mới trong danh sách M01–M08 |
| Phạm vi sức khỏe | “Theo dõi sức khỏe” = theo dõi tuân thủ uống thuốc (thống kê M01, lịch sử M06). Không nhập/hiển thị chỉ số y tế riêng |
| Thông báo | **Web Push (FCM for Web + Service Worker)** — đổi từ Notifee (19/10/2026); server node-cron là kênh nhắc chính |
| Lập lịch server | node-cron |
| CSDL | MongoDB + Mongoose (đổi từ MySQL theo yêu cầu người dùng 19/10/2026) |

Các giá trị đánh dấu *(mặc định đề xuất)* ở BUSINESS_RULES.md cần người dùng duyệt.

## 5. Nguyên tắc bắt buộc

1. Thứ tự ưu tiên khi xung đột: phạm vi đã duyệt > an toàn dữ liệu > quy tắc nghiệp vụ > đề xuất của agent.
2. Không tự thêm module, tính năng, vai trò ngoài phạm vi; không ghi đè mã nguồn khi chưa kiểm tra cấu trúc.
3. Không giả định API/CSDL/Firebase đã cấu hình xong; không dùng dữ liệu mẫu để giả vờ kết nối backend thật.
4. Không đưa liều lượng hoặc chỉ định y tế. Chỉ lưu và hiển thị thông tin do người dùng nhập.
5. PLAN: không viết mã triển khai, không cài thư viện. BUILD: chỉ khi người dùng yêu cầu rõ ràng, làm theo BUILD_ROADMAP.md.
6. Yêu cầu chưa rõ/mâu thuẫn → ghi OPEN_QUESTIONS.md, chờ duyệt, không tự quyết.
7. Báo cáo trung thực: đã làm, chưa làm, còn lỗi.

## 6. Vai trò người dùng

- **Người cao tuổi** (chủ hồ sơ): toàn quyền với dữ liệu của mình.
- **Người thân**: được ủy quyền qua kết nối M07 — quyền “xem lịch” hoặc (giai đoạn mở rộng) “thiết lập thuốc”.

Cùng một website, phân biệt bằng quan hệ kết nối ở M07.

## 7. Kết quả đầu ra giai đoạn PLAN

10 tài liệu trong `docs/`: PROJECT_PLAN.md, INTERFACE_SPEC.md, ARCHITECTURE.md, DATABASE_PLAN.md, API_SPEC.md, BUSINESS_RULES.md, NOTIFICATION_PLAN.md, TEST_PLAN.md, BUILD_ROADMAP.md, OPEN_QUESTIONS.md. Mỗi file có mục “Điểm cần duyệt” ở cuối.

---

## Điểm cần duyệt

1. Xác nhận các quyết định ở mục 4 (gồm thay đổi nền tảng sang website responsive + Web Push ngày 19/10/2026).
2. Phạm vi “sức khỏe” = tuân thủ uống thuốc — xác nhận không cần chỉ số huyết áp/cân nặng v.v. ở phiên bản này.
3. Firebase Spark plan: Phone/OTP SMS không khả dụng → đăng nhập Email/Mật khẩu (đã đổi 19/10/2026).
4. Web Push: cần PWA (manifest + “Thêm vào màn hình chính”) để push chạy trên iOS Safari; trang đóng thì server node-cron gửi push — NOTIFICATION_PLAN.md nêu giới hạn.
5. Giá trị mặc định nghiệp vụ (quá giờ 30’, nhắc lại 10’×3, bỏ qua sau 2h) — duyệt ở BUSINESS_RULES.md.
