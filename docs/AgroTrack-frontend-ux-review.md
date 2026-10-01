# AgroTrack Frontend UX Review (Farmer-first)

- **SHA:** `3af86ac7cc6de82fda219c80acd2eeeab59ecac6` (`3af86ac feat: ship grove naming, help, and oil stock for production`)
- **Dirty note:** Local `main` tracking `azure/main` with **extensive uncommitted frontend WIP** (Chronologio, Layout, Money, MyOil, Harvest, Fields, onboarding, locales). This review treats **working tree = product**.
- **Date:** 2026-09-29 (Europe/Athens, UTC+3)
- **Scope:** Web frontend only (`frontend/`). Mobile mentioned only where parity risk is obvious.
- **Method:** Inventory `App.tsx` + `navigation/navConfig.tsx`; read MainLayout / Header / Sidebar / MobileBottomNav; sample each major page + CSS; inspect shared primitives (`components/Common/*`, `styles/theme.css`); grep density smells (tiny fonts, dense grids, flat cards, z-index outliers). **No product code changes.** Do not use GitHub.

---

## Product verdict (1 short paragraph)

AgroTrack web is **closer to “ready but rough” than to 1/10 friction**. The bones are strong: Mediterranean tokens, 44–48px tap targets, comfort settings, a unified Capture drawer, farmer-voiced Greek onboarding, and a sensible phone dock (Ιστορικό / Ελαιώνες / Εργασίες + Περισσότερα). What blocks 1/10 is **choice overload and stacked chrome** — seven primary sidebar destinations, power-user Chronologio/Harvest toolbars, Field Overview card stacks, Money’s multi-rail ledger, My Oil’s four tabs plus a **duplicate EL/EN primary CTA** (`hold` = `give`), and opaque labels like Field **Καρτέλα**. Farmers (including older users) hit decision fatigue before they ever do the next real grove action. Small polish — fewer top-level choices, one clear primary action per surface, larger readable chrome, fix copy bugs — moves this far more than any redesign.

---

## Executive findings (P0/P1/P2 bullets)

### P0 — fix before farmers feel “effortless”
- **Sidebar primary bloat:** FieldOwner sees **7** primary destinations (Chronologio, Fields, Tasks, Harvest, My Oil, Money, Photos) in `navConfig.tsx` — too many peer choices.
- **My Oil CTA copy bug:** `actions.hold` and `actions.give` are both **«Δώσε λάδι» / “Give oil”** (`locales/el|en/myOil.json`) while tabbar + sticky CTA use both keys — farmers cannot tell Hold from Give.
- **Tasks filter stack:** Todo/Done tabs + search + mine/everyone + field + assignee + year + “more filters” on `TasksPage.tsx` — high cognitive load for “what do I do today?”
- **Harvest live chrome:** Four mode tabs (Σύνοψη / Ανά ελαιώνα / Συνολικά / Καταγραφές) + Record CTA + day strip + sheets + optional genealogy flow — stressful-season overload (`HarvestCampaignPage.tsx`).
- **Field tab label «Καρτέλα»:** `fields.page.tabDetails` = «Καρτέλα» / “Record” — opaque vs Overview / Map / History (`FieldLocalNavigation.tsx`).

### P1 — focus & craft that keep friction high
- **Chronologio home chrome:** Days/Months/Years + capture + filters + compare + axis — home feels like a analytics tool, not a journal (`ChronologioChrome.tsx`).
- **Money page vertical stack:** Header CTAs (Export + Capture) + year context + 3-glance grid + trust strip + monthly trend + unit-economics / oil / categories expandables + kind rail + transaction list — competing “what’s primary?” (`MoneyPage.tsx`, `Money.css`).
- **My Oil four tabs:** Overview / Κρατήσεις / Παρτίδες / Κινήσεις — “lots/movements” jargon; sticky duplicate CTAs (`OilStockTabs.tsx`, `MyOilPage.tsx`).
- **Photos in primary nav:** Same weight as Money/Tasks — steals focus from lifecycle core; belongs under More / Capture.
- **Mobile bottom labels at `0.65rem`:** Hard for older eyes (`MobileBottomNav.css`).
- **Field Overview card pile:** Enrichment + status strip + map peek + weather + year glance + recent chronologio + photos (`FieldOverview.tsx`).
- **Capture chooser:** Five type cards (work, money, photo, observation, voice) every time — good concept, still a micro-decision tax (`CaptureDrawer.tsx`).
- **z-index outliers:** FieldForm `12500`, NavCoach/Spatial `13000`, FocusSpotlight `12000` vs theme modal `1050` — overlay stacking risk with Capture/drawers.

