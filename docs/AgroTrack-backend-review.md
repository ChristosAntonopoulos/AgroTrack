# AgroTrack Backend Review

**SHA:** `2c62f3fb71dc720ea0cf62a734c0c90f948e486b` (confirmed via `git -C C:\Repos\AgroTrack rev-parse HEAD`; branch `main` tracking `azure/main` — **do not use `origin/main`**)  
**Date:** 2026-09-23 (Europe/Athens / EEST)  
**Scope:** Read-only review of `C:\Repos\AgroTrack\backend` — OliveLifecycle.API, Application, Core, Infrastructure, Common + *Tests. No product code changes.  
**Method:** Laptop checkout inspected via machineId `96960d64-6f34-4af9-b16d-9921d3e7501a`; sources mirrored to box for greps/reads. Inventory of all controllers; write-path tracing controller → Application service → Mongo repository (`InsertOne`/`ReplaceOne`/`UpdateOne`/`DeleteOne` via `MongoRepositoryBase` and specialized repos). Aggressive pattern scan for Mock/Fake/Stub/InMemory/demo seed/TODO/ConcurrentDictionary/etc. Auth, CORS, k8s config, indexes, and tests reviewed.  
**Persistence model note:** This backend is **MongoDB**, not EF Core. There is no `DbContext.SaveChanges`. Persistence = awaited Mongo driver writes through repositories. "Persist?" below means that mapping.

---

## Executive summary (severity-tagged)

- **[P0]** `k8s/configmap.yaml` sets `ASPNETCORE_ENVIRONMENT=Production` **and** `DemoAccounts__Seed: "true"`. Startup `DataSeeder` upserts well-known accounts (`owner@olivefarm.com` / `password123`, `admin@olivefarm.com` / `admin123`, etc.) into the live database.
- **[P0]** `DemoAccounts__ReseedFarmData` is present in config (`false`) but **never read in C#**. When Seed=true, `DemoFarmDataSeeder` **always** deletes demo-owner fields/money/harvest/notes and reseeds the Filiatra story on every process start — config flag is a no-op.
- **[P0]** Demo wipe scope includes **all extra fields owned by the hard-coded demo OwnerId** (`6755…501`), not only the three scripted parcels — catastrophic if that identity is reused or if Seed is left on against a shared DB.
- **[P1]** `FilesController` `POST /api/v1/files/upload` writes only to local disk and returns a URL under `Storage:PublicBasePath`; `Program.cs` serves that tree via `UseStaticFiles` **without auth** (photos path is blocked; other uploads are not). Guessable/leaked URLs = unauthenticated file read.
- **[P1]** `GeospatialJobQueue` records jobs in Mongo but dispatches via **in-process `Channel<>`**. No startup recovery of `Pending` jobs into the channel → refresh/backfill work is lost across pod restarts (PARTIAL persistence of the *work*, not of the job document).
- **[P1]** Multi-document writes (e.g. `FieldTaskService.CompleteAsync` creates follow-up task + execution + updates task) are **not transactional**. Only `FieldLifecycleSync` uses Mongo transactions (with a non-atomic fallback on failure).
- **[P1]** No ASP.NET rate limiting / lockout on `AuthController` login/register/forgot-password — brute-force and email spam risk, especially with Seeded weak passwords.
- **[P1]** No global `FallbackPolicy` requiring authenticated users; safety depends on every controller remembering `[Authorize]`. Currently most do; `InvitesController` / `AuthController` intentionally mix anonymous endpoints.
- **[P1]** `FieldService.DeleteFieldAsync` deletes only the field document — leaves orphan tasks, harvests, money, media, geospatial docs (no cascade).
- **[P2]** Harvest API is create/void/list only — **no update**; mobile harvest campaign must void+recreate or keep offline drafts (product/API gap, not a silent mock).
- **[P2]** CORS falls back to `AllowAnyOrigin()` when neither `Cors:AllowedOrigins` nor `Cors:AllowedHost` is set (`Program.cs`) — dangerous if a non-k8s deploy forgets CORS config (k8s sets `Cors__AllowedHost`).
- **[P2]** JWT algorithm uses symmetric HMAC only; secret required at boot (good), but Development secret is committed in `appsettings.Development.json` (acceptable for local; ensure it never ships to prod pods).
- **[P2]** Application-layer tests are strong for FieldWork/Finance/Geospatial math; **API integration coverage is thin** (health + register role reject + unauthorized fields). Few end-to-end persist/authz tests against Mongo.
- **[P2]** Catalogue seeders (`FieldWorkCatalogueSeeder`, `ServiceCategorySeeder`) always run at startup (OK for reference data) and **Replace** existing templates — custom prod edits to catalogue docs would be overwritten on deploy.
- **Solid:** Clean Architecture boundaries largely held; field/module authorization services exist; FluentValidation present; Serilog + exception middleware; Mongo indexes hosted; Photo Hub signed content URLs; financial idempotency keys.

