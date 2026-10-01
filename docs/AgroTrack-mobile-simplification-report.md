# AgroTrack Mobile Simplification Report

- **Date:** 2026-10-01 (Europe/Athens, UTC+3)
- **Scope:** Mobile app only (`mobile/src`). Read-only audit; **no product code changes**.
- **Method:** Inventory `RootNavigator` / `AppDock` / `LauncherScreen`; score major screens by first-paint section competition, nested modes, and sheet complexity; sample child components (My Oil, Harvest sheets, Field overview, Money, Chronologio). Cross-check against `docs/AgroTrack-frontend-ux-review.md` (web).
- **Companion canvas:** open `mobile-simplification-report.canvas.tsx` beside chat in Cursor (workspace canvases folder).

---

## Product verdict

The phone already has the **right skeleton**: Launcher as module hub, AppDock as Home + Record only, sheets for capture. Crowding is not “too many dock tabs” — it is **web multi-mode pages copied onto small scrolls**. Farmers hit decision fatigue on Harvest, Chronologio, Field overview, Money, and My Oil before the next real grove action.

**Principle for every refactor:** one job per first viewport. Secondary modes, cross-domain cards, and power filters move behind progressive disclosure (Season / Browse / See more / linked screen) — not peer tabs.

---

## Feature map

| Domain | Entry | Farmer job | Mobile risk |
|--------|-------|------------|-------------|
| Chronologio | Launcher · ChronologioTab | Journal today / month | Zoom + filters feel like analytics |
| Fields | Launcher · list → detail | Find grove · act | Detail overview card pile |
| Tasks | Launcher · Tasks | What to do today | Filter / banner chrome |
| Harvest | Launcher · Fields stack | Log sacks / mill / oil | 4 modes + many sheets |
| My Oil | Launcher · stack | Litres left · give / hold | Stock inbox + tab jargon |
| Money | Launcher · stack | Year result · capture | Oil + economics before list |
| Photos | Launcher · stack | Browse / assign | Review ops on browse hub |
| Partners | Launcher · stack | Call · invite seats | People vs contacts vs invites |

**Nav model (keep):** AppDock = Home + Capture. Launcher holds eight modules. Do not add peer dock destinations; simplify destinations instead.

**Already healthy:** Launcher, Fields list, Reports, Settings, Auth, More menu, AppDock.

---

## Crowding scores

Score = first-paint / scroll competition + nested modes + sheet complexity (not LOC alone).

| Screen | Score | ~Lines | Problem | Competes on first paint |
|--------|------:|-------:|---------|-------------------------|
| HarvestCampaignScreen | **5/5** | 1829 | 4 modes + day strip + hero + ~9 sheets | Today / Fields / Totals / Log peer-weight |
| ChronologioScreen | **5/5** | 1646 | Zoom × filters × compare × peeks; embedded in Field | Month + year + years + TodaySummary + chips |
| PhotoHubScreen | **4–5/5** | 1660 | Filter matrix + review / scan / link / viewer | Multi quick-filter + ops chrome |
| FieldDetailScreen | **4/5** | 639 | Overview is a dashboard of cards | Enrichment → photos stack |
| MoneyScreen | **4/5** | 794 | Oil bleed + summary stack before ledger | Unsold oil + triad + trust + months + economics |
| MyOilScreen (stock) | **4/5** | 549+ | Inbox pile + movements preview | Hero + shares + pressings + holds + grove + movements teaser |
| TaskListScreen | **3/5** | 787 | Banners + search + year + context | Todo/Done OK; chrome stacks |
| PartnersHomeScreen | **3/5** | 547 | People / invites / contacts in one home | Field picker + 3 sections + team access |

### Top offenders (detail)

1. **HarvestCampaignScreen** — `SegmentedControl` today · fields · totals · log. Today already stacks day strip, share banners, hero scan grid (sacks/mill/oil/people), activity, dock Add. Sheets: add, produce, sacks, mill, mill-link, mill-next, oil, people, complete. Near 1:1 with web `HarvestCampaignPage`.
2. **ChronologioScreen** — zoom `month | year | years` + category chips + optional compare + TodaySummary + date rail + harvest-merged days. FieldDetail chronologio tab mounts the **full** screen again.
3. **FieldDetail overview** — four local tabs; overview piles `GroveEnrichmentCards`, `FieldStatusStrip`, weather, `FieldAttentionCard`, `FieldYearGlance` → Money, `FieldHarvestCard`, `FieldRecentChronologio`, `FieldPhotosStrip`.
4. **MyOil + Money** — stock tab duplicates movements; Money shows `UnsoldOilStock` on finance first paint.

---

## Proposed refactors (report only)

| Pri | Screen | Keep on first paint | Move behind | Farmer outcome |
|-----|--------|---------------------|-------------|----------------|
| **P0** | Harvest | Today + day strip + one Record CTA | Fields / Totals / Log → Season sheet or second screen | Stress-season = log only |
| **P0** | Chronologio | Month timeline + TodaySummary + Capture | Year/years + compare + filters behind Browse / Filter | Journal, not analytics |
| **P0** | Field detail | Identity + one attention/status + primary CTA | Weather, year money, harvest, photos → See more | One job for this grove |
| **P1** | My Oil | Hero litres + **one** inbox + by-grove | Movements preview; merge share/pressing/holds teasers | “How much left?” |
| **P1** | Money | Year net + recent transactions + Capture | Unsold oil → My Oil link; keep economics collapsed | Finance without warehouse chrome |
| **P1** | Photos | Field-scoped grid + one filter | Review / scan / link as focused flows | Browse first; fix later |
| **P2** | Tasks | Todo / Done + Add | Year + context until filtered; max one banner | What do I do today? |
| **P2** | Partners | Phone book + Add | Team vs Contacts as separate routes / secondary | Call first; seats second |

### Concrete patterns

- **Today-first shells:** Harvest live = Today only; Chronologio = month only; Season / Browse seasons as overflow (same mental model as Launcher cards).
- **One inbox, not three:** My Oil merges share requests, pressings, and needs-now into a single “Needs you” list with type badges; drop movements teaser on stock.
- **Stop embedding giants:** Field Chronologio tab deep-links to Chronologio with `fieldId` instead of mounting the full journal.
- **Domain boundaries:** Money shows “Oil value →” to My Oil; Harvest share/admin banners collapse to one chip opening My Oil inbox.

---

## Suggested implementation order

1. **Harvest Today-only** — highest seasonal pain.
2. **Chronologio month-first** — tuck year/years/compare/filters; stop full FieldDetail embed.
3. **Field overview slim** — identity + attention + CTA; rest under See more.
4. **My Oil stock trim** — one inbox; no movements preview.
5. **Money first paint** — net + ledger + Capture; oil link out.
6. **PhotoHub flows** — browse default; isolate review/scan/link.
7. **Tasks / Partners polish** — fewer banners; clearer Team vs Contacts.

Do **not** redesign AppDock / Launcher first — they are already the calm pattern.

---

## Out of scope this pass

- Code changes, copy fixes, visual redesign, web parity work.
- FieldWorkSetup wizard density (heavy but onboarding-only; revisit if drop-off is measured).

---

## Related

- Web: `docs/AgroTrack-frontend-ux-review.md` (same crowding themes; mobile should go further).
- Next step when approved: implement P0 on one screen (recommend Harvest Today-only).