### P2 — polish & consistency
- Tiny type clusters in Harvest sheets (`0.68–0.78rem`, `11px`), Chronologio meta (`0.68–0.72rem`), Login/Landing.
- Money `.money-card { box-shadow: none }` reads flatter / more “template” than shared `.card`.
- Dense 4–7 column grids on Harvest / MyOil / Partners / ThisHarvest CSS.
- Partners contacts-vs-app-seat mental model needs a calmer first screen (`PartnersPage.tsx` + `contactsVsUsers` copy).
- Dead CRA `App.css` boilerplate still shipped (noise, not farmer-facing).
- Onboarding journey lists **9** coach targets (`ONBOARDING_JOURNEY`) — soft guides are good; total path still long.

---

## Navigation & information architecture

### Routes (from `App.tsx`)
Protected app under `MainLayout`: `/chronologio` (home), `/fields` (+ new/edit/detail/weather/work-*), `/tasks` (+ new/complete/detail), `/harvest`, `/my-oil`, `/money`, `/photos`, `/partners` (+ search/me/requests/:userId), `/reports`, `/ministry`, `/settings`, `/data-sources`, admin campaigns/feedback. Legacy redirects: `/today` → chronologio home, `/people` → partners, `/this-harvest` → harvest, `/dashboard` → chronologio.

### Nav model (`navConfig.tsx`)
| Section | Items (FieldOwner typical) | Notes |
|---------|----------------------------|-------|
| **primary** | Chronologio, Fields, Tasks, Harvest, My Oil, Money, Photos | **7 peers** — main friction |
| **secondary** | Partners | Reports & Ministry **hidden from sidebar** but still routed (good) |
| **account** | Feedback action, Settings (+ admin-only) | Fine |

**Mobile dock** (`MobileBottomNav.tsx`): only `mobilePrimary` items — Chronologio, Fields, Tasks (+ Harvest replaces Chronologio when harvest live) + **More** opens sidebar. This is the right farmer pattern; **desktop sidebar should converge toward the same mental model**.

### Label clarity (farmers)
| Key | EL | EN | Verdict |
|-----|----|----|---------|
| chronologio | Ιστορικό | History | Clear, calm |
| fields | Ελαιώνες | Fields | Good (EL better than EN) |
| tasks | Εργασίες | Tasks | Good |
| thisHarvest | Συγκομιδή | Harvest | Good |
| myOil | Το λάδι μου | My oil | Good |
| money | Χρήματα | Money | Good |
| photos | Φωτογραφίες | Photos | Clear but **wrong weight** in primary |
| partners | Συνεργάτες | Partners | OK; page internals denser |
| Field tabDetails | **Καρτέλα** | Record | **Confusing** |
| My Oil hold/give | both **Δώσε λάδι** | both “Give oil” | **Broken** |

**Recommendation (small):** Demote Photos (and optionally Harvest off-season / My Oil) to secondary; keep Chronologio + Fields + Tasks (+ Money if owner) as the calm set. Align desktop section titles with phone “Main / More / Account”.

---

## Flow audits

### 1. First-run / onboarding / activation
- **Goal:** Name grove → place → draw όρια → load spatial → first note in Ιστορικό.
- **Current steps:** `OWNER_ACTIVATION_STEPS` (4 hard) + `ONBOARDING_JOURNEY` (9 soft targets: fieldsNav → createField → createGrove → locatePlace → drawBoundary → groveReady → homeButton → historyNav → firstObservation). Spotlight, SpatialLoadingPanel, NavCoach, FirstObservationGuide, ActivationGate lock chrome until boundary.
- **Friction:** Long path; many overlays (z 12k–13k); Field form still exposes ΚΑΕΚ / Cadastre PDF paths beside “corners on map”.
- **Farmer risk:** Abandon after naming; “Later” snooze leaves incomplete grove; coach competes with Capture/notifications once unlocked.
- **Fix direction:** Default path = name + map corners only; bury ΚΑΕΚ/PDF under “Άλλος τρόπος”; shorten coach to ≤3 beats after όρια; one full-width primary on each step.

