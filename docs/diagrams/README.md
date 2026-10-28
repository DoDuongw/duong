# PlantUML diagrams

Bo so do mo ta he thong MedReminder theo cac tai lieu du an va ma nguon backend/web.

## Danh sach so do

### Tong quan va thiet ke
- `source/architecture.puml` — kien truc Web PWA, Express API, MongoDB, Firebase Auth/FCM va node-cron.
- `source/use-case.puml` — tac nhan va cac chuc nang theo vai tro.
- `source/screen-navigation.puml` — dieu huong M01–M08 va khu van hanh `/admin`.
- `source/erd.puml` — cac collection va quan he logic trong MongoDB.
- `source/api-routes.puml` — danh muc endpoint API; doi chieu voi `backend/src/app.ts`, `backend/src/routes/` va `docs/API_SPEC.md`.

### Luong nghiep vu
- `source/sequence-login.puml` — Firebase Authentication va dong bo ho so.
- `source/sequence-add-medication.puml` — tao thuoc, lich, phien ban lich va audit log.
- `source/sequence-confirm-dose.puml` — xac nhan lan uong, kiem tra quyen va idempotency.
- `source/dose-state-machine.puml` — cac trang thai lan uong va dieu kien chuyen.
- `source/sequence-push-notification.puml` — cron, FCM va Service Worker.
- `source/sequence-family-invite.puml` — tao ma moi va ket noi nguoi than.
- `source/sequence-relative-alert.puml` — gui canh bao nguoi than khi qua nguong chua xac nhan.
- `source/sequence-admin-lock.puml` — luong khoa/mo tai khoan qua khu van hanh.

## Tao va xem so do (PowerShell)

Chay tu thu muc goc repository:

```powershell
node tools/diagram-generator/generate.mjs
node tools/diagram-generator/generate.mjs render
```

Lenh `generate` tao lai danh muc route tu cac khai bao route tinh trong `backend/src/routes/*.ts`. Lenh `render` can Java va PlantUML CLI co trong PATH (hoac bien `PLANTUML_CMD`); SVG va PNG se duoc tao ben canh file `.puml`.

Theo doi route khi dang phat trien:

```powershell
node tools/diagram-generator/generate.mjs watch
```

Watch mode tu dong tao lai danh muc route. Khi logic nghiep vu trong service/model thay doi, can xem lai cac sequence diagram da viet tay; khong the suy ra dung y nghia nghiep vu tu moi thay doi TypeScript.

## Pham vi va gioi han

- Cac so do la tai lieu ky thuat, khong thay the API spec, business rules hay test plan.
- Route inventory phu thuoc vao khai bao tinh `router.get/post/put/patch/delete(..., '/path', ...)`; route dong co the khong duoc phat hien.
- ERD mo ta quan he logic; du lieu thuc te luu trong MongoDB voi ObjectId.
- Push co the tre do mang, quyen thong bao, trinh duyet va chinh sach he dieu hanh; iOS Safari can PWA duoc them vao man hinh chinh.
- Pham vi “theo doi suc khoe” hien tai la tuan thu uong thuoc (M01/M06), khong chan doan hay tu van y te.
- Khong dua `.env`, khoa Firebase, token hay du lieu nguoi dung vao cac so do.
