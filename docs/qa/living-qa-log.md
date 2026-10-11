# The Olive Lot Living QA Issue Log

Production readiness register. Mirror of the product register (docx). Update rows when defects are fixed; do not mark Fixed until API + UI tests named with the QA ID pass and refresh/relogin reconcile.

**Release under test:** pending  
**Last updated:** 2026-10-11

## Status legend

| Status | Meaning |
|--------|---------|
| Open | Reproduced; fix not verified |
| In progress | Fix landed; tests incomplete |
| Fixed | DoD met (tests + refresh/relogin) |
| Verify | Needs targeted retest |
| Pending | Not yet executed |

## Open / tracked issues

| ID | Priority | Area | Status | Route / evidence | Release |
|----|----------|------|--------|------------------|---------|
| QA-001 | P0 | Privacy | In progress | `/privacy` | |
| QA-002 | P0 | Public errors | In progress | unknown URL | |
| QA-003 | P1 | Oil i18n | In progress | `/my-oil` recent.title | |
| QA-004 | P1 | Oil provenance | In progress | `/my-oil` | |
| QA-005 | P1 | Season state | In progress | `/harvest` vs `/my-oil` | |
| QA-006 | P1 | Season dates | In progress | CropSeason | |
| QA-007 | P1 | Capture | In progress | global capture | |
| QA-008 | P1 | Roles / nav | In progress | Partner nav; My Oil→money | |
| QA-009 | P1 | Export | In progress | settings/privacy | |
| QA-010 | P2 | Password reset | In progress | ForgotPasswordPage inline + aria-live email validation | |
| QA-011 | P2 | Chronologio refresh | Fixed | retain regression | |
| QA-012 | P2 | Terminology | In progress | observation/note | |
| QA-013 | P2 | Task dates | In progress | `/tasks` | |
| QA-014 | P2 | Photos | In progress | `/photos` | |
| QA-015 | P2 | Field access UI | In progress | `/fields` | |
| QA-016 | P2 | Loading | In progress | feature routes | |
| QA-017 | P2 | Filters a11y | In progress | RightDrawer leaving/hidden panel: aria-hidden + inert; closed unmounts controls | |
| QA-018 | P2 | People identity | In progress | FieldSeatCard role + email/avatar cues | |
| QA-019 | P3 | Harvest copy | In progress | `whatAdd` + dayActivity/flow empty → Add record (EN/EL/IT) | |
| QA-020 | P3 | Greek tone | In progress | EL common offline + fields harvest/map εσύ mismatches | |
| QA-021 | P3 | Oil plural | In progress | `/my-oil` | |
| QA-022 | P3 | Empty states | In progress | `getFieldsEmptyKeys` archived-without-search → emptyArchived* | |
| QA-023 | P2 | Terms locale | In progress | RegisterPage SPA /terms /privacy; LegalPage lang from i18n | |
| QA-024 | P1 | Capture field | In progress | Chronologio capture | |
| QA-025 | P1 | Task checklists | In progress | `/tasks` | |
| QA-026 | P2 | Sack display | In progress | `/harvest` | |
| QA-027 | P0 | Harvest→oil | In progress | `ConfirmHarvestOil` + OilStockQaTests; FE persist.ts; repair `POST /api/v1/oil-pressings/reconcile-orphans` (`ReconcileOrphanHarvestOilAsync`: posted oil batches without pressing/lot, idempotency key `harvest-oil:{batchId}`; no QA test yet) | |
| QA-028 | P0 | Harvest→Chronologio | In progress | Chronologio oil-method summary + QA_028 test | |
| QA-029 | P1 | Task assignment | In progress | `/tasks`; single assignee only — optional watchers (locked decision) not implemented | |
| QA-030 | P2 | Photo status | In progress | `/photos` | |
| QA-031 | P3 | Invite copy | In progress | InvitePersonSheet email required / name optional copy EL/EN/IT | |
| QA-032 | P2 | Money validation | In progress | `/money` | |
| QA-033 | P2 | Money radios | In progress | `/money` | |
| QA-034 | P1 | Oil input limits | In progress | Add Oil: client cap 50,000 L + inline error (EL/EN/IT `add.tooMuch`), mirrors server `MaxOilQuantityLitres` | |
| QA-035 | P2 | Template field | In progress | TemplatePicker field name on suggested cards | |
| QA-036 | P2 | Task a11y | In progress | task wizard | |
| QA-037 | P1 | Oil fill source | In progress | `/my-oil` | |
| QA-038 | P0 | Negative stock | In progress | AdjustStock validation + OilStockQaTests | |
| QA-039 | P2 | Invite wording | In progress | Invite review wording when inviteeHasAccount | |
| QA-040 | P1 | Role label | In progress | header after role change | |
| QA-041 | P1 | Custom grants | In progress | collaborator Money | |
| QA-042 | P2 | View-only capture | In progress | Capture FAB | |
| QA-043 | P1 | Writable switch | In progress | SelectWritableField reversible; Qa043044WritableFieldTests | |
| QA-044 | P0 | Write enforcement | In progress | FIELD_NOT_WRITABLE + FieldWorkAuthorization; Qa043044; photos: `PhotoHubService.ConfirmField`/`Link` call `EnsureFieldWritableForWrite`, upload geo-match never auto-assigns to a view-only grove (no photo QA test yet) | |
| QA-045 | P1 | Task More menu | In progress | skipped task hides empty More menu | |
| QA-046 | P2 | Contact delete | In progress | contacts | |
| QA-047 | P0 | Sale reversal | In progress | CancelSaleAsync + Money LinkedOilSaleCancel guard; My Oil Holds tab now shows "Cancel sale" on delivered sales (EL/EN/IT `actions.cancelSale`) | |
| QA-048 | P2 | Title length | In progress | task title | |
| QA-049 | P1 | Assignee picker | In progress | ScheduleWorkSheet field-member assignee picker | |
| QA-050 | P2 | Years loading | In progress | chronologioViewScope + clear Months on Years; no exit fade | |
| QA-051 | P1 | Oil in Chronologio | In progress | sale/gift timeline | |
| QA-052 | P2 | Qty inputs | In progress | Give Oil | |
| QA-053 | P1 | Unpaid sale | In progress | PaymentStatus receivable + CollectPayment; My Oil Holds tab: receivable shows "Not paid yet · X € owed" + "Mark as paid" → `collect-payment` (EL/EN/IT) | |

## Retest template

`ID | date | role | route | steps | expected | actual | evidence | status | release`