### 2. Chronologio / home
- **Goal:** See what’s happening; add a note/photo/work; skim the month.
- **Current steps:** Open `/chronologio` → `ChronologioLiving` → chrome (title, **Νέα καταγραφή**, Days/Months/Years, filters, compare, axis) → timeline / weather / entry cards → detail drawers.
- **Friction:** Home toolbar is a control surface, not a journal; filter chips + compare are advanced; tiny meta fonts (`Chronologio.css` ~0.68–0.78rem).
- **Farmer risk:** “Where do I write?” lost among zoom/filter/compare.
- **Fix direction:** Default **Days** + one primary Capture; tuck Filters/Compare/axis behind a single “Περισσότερα” control; enlarge entry card titles.

### 3. Fields list + Field detail
- **Goal:** Find grove; see today; open map/history/record.
- **Current steps (list):** Header + Add CTA → optional setup nudge → search + summary strip + sort + list/map segmented → cards/sections mine vs shared.
- **Current steps (detail):** Header/year → **4 tabs** (Σήμερα / Χάρτης / Ιστορικό / Καρτέλα) → Overview stacks enrichment, status, map peek, weather, year glance, recent entries, photos.
- **Friction:** List toolbar is OK; detail Overview is a **dashboard of cards**; «Καρτέλα» unclear; map tab title “Χάρτης & περιβάλλον” is long on phone.
- **Farmer risk:** Can’t find “edit trees / irrigation”; Chronologio duplicated (global nav + field tab).
- **Fix direction:** Rename Καρτέλα → «Στοιχεία» / “Grove details”; Overview: status + one next action + weather peek, rest behind “Δες περισσότερα”; keep map as full-screen intent.

### 4. Tasks create / complete
- **Goal:** See today’s work; start/finish; add one task.
- **Current steps:** `TasksPageHeader` + Todo/Done → dense filter bar → list → start/undo/reschedule sheets → `/tasks/new` form → complete route (thin wrapper).
- **Friction:** Filter density is the #1 Tasks problem; learning/dismissal modals add noise; create form is comparatively calm.
- **Farmer risk:** Wrong field/assignee; “everyone vs mine” confusion.
- **Fix direction:** Default Todo + this field (or all) only; collapse assignee/year into one “Φίλτρα” sheet; keep Add Task as sole primary.

### 5. Capture
- **Goal:** Quickly record work / money / photo / note from anywhere.
- **Current steps:** Header **Καταγραφή** (hidden on Chronologio/Harvest) or page CTAs → `CaptureDrawer` choose step (5 types) → type form → save; money has draft/leave confirm.
- **Friction:** Extra choose step when context already known; header CTA competes with page Capture on Money; voice is rare for first-time users.
- **Farmer risk:** Pick wrong type; abandon money draft.
- **Fix direction:** Skip chooser when `preferredType` set; demote voice under “Επίσης”; on Money/Chronologio use **one** visible Capture CTA.

### 6. Harvest campaign
- **Goal:** Log today’s sacks/people/mill/oil with minimal thinking.
- **Current steps:** Setup card → live mode: 4 nav tabs + Record + day strip → sheets (people/sacks/mill/oil/…) → fields genealogy / totals / log.
- **Friction:** Highest complexity surface; 4-col and 7-col grids; `HarvestSheets.css` / page CSS tiny type; bottom nav hides on harvest page while live (intentional but disorienting if user expects dock).
- **Farmer risk:** Miss Record; confuse Σύνοψη vs Καταγραφές; wrong grove day.
- **Fix direction:** Live default = **today + Record**; Fields/Totals/Log under one overflow; bump sheet type ≥0.875rem; one primary sheet CTA.

### 7. Money
- **Goal:** See year result; add income/expense.
- **Current steps:** Header (field scope + Export + Capture) → year context bar → summary triad → trust strip → My Oil link → monthly trend → expandable unit economics / oil / categories → kind rail + transaction list/drawers.
- **Friction:** Too many peer sections before the list; flat `.money-card`; Export beside Capture splits attention; “unit economics” / provisional balance jargon.
- **Farmer risk:** Thinks Export is the main action; never reaches Add.
- **Fix direction:** Primary = Capture; Export in overflow; collapse expandables by default; give summary cards shared `.card` elevation; kind rail stays.

### 8. My Oil / stock
- **Goal:** Know litres left; give/hold; fill tins.
- **Current steps:** Season header → sticky tabbar (4 tabs) + hold CTA → hero → overview grids → sticky Give CTA → sheets (GiveOil / FillTins / Adjust).
- **Friction:** **hold ≡ give labels**; four tabs with warehouse jargon; two sticky CTAs that say the same thing in EL.
- **Farmer risk:** Wrong action on oil stock; fear of “lots”.
- **Fix direction:** Fix copy (`hold` → «Κράτησε» / “Hold aside”); Overview-first with **one** sticky primary (Give); Lots/Movements behind “Λεπτομέρειες”.

