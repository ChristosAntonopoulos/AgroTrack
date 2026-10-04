# Harvest FE — alpha issue registry

Maps the three-demo-user QA report to frontend owners. Severity: **P0** alpha blocker · **P1** before wider beta · **P2** backlog.

| ID | Severity | Finding | FE owners | FE-only? | Status / notes |
|----|----------|---------|-----------|----------|----------------|
| H1 | P0 | Setup field ≠ capture default | setup; sheets; `fieldSelection`; `HarvestFieldPicker` | Yes | Fixed |
| H2 | P0 | Family harvest invisible to owner | `hydrateFromRecords`, Context, `storage` | Partial FE + Needs API | Hydrate from `listByField`; season doc still missing |
| H3 | P0 | Chronologio / Field year / Harvest disagree | hydrate + banner | Partial FE + Needs API | Campaign from same records; Field year may still lag |
| H4 | P0 | Pause feels like complete | Totals + `lifecycleActions` | Yes | Fixed |
| H5 | P0 | Expense shown then denied | `harvestCapabilities` → Add menu | Yes | Fixed |
| H6 | P0 | Capability matrix unclear | caps → page, nav, Chronologio | Yes | Fixed |
| H7 | P0 | Empty season completion | `HarvestCompleteSheet` | Yes | Fixed |
| H8 | P0 | Empty day close | `HarvestEveningSheet` | Yes | Fixed |
| H9 | P0 | Raw i18n keys | `common:continue`, `openChronologio` | Yes | Fixed |
| H10 | P1 | Weak setup step 2 | Setup UI | Yes | Fixed |
| H11 | P1 | Day metrics mill-first | Day metrics grid | Yes | Fixed |
| H12 | P1 | No field context on Day | Day hero | Yes | Fixed |
| H13 | P1 | Sack defaults 12/45 | `HarvestSacksSheet` | Yes | Fixed (count 0; 45 estimate under More) |
| H14 | P1 | Dual add lists | DayActivity vs AddMenu | Yes | Same caps; Day lists expense/note |
| H15 | P1 | No 16/17 L tins | `HarvestOilSheet` | Yes | Fixed |
| H16 | P1 | Mill receipt/ref | `receiptRef` on mill entry | Yes | Fixed |
| H17 | P1 | People labour cost | People sheet More | Yes | Fixed |
| H18 | P1 | Note Chronologio hint + field | CaptureDrawer + field resolve | Yes | Fixed |
| H19 | P1 | Fields tab inert feel | `HarvestFlowView` empty | Yes | Fixed |
| H20 | P1 | Grammar / terminology | locales EL | Yes | Harvest/Chronologio Έξοδα; money type may stay singular |
| H21 | P1 | Totals missing sacks/per-field | Totals section | Yes | Fixed |
| H22 | P1 | Review empty / breadcrumb | `ThisHarvestReviewPage` | Yes | Fixed |
| H23 | P1 | Season vs Money year | Review money link | Yes | Fixed |

## Demo users (manual)

| User | Role expectation |
|------|------------------|
| Γιώργος | Owner — full harvest |
| Ελένη | Family — contribute; expense gated by seat |
| Κώστας | Collaborator — harvest nav/module gated |

See [REPRO_CHECKLIST.md](./REPRO_CHECKLIST.md) and [HYDRATION_CONTRACT.md](./HYDRATION_CONTRACT.md).