---

## Architecture snapshot

### Layers
| Project | Role |
|---------|------|
| `OliveLifecycle.API` | Controllers, JWT/Swagger/CORS, `AnonymousAuthBypassMiddleware`, `ExceptionHandlingMiddleware`, `HttpCurrentUserContext` |
| `OliveLifecycle.Application` | Services, DTOs, FluentValidation, repository **interfaces** |
| `OliveLifecycle.Infrastructure` | Mongo documents/mappers/repos, seeders, geospatial providers/jobs, local file/photo session store, SMTP |
| `OliveLifecycle.Core` | Entities, enums, domain rules (`FieldPeopleRules`, FieldWork catalogue, finance calc) |
| `OliveLifecycle.Common` | Roles, policies, API envelope types |

Documented in `backend/ARCHITECTURE.md`. Dependency rule: Application does not reference Infrastructure (observed via DI registration locations).

### DI
- `Program.cs`: `AddApplication()` + `AddInfrastructure(configuration)` + JWT + policies `RequireFieldOwner` / `RequireAdministrator` / `CanManageUsers`.
- Infrastructure registers Mongo singleton, **hosted** `MongoIndexInitializer`, **`DataSeeder`**, proposal/weather hosts, all repositories, geospatial, `LocalFileStorageService`, `FilePhotoUploadSessionStore`.

### "DbContext"
- `MongoDbContext` is a thin `IMongoDatabase` wrapper (`GetCollection<T>`). Not EF. No migrations folder — schema is document + `MongoIndexInitializer`.

### Auth model
- JWT Bearer (`JWT:SecretKey` / Issuer / Audience); empty secret throws at startup.
- Per-controller `[Authorize]`; role policies for admin/owner.
- Resource authz in services: `FieldAccessService`, `FieldAccessScopeService`, `FieldWorkAuthorizationService`, `FinancialAuthorizationService` (module seats for family/partner).
- `Auth:AllowAnonymous` + `AnonymousAuthBypassMiddleware` can impersonate `Auth:DevUserId` (defaults to demo owner id). **k8s sets AllowAnonymous false** (good).

### Config secrets (summarized — values not pasted)
- `appsettings.json`: empty JWT secret, local Mongo URI, empty SMTP/API keys placeholders.
- `appsettings.Development.json`: **non-empty Development JWT secret string**, `DemoAccounts:Seed=true`, `ExposeDevResetLink=true`.
- k8s: JWT from Secret key `JWT__SecretKey`; Demo seed **enabled** in ConfigMap (see P0).

---

## Persistence matrix

Legend: **YES** = awaited Mongo write on success path; **PARTIAL** = some state durable, some lost on restart / incomplete cascade; **NO** = write API does not durable-store expected domain entity; **N/A** = read-only.

