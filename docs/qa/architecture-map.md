# The Olive Lot — QA Architecture Map

Last updated: 2026-10-11. Source of truth for Phase 0 mapping.

## Stack

- Backend: ASP.NET Core 8 + MongoDB + JWT (Clean Architecture services, no MediatR)
- Web: React 18/19 + TypeScript (CRA Jest; Playwright under `frontend/e2e/`)

## Domain map

| Domain | Entities | Service | API | Mongo |
|--------|----------|---------|-----|-------|
| Harvest | `HarvestRecord` | `HarvestService` | `api/v1/harvest-records` | `harvest_records` |
| Oil cellar | `OilLot`, `OilPressing`, `OilCommitment`, `StockMovement`, `OilCellar` | `OilStockService` | `api/v1/oil-lots`, `oil-pressings`, `oil-commitments`, `stock-movements` | `oil_lots`, `oil_pressings`, `oil_commitments`, `stock_movements`, `oil_cellars` |
| Money | `FinancialTransaction` | `FinancialTransactionService` | `api/v1/financial-transactions` | `financial_transactions` |
| Chronologio | aggregated read model | `ChronologioService` | `api/v1/me/chronologio`, `api/v1/fields/{id}/chronologio` | projection over sources |
| Fields / roles | `Field` + people seats | `FieldPeopleService`, `FieldAccessService` | `api/v1/fields`, people, invites | `fields`, `field_invites` |
| Free plan | `BillingProfile` | `SubscriptionService` | `api/v1/me/subscription` | `billing_profiles` |
| Tasks | `FieldTask`, executions | `TaskService`, `FieldWorkAuthorizationService` | `api/v1/tasks` | `field_tasks`, `task_executions` |

## Web routes

`/harvest`, `/my-oil`, `/money`, `/chronologio`, `/fields`, `/tasks`, `/partners`, `/photos`, `/access-denied`, `/settings`

## Locked product rules

- CropSeason = Feb Y → Jan Y+1 (`AgriculturalYear`)
- My Oil = personal cellar; field IDs are provenance only
- Money dashboard is cash-based; unpaid sales are receivables
- Tasks: one assignee + optional watchers
- Free-plan writable grove selection is reversible
- Every write authorization is enforced server-side

## Atomicity note

No outbox. Multi-doc Mongo sessions follow `FieldLifecycleSync` pattern for harvest→cellar and sale cancel.