### 9. Partners
- **Goal:** Call people; optionally invite app seats.
- **Current steps:** Contacts hero (import/add) → list → team/app-access section → footer links (offer services / requests).
- **Friction:** Contacts vs OleaChron users explained in a paragraph (`contactsVsUsers`) — correct but dense; choice cards when no field.
- **Farmer risk:** Invites wrong seat type; thinks Partners is marketplace.
- **Fix direction:** First screen = phone book + Add; “Invite to app” as secondary on a contact.

### 10. Settings
- **Goal:** Language, comfort, notifications.
- **Current steps:** Notifications toggles → appearance (theme, font scale, large controls, easy-use preset) → locale → more account/demo.
- **Friction:** Long page but well sectioned; Easy Use preset is farmer gold.
- **Farmer risk:** Low — this is a strength.
- **Fix direction:** Keep; surface “Easy Use” earlier (post-onboarding tip). No redesign.

---

## Visual / CSS craft audit

| Surface | Issue | Severity | Small-fix direction |
|---------|--------|----------|----------------------|
| Shared `Button` / `Card` | Solid tokens, 48px primary, olive system | Keep | Prefer these over one-off page buttons |
| `MobileBottomNav.css` | Label `font-size: 0.65rem` | P1 | Bump to ≥0.75rem; allow 2-line wrap |
| `Chronologio.css` | Many 0.68–0.78rem labels; dense toolbar | P1 | Meta ≥0.8rem; reduce chrome chrome weight |
| `Money.css` | `.money-card { box-shadow: none }` flat | P1 | Reuse `--shadow-card` / shared Card |
| `Money.css` | 3–4 column grids + kind rail + sticky footer | P1 | Stack summary to 1 col &lt;768px (verify) |
| `MyOilPage.css` | Hero strong; 4-col grids; dual sticky CTAs | P1 | One sticky; simplify hero split on phone |
| `HarvestCampaignPage.css` / `HarvestSheets.css` | `11px` / 0.68–0.78rem; 4–7 col grids | P0/P1 | Min 0.875rem body; max 2–3 cols on phone |
| `FieldsPage.css` | Toolbar OK; card grid auto-fill 280px | OK/P2 | Slightly larger subtitle (0.85→0.95rem) |
| `FieldPageShell.css` | Overview multi-grid dashboard | P1 | Single column primary stack on phone |
| `FieldFormPage.css` | z-index 1200 / 1400 / **12500** | P1 | Align to `--z-modal` / onboarding tokens |
| Onboarding CSS | NavCoach/Spatial `z-index: 13000` | P2 | Document stacking; ensure Capture can’t trap under |
| `EmptyState` | Clear title/description/action | Keep | Use on every empty major surface |
| `App.css` | CRA boilerplate | P2 | Delete dead styles (safe cleanup) |
| Theme (`theme.css`) | Calm olive/limestone system, `--tap-min: 44px` | Keep | Enforce in page one-offs |

---

## Focus & complexity scorecard

| Surface | Focus | Why | One small win |
|---------|-------|-----|---------------|
| Chronologio | **ok → poor** | Capture good; zoom/filter/compare steal focus | Hide Compare+axis behind More |
| Fields list | **good** | Clear Add + list/map | Keep; enlarge status legend |
| Field detail | **ok** | 4 tabs OK; Overview card pile | Rename Καρτέλα; collapse Overview |
| Tasks | **poor** | Filter stack | Default filters only |
| Capture | **good** | Unified entry | Skip chooser when typed |
| Harvest | **poor** | 4 modes + sheets + grids | Today+Record only in live |
| Money | **ok → poor** | Export vs Capture; section stack | Capture primary; collapse analytics |
| My Oil | **poor** | Duplicate CTA labels + 4 tabs | Fix hold/give copy |
| Partners | **ok** | Hero actions clear; mental model dense | Contacts-first |
| Photos | **ok** | Powerful hub; wrong IA weight | Demote from primary nav |
| Settings | **good** | Comfort presets | Keep Easy Use |
| Mobile dock | **good** | 3+More | Larger labels |
| Desktop sidebar | **poor** | 7 primary items | Demote Photos (+ optional seasonals) |

---

## P0 / P1 / P2 backlog (Cursor tickets)