| Area | Endpoint / command | Expected entity / store | Persist? | Evidence |
|------|--------------------|-------------------------|----------|----------|
| Auth register | `POST /api/v1/auth/register` | `users` | YES | `AuthService.RegisterAsync` → `IUserRepository.CreateAsync` → `MongoRepositoryBase.InsertOneAsync` |
| Auth login | `POST /api/v1/auth/login` | JWT only | N/A | No DB write (expected) |
| Auth reset | `POST /api/v1/auth/reset-password` | `users` password hash | YES | `AuthService.ResetPasswordAsync` → `UpdateAsync` |
| Fields CRUD | `POST/PUT/DELETE /api/v1/fields` | `fields` | YES / PARTIAL on delete | `FieldService` Create/Update/Delete → repo; **Delete does not cascade** |
| Field boundary/activate/docs | PUT boundary, POST activate, POST documents | `fields` (+ file disk) | YES | `UpdateBoundaryAsync` / `ActivateFieldAsync` / `UploadDocumentAsync` |
| Cadastre import | `POST .../import/greek-cadastre` | `fields` | YES | `ImportGreekCadastreAsync` Create/Update |
| Field people / invites | PUT/PATCH/DELETE people, POST invites, accept | memberships on `fields`, `field_invites` | YES | `FieldPeopleService` Update/Create/Accept |
| Lifecycle | initialize/progress/advance/revert/correct | `lifecycles` + `fields` | YES | `LifecycleService` + `FieldLifecycleSync.SyncAsync` (txn + fallback) |
| Activities | GET only | `activities` (written by services) | N/A (API) / YES (side-effect) | `ActivityService.RecordAsync` → `CreateAsync`; no public write controller |
| Field tasks | POST/PUT + lifecycle actions | `field_tasks`, `task_executions` | YES / PARTIAL atomicity | `FieldTaskService.*` → `_tasks`/`_executions` Create/Update; Complete = 3 writes, no session |
| Checklist | `POST .../checklist/{key}` | `field_tasks` | YES | `SetChecklistItemAsync` → `_tasks.UpdateAsync` |
| Task proposals | accept/dismiss/evaluate | `task_proposals`, tasks | YES | `TaskProposalService` Update/Create |
| Work profile / learning | POST/PUT/activate/copy/learning-* | `field_work_profiles` | YES | `FieldWorkProfileService` / `FieldWorkLearningService` |
| Phenology | POST observation | phenology collection | YES | `FieldPhenologyService.RecordAsync` → Create |
| Financial txs | POST/PUT/post/void/delete draft | `financial_transactions` | YES | `FinancialTransactionService` Create/`_transactions.UpdateAsync`/Delete; idempotency key |
| Harvest | POST create, POST void | `harvest_records` (+ linked money void) | YES | `HarvestService.CreateAsync`/`VoidAsync`; **no Update API** |
| Notes / contacts | CRUD under `/me` | `notes`, `saved_contacts` | YES | `NoteService` / `SavedContactService` |
| Photos hub | upload/update/trash | `media_attachments` + disk | YES | `PhotoHubService` ingest → media repo; sessions on disk (`FilePhotoUploadSessionStore`) |
| Photo content | `GET .../photos/{id}/content` | disk via HMAC | N/A | AllowAnonymous + signature (`PhotosController`) |
| Generic files | `POST /api/v1/files/upload` | disk only | PARTIAL | `FilesController` → `LocalFileStorageService.SaveAsync`; **no Mongo metadata**; public static URL |
| Feedback | POST multipart | `user_feedback` + file | YES | `FeedbackService.SubmitAsync` → Create |
| Ministry read | POST read / read-all | `ministry_notification_reads` | YES | `MinistryNotificationRepository.MarkReadAsync` InsertOne |
| In-app campaigns admin | CRUD/publish/archive | campaign collections | YES | `AdminCampaignService` |
| In-app me seen/dismiss/respond | engagement/answers | engagements/answers | YES | `UpsertAsync` on engagement/answer repos |
| Partners / service profile | activate/upsert/request status | partner collections | YES | `PartnerService` |
| Geospatial refresh enqueue | POST satellite/intelligence/history | `geospatial_processing_jobs` + Channel | PARTIAL | Job doc YES (`GeospatialJobQueue.TryRecordJobAsync`); **Channel work lost on restart** |
| Weather/spatial processors | background | snapshots/profiles/alerts | YES | Geospatial repositories Replace/BulkWrite (when host runs work) |
| Reports | GET reports/* | aggregated reads | N/A | `ReportsService` reads repos; `Enumerable.Range(1,12)` builds month buckets (not fake seed data) |
| Chronologio | GET | read model | N/A | Assembles from persisted activities/tasks/money/harvest |
| Demo seed (startup) | `DataSeeder` hosted service | users/fields/tasks/… | YES (destructive) | See mock/demo inventory — **prod risk** |

### Write paths investigated as "NO_WRITE" false positives
Heuristic missed `UpsertAsync` / `SyncAsync` / `MarkReadAsync`. Re-checked:
- `FinancialTransactionService.UpdateAsync` → `_transactions.UpdateAsync` (line ~382) — **YES**
- `LifecycleService` progress/advance/revert → `_fieldLifecycleSync.SyncAsync` — **YES**
- `InAppMessageService` MarkSeen/Dismiss/Respond → `_engagements.UpsertAsync` — **YES**
- `PhotoHubService.UploadAsync` → `IngestOneAsync` (media create) — **YES**
- `MinistryNotificationService.MarkAllAsReadAsync` → `MarkAllReadAsync` — **YES**

**No silent in-memory-only domain write API was found** for core olive-farm entities (fields/tasks/money/harvest). The dangerous persistence issues are **destructive demo seeding**, **orphan deletes**, **non-atomic multi-doc updates**, and **in-process geospatial queue**.

---

## Mocked / stub / fake inventory

| Location | What it fakes | Prod risk | Fix |
|----------|---------------|-----------|-----|
| `Infrastructure/MongoDB/DataSeeder.cs` `DemoUsers` / `HiddenOperator` | Hard-coded users + plaintext passwords hashed at seed (`password123`, `admin123`) | **Critical** if Seed=true in prod (k8s currently true) | Force `DemoAccounts__Seed=false` in all non-dev environments; remove admin demo from prod images; rotate if ever deployed |
| `DemoFarmDataSeeder.cs` | Filiatra fields, memberships, wipes owner money/harvest/notes | **Critical**: runs whenever Seed=true; ignores `ReseedFarmData` | Gate wipe/reseed behind `DemoAccounts:ReseedFarmData==true` **and** non-Production; never wipe unknown fields |
| `FieldWorkDemoSeeder.cs`, `ChronologioDemoSeeder.cs`, `FamilyDemoSeeder.cs`, `OwnerPartnerDemoSeeder.cs` | Demo tasks, chronologio history, family seats | High with Seed=true | Same gate; ensure Production config false |
| `PartnerDemoSeeder.cs` | Marketplace demo partners (`password123`) | Medium (not called from `DataSeeder` currently — dead but dangerous if wired) | Keep unused or delete; never call in prod |
| `InAppCampaignDemoSeeder.cs` | Demo campaigns | Low (class unused — no references outside its file) | Delete or wire only under Seed+Dev |
| `FieldWorkCatalogueSeeder.cs`, `ServiceCategorySeeder.cs` | Reference catalogue upsert (always on) | Medium: overwrites catalogue docs every boot | Versioned migrations / only insert-if-missing for prod; or content-hash skip |
| `AnonymousAuthBypassMiddleware.cs` | Fake authenticated principal | High if `Auth:AllowAnonymous=true` | Keep false in prod (already in k8s); fail-fast if Production && AllowAnonymous |
| `FilePhotoUploadSessionStore` `ConcurrentDictionary` | Lock map only; sessions on disk JSON | Low | OK; document multi-instance sticky/shared volume need |
| `GeospatialJobQueue` `Channel<>` | In-process work queue | High for reliability | Outbox: on host start, re-enqueue Mongo `Pending` jobs; or use a real queue |
| Moq `Mock<>` / `AddInMemoryCollection` | Unit/integration test doubles only under `*Tests` | None in prod path | Keep |
| `FieldWorkProductEvents.cs` comment "stubs" | Logging-oriented product events | None | Clarify naming |
| `ReportsService` / finance `Enumerable.Range(1,12)` | Calendar month scaffolding over real aggregates | None | Keep |
| Frontend `mockReportData.ts` / mobile `mockAuthService.ts` | Client mocks (outside backend scope) | Client-only | Out of backend fix scope |

**Grep note:** No production `NotImplementedException`, no `TODO`/`FIXME` hits in non-test `.cs` at review time. No EF `UseInMemoryDatabase`. No `Fake*` classes in prod assemblies.

---

## Security & authz findings

1. **Demo credentials in Production ConfigMap** — see P0. Known emails/passwords + Administrator account.
2. **Anonymous auth bypass** exists; disabled in k8s (`Auth__AllowAnonymous: "false"`). Recommend Production guard that throws if enabled.
3. **Static `/uploads`**: photos subtree blocked in middleware; other uploaded files remain anonymously fetchable. Prefer signed URLs for all user content or auth-gated download endpoint.
4. **Invite preview** `GET /api/v1/invites/{token}` AllowAnonymous returns invite DTO (email/role/field context) — acceptable for invite UX; ensure tokens are unguessable and rate-limit lookups.
5. **Photo content** AllowAnonymous with HMAC expiry — good pattern (`PhotosController.GetContent`).
6. **Field access**: list/get typically scoped via `FieldAccessService` / module seats. Task/finance services call dedicated authorization helpers — stronger than many CRUD apps. Residual IDOR risk is mainly on any endpoint that loads by id without `EnsureCan*`; spot-checks on FieldTasks/Financial/Harvest looked gated.
7. **Administrator role** bypasses field ACL in `CanUserAccessFieldAsync` — expected; protect admin account fiercely (demo admin contradicts this).
8. **No rate limiting** on auth or invite endpoints.
9. **CORS** host allowlist in k8s; codepath `AllowAnyOrigin` if misconfigured.
10. **JWT**: ValidateIssuer/Audience/Lifetime/SigningKey enabled. No refresh-token rotation review in this pass (single expiry 60m).
11. **PII in logs**: demo seeder logs emails; invite failure logs email — avoid in prod or redact.
12. **Exception middleware** hides internal errors (good); maps domain exceptions correctly.

---

## Data model / EF / migrations findings

- **No EF / no migrations.** Schema evolution = code documents + index initializer.
- **`MongoIndexInitializer`**: solid coverage (users email unique, field memberships, geo 2dsphere, harvest/financial/task indexes, ministry read unique pair, etc.). Uses sync `CreateOne` inside hosted `StartAsync` (blocks startup — acceptable; watch long index builds).
- **Soft-delete**: `User` and `MediaAttachment` (trash) — not general soft-delete for fields/tasks.
- **Multi-tenancy**: ownership via `OwnerId` / memberships / `OwnerUserId` on money — not a separate tenant id. Demo wipe by OwnerId is therefore a tenancy footgun.
- **Transactions**: only `FieldLifecycleSync`. Task complete / harvest+money / invite accept perform multiple writes without a session.
- **Catalogue Replace on every boot** can fight human edits in Mongo.

---

## API & application-layer practice findings

**Good**
- Thin controllers; business logic in Application services.
- FluentValidation auto-validation registered; validators for auth, fields, harvest, notes, partners, financial, fieldwork.
- Cancellation tokens widely present on public service methods.
- No sync-over-async (`.Result` / `.Wait`) found in non-test code.
- Idempotency on financial create.
- Chronologio/reporting as read models over persisted facts.

**Gaps / smells**
- Fat-ish services (`FieldTaskService`, `PhotoHubService`, `FinancialTransactionService`) — maintainability P2.
- Controllers sometimes inject repositories directly for geospatial reads (`FieldSpatialController`) — mild Clean Architecture leak.
- `FilesController` is a persistence anti-pattern for durable farm documents (no ownership record).
- Harvest immutability (create/void only) may force awkward client flows.
- Geospatial enqueue returns Accepted while work may never run after restart.
- `FieldLifecycleSync` fallback after abort still does sequential non-transactional replaces — can leave field/lifecycle divergent under partial failure.
- No API versioning beyond `/api/v1` path (fine for now).
- Health check maps Mongo but API tests accept 503 as success — weak signal.

---

## Testing gaps

| Area | Coverage observed | Gap |
|------|-------------------|-----|
| Application unit tests | Broad: FieldWork, finance authz/summary, chronologio, partners, photos rules, geospatial math, harvest service, etc. (~50+ test files) | Good unit depth |
| Infrastructure tests | Raster/TIFF/Natura/FIRMS/image metadata | Providers mocked appropriately |
| API.Tests | Health, register-admin reject, unauthorized `/fields` | **Missing**: authenticated CRUD persist round-trips, IDOR negatives, Seed=false prod boot, financial idempotency E2E, photo signed URL, invite accept |
| Demo seeder safety | None found | Need test: Production + Seed=true should fail boot OR seed no-ops |
| Cascade delete | None | Orphan assertions after field delete |
| Geospatial job restart | None | Pending job recovery |

---

## P0 / P1 / P2 backlog (Cursor-ready tickets)

### P0
1. **Disable demo seed in Production ConfigMap**  
   - **Why:** Live env upserts known passwords and can wipe demo-owner farm data every restart.  
   - **Where:** `k8s/configmap.yaml` (`DemoAccounts__Seed`), verify live cluster ConfigMap.  
   - **Fix direction:** Set `DemoAccounts__Seed=false` (and confirm in all overlays). Rotate passwords if the cluster ever ran with true. Add startup assert: if `Environment.IsProduction()` && Seed → throw.

2. **Honor `DemoAccounts:ReseedFarmData` (or delete the flag)**  
   - **Why:** Flag is documented in config but unused; Seed=true always deletes+reseeds.  
   - **Where:** `DemoFarmDataSeeder`, `FieldWorkDemoSeeder`, `ChronologioDemoSeeder`, `DataSeeder`.  
   - **Fix direction:** Destructive wipe only when `ReseedFarmData` is true **and** Seed is true **and** not Production. Default both false outside Development.

3. **Hard-stop demo wipe of non-scripted owner fields**  
   - **Why:** Extra fields for OwnerId are deleted on seed.  
   - **Where:** `DemoFarmDataSeeder.SeedAsync` wipeIds logic.  
   - **Fix direction:** Never delete ids outside the fixed demo FieldIds set; never run against Production.

### P1
4. **Auth-gate or sign all uploaded files**  
   - **Why:** Non-photo uploads publicly readable via static files.  
   - **Where:** `Program.cs` static files middleware; `FilesController`; `LocalFileStorageService`.  
   - **Fix direction:** Stop exposing generic uploads statically; serve via authenticated or signed endpoints like Photo Hub.

5. **Recover geospatial Pending jobs after restart**  
   - **Why:** Channel is memory-only; Mongo job rows stay Pending forever.  
   - **Where:** `GeospatialJobQueue`, `GeospatialJobHost`.  
   - **Fix direction:** On host start, query Pending jobs and rewrite into channels (or replace with durable queue).

6. **Transactional task completion (and similar multi-writes)**  
   - **Why:** Partial complete leaves inconsistent task/execution/follow-up.  
   - **Where:** `FieldTaskService.CompleteAsync`, invite accept, harvest void+money.  
   - **Fix direction:** Mongo multi-doc transactions or single-document aggregates / outbox.

7. **Add rate limiting on auth + invite token lookup**  
   - **Why:** Brute force / token stuffing / email abuse.  
   - **Where:** `AuthController`, `InvitesController`, `Program.cs`.  
   - **Fix direction:** `AddRateLimiter` fixed-window per IP+route; lockout after N failures.

8. **Cascade or soft-delete field dependents**  
   - **Why:** Orphan tasks/money/media/geo after field delete.  
   - **Where:** `FieldService.DeleteFieldAsync`.  
   - **Fix direction:** Explicit cascade service or block delete while children exist.

9. **Production guard for `Auth:AllowAnonymous`**  
   - **Why:** Bypass middleware is a footgun.  
   - **Where:** `Program.cs` / middleware.  
   - **Fix direction:** Throw on boot if Production && AllowAnonymous.

10. **API integration tests for persist + authz**  
    - **Why:** Unit mocks cannot catch missing Save/Replace or IDOR.  
    - **Where:** `OliveLifecycle.API.Tests`.  
    - **Fix direction:** Testcontainers Mongo; create field→task→complete→reload; cross-user 403 cases; Seed false boot.

### P2
11. **Harvest update or documented immutability** — either add PATCH or document void+recreate; align mobile. (`HarvestRecordsController`)  
12. **CORS fail-closed** — never `AllowAnyOrigin` when config missing; require explicit origins in non-Dev. (`Program.cs`)  
13. **Catalogue seeder idempotency** — skip Replace when content hash matches. (`FieldWorkCatalogueSeeder`)  
14. **Global authorization fallback policy** — `RequireAuthenticatedUser` default. (`Program.cs`)  
15. **Redact emails from logs** in seeders/invite failures.  
16. **Split oversized Application services** for maintainability (FieldTask/PhotoHub/Financial).  
17. **Remove or quarantine unused `PartnerDemoSeeder` / `InAppCampaignDemoSeeder`.**  
18. **FieldLifecycleSync fallback** — retry txn or fail request instead of divergent sequential writes.

---

## What's solid (keep)

- Clear Clean Architecture split with repository abstractions and Mongo document mappers.
- Centralized field/module authorization (`FieldAccessService`, fieldwork & financial authz services) — right shape for Greek multi-seat olive households (owner / συνεργάτης / family modules).
- `MongoRepositoryBase` consistently `InsertOne`/`ReplaceOne`/`DeleteOne` — core CRUD writes are real.
- Financial idempotency keys and draft/post/void lifecycle.
- Photo Hub: EXIF geo-match, trash, signed content URLs, upload sessions on disk with ownership check.
- FluentValidation + exception middleware + Serilog.
- Mongo index initializer with geo and membership indexes.
- Field lifecycle sync attempts transactions.
- Substantial Application.Tests around FieldWork proposals, weather suitability, finance rules — keep investing here.
- k8s already disables anonymous auth bypass and wires JWT via Secret (aside from the Seed mistake).

---

## Controller inventory (auth snapshot)

All under `OliveLifecycle.API/Controllers` unless noted. Class-level `[Authorize]` unless stated.

| Controller | Route prefix | Auth | Write verbs (summary) |
|------------|--------------|------|------------------------|
| AuthController | `api/v1/auth` | AllowAnonymous methods | register/login/forgot/reset |
| FieldsController | `api/v1/fields` | Authorize | POST/PUT/DELETE + boundary/activate/docs/import |
| FieldPeopleController | `api/v1/fields/{fieldId}/people` | Authorize | PUT/PATCH/DELETE + invites |
| InvitesController | `api/v1/invites` | mixed | GET anonymous; POST accept Authorize |
| LifecycleController | `api/v1/fields/{fieldId}/lifecycle` | Authorize | initialize/progress/advance/revert/correct |
| ActivitiesController | `api/v1/fields/{fieldId}/activities` | Authorize | GET only |
| ChronologioController | `api/v1/fields/{fieldId}/chronologio` | Authorize | GET |
| FieldTasksController | `api/v1/field-tasks` | Authorize | full task lifecycle writes |
| FieldTaskProposalsController | `.../task-proposals` | Authorize | GET |
| FieldYearTaskPlanController + Evaluate | task-plan / evaluate | Authorize | GET + POST evaluate |
| FieldWorkProfileController | `.../work-profile` | Authorize | draft/update/activate/copy/learning |
| FieldPhenologyController | `.../phenology` | Authorize | POST record |
| FinancialTransactionsController | `api/v1/financial-transactions` | Authorize | CRUD-ish + post/void |
| FinancialSummaryController | `api/v1/financial-summary` | Authorize | GET |
| HarvestRecordsController | `api/v1/harvest-records` | Authorize | GET/POST/void |
| FieldYearSummaryController | `.../year/{year}/summary` | Authorize | GET |
| Notes/Contacts/Dashboard/Access/Chronologio (Me*) | `api/v1/me/...` | Authorize | notes/contacts writes |
| PhotosController | `api/v1/photos` | Authorize; content AllowAnonymous+sig | upload/update/trash |
| FilesController | `api/v1/files` | Authorize | upload (disk) |
| MediaController | media | Authorize | (legacy/media helpers) |
| FeedbackController | `api/v1/feedback` | Authorize | POST |
| AdminFeedback / AdminCampaigns | `api/v1/admin/...` | RequireAdministrator | admin writes |
| MeInAppMessagesController | `api/v1/me/...` | Authorize | seen/dismiss/respond |
| Partners* / service profile / requests | partners routes | Authorize | profile/request writes |
| MinistryNotificationsController | `api/v1/ministry/notifications` | Authorize | mark read |
| ReportsController | `api/v1/reports` | RequireFieldOwner | GET |
| UsersController | `api/v1/users` | Authorize | me profile/password/email/preferences/export/delete |
| FieldSpatialController + Map + AdminDataSources | field spatial / map / admin data-sources | Authorize / Admin | enqueue refresh, natura import |
| TaskProposalsController | proposals | Authorize | accept/dismiss |

---

## Evidence appendix (key symbols)

- SHA / tracking: `main...azure/main` @ `2c62f3fb71dc720ea0cf62a734c0c90f948e486b`
- DI seed host: `Infrastructure/DependencyInjection.cs` → `AddHostedService<DataSeeder>()`
- Prod seed config: `k8s/configmap.yaml` lines 7, 22–23
- Demo wipe: `DemoFarmDataSeeder.SeedAsync` (~L84–116)
- Demo passwords: `DataSeeder.DemoUsers` / `HiddenOperator`
- Static uploads: `Program.cs` `UseStaticFiles` + photo path 404 middleware
- Job channels: `GeospatialJobQueue` Channel fields + `TryRecordJobAsync`
- Repo base writes: `MongoRepositoryBase.CreateAsync/UpdateAsync/DeleteAsync`
- Lifecycle txn: `FieldLifecycleSync.SyncAsync`
- Auth bypass: `AnonymousAuthBypassMiddleware`
- Files no metadata: `FilesController.Upload`

---

*End of review. Report-only; no backend code modified.*


---

## Additional write-path traces (selected)

### Field create
`FieldsController.CreateField` → `FieldService.CreateFieldAsync` → `IFieldRepository.CreateAsync` → `MongoRepositoryBase.InsertOneAsync` on `fields`. Often followed by lifecycle initialize / admin seat ensure. **Persist: YES.**

### Task complete
`FieldTasksController.Complete` → `FieldTaskService.CompleteAsync` → may `CreateAsync` follow-up task → `CreateAsync` execution → `UpdateAsync` primary task. **Persist: YES per document; atomicity PARTIAL.**

### Financial create (posted)
`FinancialTransactionsController.Create` → `FinancialTransactionService.CreateAsync` → authz + optional idempotent return → `_transactions.CreateAsync`. **Persist: YES.**

### Harvest void
`HarvestRecordsController.Void` → `HarvestService.VoidAsync` → harvest `UpdateAsync` + related financial `VoidAsync`. **Persist: YES; txn PARTIAL.**

### Geospatial enqueue
`FieldSpatialController.RefreshSatellite` → `_jobQueue.EnqueueSatelliteProcessingAsync` → Mongo job insert/upsert then `Channel.Writer.WriteAsync`. **Persist: PARTIAL (doc yes, dispatch no across restart).**

### Generic file upload
`FilesController.Upload` → `LocalFileStorageService.SaveAsync` → disk under `uploads/{guid}{ext}`; URL returned; static middleware serves it. **Persist: PARTIAL (disk only, public).**

---

## Auth policy & role constants (reference)

Policies registered in `Program.cs`:
- `PolicyNames.RequireFieldOwner` → roles FieldOwner, Administrator
- `PolicyNames.RequireAdministrator` → Administrator
- `PolicyNames.CanManageUsers` → FieldOwner, Administrator

Resource authorization is mostly **not** policy-based; it is service-level using field memberships and `FamilyModules` (Fields, Tasks, Photos, Chronologio, Documents, Money, Harvest).

---

## Environment matrix (Seed / Anonymous)

| Setting | appsettings.json | Development | k8s ConfigMap |
|---------|------------------|-------------|---------------|
| `ASPNETCORE_ENVIRONMENT` | (host) | Development | **Production** |
| `DemoAccounts:Seed` | (unset/false) | **true** | **true (P0)** |
| `DemoAccounts:ReseedFarmData` | unset | false | false (**ignored by code**) |
| `Auth:AllowAnonymous` | false | false | false |
| CORS | AllowedHost empty → AllowAnyOrigin fallback | localhost origins | AllowedHost set |

---

## Recommended verification commands (for humans / follow-up agents)

```powershell
git -C C:\Repos\AgroTrack rev-parse HEAD
# Expect: 2c62f3fb71dc720ea0cf62a734c0c90f948e486b

Select-String -Path C:\Repos\AgroTrack\backend\k8s\configmap.yaml -Pattern 'DemoAccounts'
Select-String -Path C:\Repos\AgroTrack\backend\OliveLifecycle.Infrastructure\MongoDB\*.cs -Pattern 'ReseedFarmData'
# Expect: only yaml/json hits, zero .cs hits
```

After fixing Seed, confirm a pod restart no longer rewrites `owner@olivefarm.com` password hash or deletes `financial_transactions` for the demo OwnerId.

---

## Counts

| Bucket | Count in this review |
|--------|----------------------|
| P0 tickets | 3 |
| P1 tickets | 7 |
| P2 tickets | 8 |
| Controllers / API classes reviewed | ~35 |
| Demo/seeder files inventoried | 10 |
| Persistence matrix rows | 30+ |

