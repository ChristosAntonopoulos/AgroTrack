# Olive Lifecycle Backend Architecture

## Layer Overview

```
OliveLifecycle.API          → HTTP, middleware, auth policies
OliveLifecycle.Application  → Services, DTOs, repository interfaces
OliveLifecycle.Infrastructure → MongoDB documents, mappers, repositories
OliveLifecycle.Core         → Domain entities, enums, exceptions
OliveLifecycle.Common       → Shared API contracts and constants
```

Dependency rule: **Application does not reference Infrastructure.** Infrastructure implements Application abstractions.

## Key Patterns

| Pattern | Location |
|---------|----------|
| `BaseEntity` | `Core/Entities/BaseEntity.cs` |
| Domain exceptions | `Core/Exceptions/` |
| Repository interfaces | `Application/Abstractions/Persistence/` |
| `MongoRepositoryBase<TDocument,TEntity>` | `Infrastructure/Persistence/` |
| BSON documents + mappers | `Infrastructure/Persistence/Documents`, `Mappers/` |
| `FieldAccessService` | Centralized field authorization |
| `ExceptionHandlingMiddleware` | Maps domain exceptions to HTTP status |
| `BaseApiController` | Thin controllers with `UserContext` |
| `IFieldLifecycleSync` | Mongo transaction wrapper for Field + Lifecycle updates |
| `IFileStorageService` | Local disk storage (MVP); swap for blob provider later |
| FluentValidation | `Application/Validators/` + auto-validation in API |

## Configuration

| Setting | Source |
|---------|--------|
| `JWT:SecretKey` | Environment variable `JWT__SecretKey` or `appsettings.Development.json` (dev only) |
| `MongoDB:ConnectionString` | `appsettings.json` or `MongoDB__ConnectionString` |
| `Cors:AllowedOrigins` | `appsettings.json` (default: `http://localhost:3000`) |
| `Storage:LocalPath` | Upload directory (default: `uploads`) |
| `Storage:PublicBasePath` | URL path for static files (default: `/uploads`) |

## API Contract

Success responses return **raw DTOs** (unchanged from alpha) for frontend compatibility.
Error responses use `{ "success": false, "error": { "message", "code" } }`.

## Phase 2 APIs (implemented)

| Feature | Endpoints |
|---------|-----------|
| Task approval | `POST /api/v1/tasks/{id}/approve`, `POST /api/v1/tasks/{id}/reject` |
| Evidence upload | `POST /api/v1/files/upload` → `{ url }` |
| Task templates | `GET /api/v1/task-templates` |
| Ministry notifications | `GET /api/v1/ministry/notifications`, `POST .../read`, `POST .../read-all` |
| Reports | `GET /api/v1/reports/field-summaries`, `harvest-records`, `profit-loss` |

Frontend uses `REACT_APP_USE_MOCK_DATA=false` to call these APIs. Reports and ministry nav items are visible in API mode.

## Running

```bash
cd backend
dotnet build OliveLifecycle.sln
dotnet test OliveLifecycle.sln
dotnet run --project OliveLifecycle.API
```

Health check: `GET /health`

Integration tests use **Testcontainers** (MongoDB) for auth + field CRUD happy paths. Docker must be running for those tests.

## Pilot readiness

1. Local verify: `dotnet test`, frontend `npm run build` with `REACT_APP_USE_MOCK_DATA=false`
2. Deploy staging with MongoDB + JWT secrets configured
3. Frontend coherence: connect Today/Tasks/Fields/Dashboard in API mode
4. Onboard 1–2 pilot farms; collect feedback on approval workflow and photo upload