**Counts: P0 = 8 · P1 = 14 · P2 = 9** — small shippable polish only; no architecture rewrites.

### P0
1. **Nav primary trim** — Move `photos` (and consider off-season `harvest` / deep `my-oil`) to `secondary` in `navConfig.tsx`; keep mobilePrimary trio.
2. **My Oil copy** — Set `actions.hold` → EL «Κράτησε λάδι» / EN “Hold oil”; keep `actions.give` as Give; audit tabbar vs sticky so only one primary verb shows.
3. **Field tab rename** — `tabDetails`: EL «Στοιχεία», EN “Details” (drop «Καρτέλα»/“Record” in the tab strip).
4. **Tasks filters default** — Show search + Todo/Done only; pack field/assignee/year into existing `moreFilters` sheet by default on phone.
5. **Harvest live IA** — Default chrome = day strip + Record; put Fields/Totals/Log in a single overflow menu on &lt;768px.
6. **Harvest type scale** — Raise `HarvestSheets.css` / campaign meta below 0.8rem to ≥0.875rem; kill `11px` rules.
7. **Money primary CTA** — Demote Export to header overflow / ghost; keep Capture as sole filled primary in `MoneyPageHeader`.
8. **Chronologio chrome** — Default Days; move Compare + year-axis into filter drawer (one “advanced” entry).

### P1
9. Photos nav demotion copy check (EL/EN `nav` secondary section).
10. Mobile bottom label ≥0.75rem + slightly taller icon hit area.
11. Field Overview: wrap GroveEnrichment + YearGlance + Photos behind “Περισσότερα” disclosure.
12. Money: apply shared card shadow to `.money-card`; collapse Unit economics by default.
13. My Oil: hide Lots/Movements tabs behind overflow on phone; Overview + Holds only.
14. Capture: if `preferredType` set, skip choose step (already partially true for money — extend).
15. Capture chooser: move Voice under quiet “Επίσης” only (already quiet — ensure not equal weight).
16. Normalize FieldForm / onboarding z-index onto theme scale (document max layer).
17. Partners: hide team-seat choice grid until user taps “Πρόσκληση στην εφαρμογή” on a contact.
18. Chronologio entry card title ≥1rem; reduce meta noise on phone.
19. Header: avoid dual Capture when page already shows Capture (Money already has one — hide header capture there too if not already).
20. Empty My Oil / Money: ensure single primary Button from `Common/Button`.
21. Harvest: when live + on `/harvest`, show a one-line “Πίσω στην αρχή” affordance (logo still works — label it once).
22. i18n pass: EL Field «Καρτέλα ελαιώνα» long titles → «Στοιχεία ελαιώνα» in page chrome only.

### P2
23. Delete unused CRA rules in `App.css`.
24. Login/Landing tiny legal fonts → ≥0.75rem where farmer-facing.
25. Partners footer links quieter.
26. Consistent sheet corner radius with `--radius-xl`.
27. Icon size consistency in tab bars (My Oil icons at 14px → 18px).
28. Reports/Ministry remain URL-only — add Settings deep links if needed, not sidebar.
29. Onboarding: cap NavCoach to home + history only after spatial success.
30. Document density grep in PR checklist (no new &lt;0.75rem body).
31. Italian `locales/it` drift check when touching EL/EN strings (parity risk only).

---

## What’s already working (keep)

- **Phone IA:** Chronologio / Fields / Tasks + More (`MobileBottomNav`) — farmer-correct.
- **Comfort settings:** Font scale, large controls, Easy Use preset (`SettingsPage`) — rare and valuable for older users.
- **Design tokens:** `styles/theme.css` olive/limestone system, `--tap-min`, shared motion — calm brand, not generic Bootstrap.
- **Shared primitives:** `Button` (48px primary), `Card`, `EmptyState`, `SegmentedControl`, `RightDrawer` — prefer these over one-offs.
- **Capture as system:** One drawer for work/money/photo/note — right product bet.
- **Activation voice:** Greek onboarding copy is warm and concrete («Πώς τον λέμε;», «Σχεδίασε τα όρια») — keep tone.
- **Sidebar gating:** Ministry/Reports out of nav; collaborator module gating — reduces wrong-door risk.
- **Harvest live dock swap:** Elevates Harvest when campaign is live — situational focus done right.
- **Money empty states + collaborator expense-only messaging** — clear and honest.
- **Field list empty + almost-ready nudge** — guides completion without a wizard wall.

---

*End of read-only review. Small-change backlog only — no architecture rewrites, no product code modified in this pass.*
