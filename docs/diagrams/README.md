# PlantUML diagrams

These diagrams document the current MedReminder backend and its published API/architecture specifications.

## Sources

- source/use-case.puml — elderly profile owner, family member, operations manager and system administrator.
- source/sequence-login.puml — Firebase Authentication and backend profile sync.
- source/sequence-add-medication.puml — medication, schedule, schedule version and audit log creation.
- source/sequence-confirm-dose.puml — dose confirmation and idempotency.
- source/sequence-push-notification.puml — node-cron, Firebase Cloud Messaging and Service Worker.
- source/api-routes.puml — generated inventory of static Express route declarations.

## Run from repository root (PowerShell)

```powershell
node tools/diagram-generator/generate.mjs
node tools/diagram-generator/generate.mjs watch
node tools/diagram-generator/generate.mjs render
```

The generator requires only Node.js to update the route inventory. The watch mode watches backend route/controller/service/model TypeScript files. It automatically refreshes the route inventory; when business logic changes, review the hand-authored sequence diagrams because arbitrary TypeScript changes cannot be converted into correct business semantics automatically.

The render command additionally requires Java and PlantUML CLI available on PATH (or set PLANTUML_CMD). SVG and PNG files are written alongside the .puml source files.

## Limitations

The route scanner recognizes static calls such as router.get('/path', ...) in backend/src/routes/*.ts. Dynamically constructed routes or nested routers may not be detected. No credentials or user data are included.
