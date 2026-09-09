# AgroTrack Feature Catalog

This document is an inventory of product features that exist in the AgroTrack / Olive Lifecycle codebase as of **2026-09-08**. It covers the website (`frontend/`) and the mobile app (`mobile/`), both experience modes (**Everyday** and **Full picture**), and every user role that changes what is shown. It does not evaluate quality, completeness, or UX. The in-app brand name is **Oleachron**.

## How to read this document

- **Modes** are `everyday` and `full` (`ExperienceMode`). The UI labels them **Everyday** and **Full picture**.
- **User types** are JWT roles plus field membership capacities and family-circle access. A page may be reachable by role in the nav, then further limited by field ownership, family modules, or capacity.
- **Website** paths are React Router routes. **Mobile** names are React Navigation screen names (tabs and stacks). Deep-link paths use the `oleachron://` and `https://app.oleachron.app` prefixes.
- **Information shown** lists data fields, sections, widgets, and actions that the code renders. Form inputs are listed for create/edit screens.
- If a feature exists on only one platform, that is stated.

## Modes

The flag is **`ExperienceMode`**: `'everyday' | 'full'`.

| Fact | Detail |
| --- | --- |
| Type | `frontend/src/experience/types.ts`, `mobile/src/experience/types.ts` |
| Persistence | Local preferences plus `PUT /api/v1/users/me/preferences` (`UserExperiencePreferencesDto.ExperienceMode`, default `"everyday"`) |
| Chosen flag | `experienceModeChosen` — until the user picks a mode, MainLayout redirects to the chooser |
| Role default (until chosen) | `Agronomist` and `Administrator` → `full`. `FieldOwner`, `Producer`, `ServiceProvider`, and unset → `everyday` (`defaultExperienceModeForRole`) |
| Who can change it | Any signed-in user, from the header toggle (website), Settings, More (mobile), or the first-run chooser |
| Home after switch | Everyday → `/today` (website) or Today tab (mobile). Full → `/dashboard` except `Producer`, who still homes to Today |
| Everyday widgets (allow-list) | `fieldMapDefault`, `todayAction`, `weatherAdvice`, `nextTasks`, `peopleStrip`, `alertsPlain`, `fieldCosts`, `myActions`, `recentNotes` |
| Full-only widgets | `fieldIntelligence`, `satelliteLayers`, `mapLayerPanel`, `cadastreDetails`, `analyticsNav`, `reportsNav`, `dataSourcesNav`, `calendarMonthView`, `calendarWeekView`, `calendarFieldView`, `taskBoardView`, `dashboardStats`, `advisorComments`, `peopleStats`, `myActionsDetail` |
| Everyday website nav (primary) | `/today`, `/fields`, `/tasks`, `/money`, `/partners`, `/settings` |
| Everyday website (More / Settings) | `/calendar`, `/ministry`, `/this-harvest`, `/notes` |
| Everyday website blocked | `/dashboard` redirects to `/today`. `/analytics`, `/reports`, `/data-sources` redirect to `/today` |
| Everyday mobile tabs | Today, Fields, Tasks, More. Dashboard and Calendar stay mounted but hidden; opened from More |
| Full-picture onramp | After two Everyday “peek” opens of field intelligence, a banner offers switching to Full picture (`shouldShowFullPictureOnramp`) |
| Comfort prefs stored with mode | `fontScale` (`default` / `large` / `xl`), `largeControls` |
| Web storage key | `olive_lifecycle_preferences` in `localStorage` (also `everydayIntelligenceOpens`, `fullPictureOnrampDismissed`) |
| Mobile storage keys | `@Oleachron_experience_mode`, `@Oleachron_experience_chosen`, `@Oleachron_font_scale`, `@Oleachron_large_controls`, plus theme/language/tutorial flags |
| Web document attributes | `data-experience`, `data-font-scale`, `data-large-controls`; CSS `--font-scale`, `--tap-min`, `--ui-density` |

## User types

### JWT / account roles (`UserRole` / `Roles`)

New public registrations are always **`FieldOwner`**. `Producer`, `ServiceProvider`, and `Agronomist` remain for login compatibility. Privileged values (`Administrator`, `Agronomist`, `ServiceProvider`) are rejected on register.

| Role | Code name | Typical home | Notes from code |
| --- | --- | --- | --- |
| Field owner | `FieldOwner` | Everyday: Today. Full: Dashboard | Can own fields, offer services, manage family, approve tasks, create fields |
| Producer | `Producer` | Today in both modes | Task list filtered to assigned user; cannot create fields (`canCreate` is false when role is Producer) |
| Agronomist | `Agronomist` | Default Full | Advise capacity; fields/tasks/partners/money/calendar/ministry/settings |
| Administrator | `Administrator` | Default Full | Same insight pages as FieldOwner plus Data sources |
| Service provider | `ServiceProvider` | Everyday default | Nav: Today, Partners, Calendar, Ministry, Settings. No Fields/Tasks/Money/This harvest/Analytics/Reports |

There is no separate guest product role after login. Unauthenticated users see Landing, Login, Register, and invite-accept pages.

### Field membership capacities (`FieldCapacity`)

`own` | `work` | `advise` | `help` | `view`

`useFieldCapacity` derives:

- **canOwn** — membership `own`, or `field.ownerId === userId`, or role `FieldOwner` when memberships are empty
- **canWork** — `work` or `help` (or Producer / assigned producer fallback)
- **canAdvise** — `advise` or `own`
- **canView** — always true when the field is loaded

### Family circle (not a JWT role)

An invited family member is still a `User` (typically `FieldOwner`). Access is a **family membership**:

- **Modules** (`FamilyModule`): `fields`, `tasks`, `documents`, `money`, `calendar`, `harvest`. Default on invite: `fields`, `tasks`, `calendar`. Seat cap: `seatsMax` default 2.
- **Access level** (`FamilyAccessLevel`): `view` (read), `help` (write existing), `work` (create content).
- Website nav hides Analytics, Reports, Data sources when the user has any family membership. Money / This harvest / Calendar / Tasks / Fields hide if the corresponding module is absent.

### Demo / mock

When mock mode is on, demo accounts and a `DemoTourPanel` appear. This is a development/demo surface, not a product role.

---

## Feature: Public landing

Marketing site for the product. Unauthenticated. No experience mode.

### Website

- **Landing** — `/`
- Purpose: Introduce Oleachron, collect a demo request, and offer sign-in and Android alpha download.
- Who: Anyone (no auth).
- Modes: Not applicable.
- Information shown:
  - Header: brand, alpha badge, section links (product, how-it-works, download, FAQ), language `el` / `en`, Sign in, Download alpha APK (`/downloads/oleachron-alpha.apk`)
  - Hero: title, subtitle, register CTA, download CTA, “request demo” text link, trust line, phone screenshot of Today
  - Product / shift cards: paper (BookOpen), chat (MessageCircle), phone (Smartphone)
  - Notes rows with screenshots: fields, today, harvest, costs (web), history
  - Audience: owner (web field screenshot), producer (phone task screenshot)
  - How it works: three numbered steps
  - Download / alpha: APK card (icon, title, price, 5-item includes list, Version / Platform / Status, Download APK, register link, expandable install guide, safety warning)
  - FAQ: six accordion items (default open: item 1)
  - Bottom CTA: register + download
  - Footer: brand, version pill, product anchors, contact mailto, language, Privacy and Terms text (not linked)
- Forms (demo modal): `name` (required), `email` (required), `org`, `message` — opens a mailto to `hello@oleachron.app`

### Mobile

Not present as an in-app screen. The APK is distributed from the website.

---

## Feature: Authentication

Sign-in, registration, and session expiry.

### Website

- **Login** — `/login`
- Purpose: Authenticate and route to role/mode home.
- Who: Unauthenticated users. After success, `roleHomePath` is used.
- Modes: Uses saved `experienceMode` only if `experienceModeChosen` is already true.
- Information shown: `LoginHero` (eyebrow, title, subtitle, three feature items: Timeline, Costs, Knowledge); brand, tagline, title, subtitle; optional demo quick-login buttons when `showDemoLogin()` is true; error alert; security note; support mailto for forgot password (`hello@oleachron.app`); link to Register.
- Chrome: theme toggle (light/dark), language `en` / `el`.
- Forms: `email`, `password` (show/hide). Submit logs in.
- Invite pages send `/login?redirect=…`. **LoginPage does not read the `redirect` query param.** After login the user goes to `roleHomePath`, then `/experience` if mode is unchosen.

- **Register** — `/register`
- Purpose: Create an account. Server always persists `FieldOwner`.
- Who: Unauthenticated.
- Modes: Same post-login home rules as Login.
- Information shown: `RegisterHero` (title, subtitle, three steps: Account / Fields / Season, “included” checklist of three items).
- Forms: `firstName`, `lastName`, `email`, `password` (min 8 on client; API `RegisterDto` min 6, validator min 8), `confirmPassword`. Theme and language chrome as on Login. Link to Login.

### Mobile

- **Login** — Auth stack `Login` (`login`)
- Purpose: Same as website login.
- Who: Unauthenticated.
- Forms: email, password. Navigate to Register.

- **Register** — Auth stack `Register` (`register`)
- Purpose: Same as website register.
- Forms: first name, last name, email, password, confirm password.

- **Session expired** — Auth stack `SessionExpired` (`expired`)
- Purpose: Shown when the API session-expired handler fires while authenticated (then user is logged out).
- Information: title and message that the session ended; action to return to Login.
- Not present as a dedicated website page (website logs out and goes to `/login`).

---

## Feature: Experience mode selection

First-run chooser plus later switching.

### Website

- **Experience chooser** — `/experience`
- Purpose: Require an explicit Everyday vs Full picture choice (and font size) before the main app.
- Who: Authenticated users with `experienceModeChosen === false`. `MainLayout` redirects here.
- Modes: This page *sets* the mode.
- Information shown:
  - Step `mode`: title, subtitle, Everyday card (description + hint, recommended badge for FieldOwner/Producer/ServiceProvider), Full picture card (description + hint, recommended for Agronomist/Administrator), footer that Settings can change it later
  - Step `comfort`: title, subtitle; buttons `default` / `large` / `xl`; skip (keep current font)
- Actions: pick mode → pick font → `chooseExperienceMode` and navigate to `rehomePathForMode`

Header and Settings also expose **ExperienceModeToggle** (Everyday / Full picture) for any signed-in user after the first choice.

### Mobile

- **Experience chooser** — not a stack route; `MainLayout` renders `ExperienceChooserScreen` when `experienceModeChosen` is false.
- Purpose: Same as website, plus theme on the comfort step.
- Step `mode`: Everyday and Full picture options with recommended highlighting.
- Step `comfort`: theme `system` / `light` / `dark`; font `default` / `large` / `xl`; large-controls toggle; continue.
- Later switching: More screen mode buttons; Settings experience section; “Set up this phone” sets Everyday + large text + large controls.

---

## Feature: Field invite acceptance

Accept a share link to join a field with capacities.

### Website

- **Invite accept** — `/invite/:token`
- Purpose: Show invite details and accept membership on a field.
- Who: Anyone with the token. Accept requires login (`/login?redirect=/invite/:token` if not authenticated).
- Modes: Both (no mode gating).
- Information shown: title; `fieldName`; `capacities` joined as text; error if missing; Accept button. After accept → `/partners?fieldId={fieldId}`.
- Empty/error: “invite missing”; link to Login if no invite loaded.

### Mobile

- **InviteAccept** — Auth and root stack `InviteAccept` (`invite/:token`)
- Purpose: Same. Pending token is consumed after login via `takePendingInviteToken`.
- Information: field name, capacities, accept action.

---

## Feature: Family invite acceptance

Accept a family-circle invite with modules and access level.

### Website

- **Family invite accept** — `/family-invite/:token`
- Purpose: Join an owner’s family circle.
- Who: Anyone with the token. Accept requires login.
- Modes: Both.
- Information shown: owner display name; translated module list (`fields`, `tasks`, `documents`, `money`, `calendar`, `harvest`); Accept button. After accept → `/partners`.
- Invite payload also includes `phone`, `email`, `accessLevel`, `expiresAt`, share URLs (WhatsApp, mailto, SMS) — used when creating the invite, not all shown on accept.

### Mobile

- **FamilyInviteAccept** — Auth and root stack (`family-invite/:token`)
- Purpose: Same. Pending token via `takePendingFamilyInviteToken`.
- Additional vs website: QR image (220×220) when `invite.shareUrl` is present; WhatsApp share button when `invite.whatsAppUrl` is present. `accessLevel` is not shown.

---

## Feature: Dashboard

Full-picture command home. Aggregates fields, tasks, money, and “my actions.”

### Website

- **Dashboard** — `/dashboard`
- Purpose: Overview for Full picture. Everyday visitors are redirected to `/today`.
- Who: Nav roles `FieldOwner`, `Producer`, `Agronomist`, `Administrator`. ServiceProvider does not have this nav item. Family members do not get extra hiding here beyond mode.
- Modes: **Full only** (Everyday `Navigate` to `/today`).
- Information shown:
  - Mock onboarding: `DemoTourPanel` when mock mode and tour not dismissed
  - Greeting (`firstName` or email local-part), page title, formatted date
  - Period chips `today` / `week` / `month` when `myActionsDetail` (Full)
  - **HeroActionCard** (`myActions`): `topAction` (`complete_task` | `add_evidence` | `log_harvest` | `log_expense` | `contact_partner` | `none`); `pending.overdue`, `dueToday`, `pendingApproval`
  - Producer-only hero card: link to Today
  - Quick actions: Producer → Today; FieldOwner/Admin → Calendar, Reports, New task; all → Fields, Tasks, Partners
  - Alerts (not gated by `alertsPlain`): overdue count, fields-at-risk count (owner), pending-approval count (owner); or “all clear” for owner
  - **MyActionsStrip** (Full density): Jobs done (`tasksCompleted`), Started (`tasksStarted`), Photos added (`evidenceAdded`), Harvests (`harvestsRecorded`), Costs logged (`expensesLogged`), Partner contacts (`contactsSent`), each vs `previousCounts` trend %
  - **NotesWidget**: up to 5 notes (`body` preview, `pinned`, `fieldId` name, `updatedAt`); See more → `/notes`
  - **ActionSparkline**: `series[]` `{ date, total }`
  - Owner stats (not gated by `dashboardStats`): total fields, total area (ha), overdue, this-week expenses (`FinancialOverview.thisWeekExpenses`, `currency`)
  - Producer stats: due today, in progress, pending, completed
  - Fields panel (4 rows): `name`, `area`, `variety`, `currentLifecycleYear`, open-task count; empty state with link to `/fields/new` for owners
  - Priority tasks (5): `title`, field name, overdue badge, `status`
  - **RecentActivityFeed**: `MeDashboardActivity` `type`, `message`, `fieldId`, `timestamp`, `taskId` (up to 10)
- Data: `GET /api/v1/me/dashboard?period=`, fields, tasks, financial overview (owners)

### Mobile

- **Dashboard** — tab `Dashboard` (`dashboard`), hidden from the tab bar; opened from More when `isFieldOwner()`.
- Purpose: Full-picture overview. Initial tab is Dashboard only when Full picture **and** FieldOwner.
- Who: Any authenticated user can deep-link; More entry is FieldOwner-only.
- Modes: Intended for Full; widgets still honor `showWidget`. Full-picture tutorial overlay (`full.step1`, `full.step2`) until `fullTutorialSeen`.
- Information shown: greeting; period chips; HeroActionCard; MyActionsStrip; NotesWidget; ActionSparkline; weather widget; alert banner (overdue / pending approval); agenda tasks (5); top 3 field cards; activity timeline; quick nav (Fields, Tasks, Calendar, Partners); owner money overview when Full; stats from `useDashboardStats`.

---

## Feature: Today

Action-first daily home: recommended tasks, route, and compact “my actions.”

### Website

- **Today** — `/today`
- Purpose: What to do now and a nearest-next field route. Everyday home for all roles; also Producer home in Full.
- Who: Nav roles include all five JWT roles.
- Modes: Both. Everyday is the primary home. Widgets `myActions` / `recentNotes` show HeroActionCard (density everyday), MyActionsStrip **everyday tiles** (Jobs done, Still open = `pending.overdue + pending.dueToday + max(tasksStarted,0)`, Due today), NotesWidget (3), RecentActivityFeed (3). No weather widget on web Today.
- Information shown:
  - Title, subtitle
  - Location badge: “Location ready” or error text
  - Start route / End route when GPS fields exist
  - Recommended tasks (up to 3): `title`, `status`, `scheduledEnd`; actions View field, Open task
  - Empty: no-tasks title/description
  - Route list: field `name`, distance km, next due date, order number; route-mode Go / Mark done; Open; Directions (Google Maps)
  - Leaflet map: current location marker, numbered field markers
  - Empty route state
  - Mock: DemoTourPanel
- Task filter: open tasks assigned to the user, or unassigned on fields where the user has work/help capacity (or owner / assigned producer / Producer role fallback).

### Mobile

- **Today** — tab `Today` (`today`)
- Purpose: Same daily home.
- Who: All authenticated roles (primary tab).
- Modes: Both. Everyday tutorial (`everyday.step1`–`step3`) until `everydayTutorialSeen`. Everyday shows 4 following tasks; Full shows 8.
- Information shown: next task; following tasks; weather advice line (frost / rain); harvest-focus hint (`pickNextHarvestWork`); overdue count; up to 3 route fields with directions; HeroActionCard, MyActionsStrip, NotesWidget, ActivityTimeline when widgets allow.

---

## Feature: Fields

List and map of orchards/fields the user can access.

### Website

- **Fields list** — `/fields`
- Purpose: Browse fields, search/sort, switch list vs map, add or delete (owner).
- Who: Nav `FieldOwner`, `Producer`, `Agronomist`. Family needs module `fields`.
- Modes: Both. Everyday adds CSS class `fields-page--everyday`. Map uses `fieldMapDefault`.
- Information shown:
  - Title; subtitle by role (owner / producer / default)
  - Add field (hidden for `Producer`)
  - Summary strip: field count, active tasks, overdue count
  - Search: `name`, `variety`, `groundType`
  - Sort: `name` | `area` | `overdue`
  - List/map toggle
  - **FieldCard** per field: `name`, lifecycle year indicator, assigned badge if not owner, area, variety, irrigation, location, task stats (`pending`, `inProgress`, `completed`, `overdue`), progress %, assigned producer names (non-Producer viewers), next recommended task (Producer), overflow menu delete (owner)
  - Map: `FieldsMap` with field press and start-next-task
  - Empty: no fields (create CTA if not Producer); no search results
- Field statuses in data: `Draft`, `NeedsBoundaryConfirmation`, `NeedsAreaReview`, `Active`, `Archived`

### Mobile

- **Fields** — tab `Fields` (`fields`)
- Purpose: Same list/map.
- Who: Authenticated users who can load fields (API-scoped).
- Modes: Both. Owner title vs default title.
- Information shown: summary chips — field count, total area, open tasks (badge = overdue field count), irrigated count; list/map toggle; `DashboardFieldCard` rows (name, open tasks, overdue, next job title); `FieldsMap`; empty state; owner can add field (navigates to FieldForm).

---

## Feature: Field create and edit

Wizard to add or edit a field, including cadastre and boundary.

### Website

- **New field** — `/fields/new`
- **Edit field** — `/fields/:id/edit`
- Purpose: Create a draft field and confirm boundary/crop details, or edit an existing field.
- Who: Protected app users. Add button hidden for Producer. Edit actions on detail require `canOwn`.
- Modes: Both. **Website always starts at `method` for create** (no Everyday skip).
- Wizard steps (create): `method` → (`cadastre` if cadastre method) → `basics` → `boundary` → `crop` → `review`. Edit: `basics-edit` → `boundary` → `crop` → `review`.
- Cadastre step inputs: `kdFile` (.pdf), `kfFile` (.pdf).
- Actions: Back, Next, Activate, Save draft (not on method/last), Delete field (edit only).
- **Method** (`AddFieldMethod`): `draw` | `cadastre` | `kaek`
- **Basics** forms: `name` (required, min 2), `cropType` (Olive), `locationText`, `kaek` (KAEK regex when method is kaek), `worksThisFieldMyself` checkbox
- **Cadastre**: upload extract; response `draftFieldId`, `suggestedName`, `greekCadastre` (`kaek`, `normalizedKaek`, `officialAreaSqm`, `titleAreaSqm`, `locationFromCadastre`, `cadastralOffice`, `prefecture`, `municipality`, `postalCode`, `coordinateSystem`, `mapScale`, `extractPrintDate`, `source`, `verificationStatus`, `areaDifferenceSqm`, `areaDifferencePercent`), `warnings`, `duplicateKaekFieldIds`
- **Boundary**: GeoJSON polygon draw; `appMeasuredAreaSqm`; `FieldAreaValidationResponse`
- **Crop** forms: `treeCount`, `variety` (Koroneiki, Kalamon, Megaritiki, Manaki, Unknown, Other), `irrigationType` (Rainfed, Drip irrigation, Sprinkler, Mixed, Unknown), `irrigationStatus`, `soilType` / `groundType` (Clay Loam, Sandy Loam, Loam, Rocky, Calcareous, Unknown, Other), `slope` (Flat, Slight slope, Moderate slope, Steep, Unknown), `treeAge`, `accessNotes`
- **Review**: confirm boundary checkbox; confirm cadastre checkbox if cadastre present; create/save
- Also persisted: `latitude`, `longitude`, `area`, `status`

### Mobile

- **FieldForm** — stack modal `FieldForm` (`fieldId?`)
- Purpose: Same wizard. Everyday and Full use different step lists.
- Everyday new: `basics` → `method` (`draw` | `later` only) → `boundary`. No crop/review. `later` saves `Draft` without a boundary. Basics show `name` and conditional KAEK (cropType and locationText hidden).
- Full new: `method` (`draw` | `cadastre` | `kaek`) → (cadastre if needed) → `basics` → `boundary` → `crop` → `review`.
- Edit: `basics` → `boundary` → `crop` → `review`.
- **FieldMapBoundary** — stack modal `FieldMapBoundary` (`fieldId`)
- Purpose: Dedicated map to draw/edit the field polygon (tap vertices, satellite/street toggle, clear, save; min 3 points).

---

## Feature: Field detail

Per-field control room: map, weather, costs, harvest, people, tasks, intelligence.

### Website

- **Field detail** — `/fields/:id`
- Purpose: Work a single field. `/fields/:id/people` redirects to `/partners?fieldId=:id`.
- Who: Users who can load the field. Header actions (templates, edit) for `canOwn`. Task start/complete for `canWork`. Harvest add/void for `canOwn`. People manage for `canOwn`; advise comments for `canAdvise`.
- Modes:
  - **Everyday**: season line (`currentLifecycleStage` · `currentLifecycleYear`); compact map 200px; “What to do here today” + evidence upload; costs compact; people strip; optional “More about this field” peek that loads intelligence and may show Full-picture onramp; no control-room tabs; no harvest panel; no start-next in the status bar (start is in the next-action card)
  - **Full**: overdue count, next due date, start next task; map 420px; harvest panel; FieldIntelligencePanel always if boundary; control-room tabs Board / Timeline / Evidence; sidebar cadastre, basic info, lifecycle management, full people panel
- Header actions: Money (`/money?fieldId=`), History, Task templates (`canOwn`), Edit (`canOwn`), Back. Query `?action=start` auto-starts the recommended task.
- Information shown (shared):
  - Field name; `FieldStatusBadge`; `LifecycleIndicator`; directions (lat/lng)
  - `FieldAlertList` when boundary exists (`alertType`, `severity`, `title`, `message`, `confidence`)
  - **FieldCostsPanel** when `fieldCosts`: spent, received, net; posted entries; add/void
  - Map (`FieldDetailMap`): Everyday satellite/street + peek for overlays; Full `MapLayerPanel`, overlay chips, `SatelliteDateSelector`, legend, opacity
  - **FieldWeatherCard** when `weatherAdvice` and field has center (Everyday: temp + advice + peek; Full: high/low, humidity, wind, outlook, frost, stale, source modal)
  - Facts: area, `variety`, `locationText`
  - **AreaComparisonCard** when `cadastreDetails`: official vs measured sqm
- Full control room:
  - Board: `FieldMonitoring` (completion rate, total cost, upcoming 7-day deadlines, status breakdown, recent 5 tasks), `FieldTaskBoard` columns overdue / today / this week / done
  - Timeline: `FieldTimeline` filter All / task changes / evidence / assignments / stage-year / crew; event types Task, Evidence, Assignment, Approval, Crew, Lifecycle, Cost, Income, Harvest
  - Evidence: latest photos; before/after pair for latest task (`requiresBeforeAfter` when type contains `prun`, `spray`, or `pest`)
  - My tasks (producer/canWork): title, status, due; Start / Complete; evidence `kind` (`before`/`after`/`general`), `photoUrl`, `notes`; before/after required hint for some task types
- Full sidebar:
  - Greek cadastre card (collapsible)
  - Complete-boundary CTA if `Draft` or `NeedsBoundaryConfirmation`
  - Basic info: area, variety, treeAge, groundType, irrigation yes/no
  - Lifecycle: `LifecycleIndicator` year + stage; initialize; cycle start date; advance stage; revert stage; progress low↔high with confirm
  - `FieldPeoplePanel` (non-compact)

### Mobile

- **FieldDetail** — stack `FieldDetail` (`fieldId`, optional `focus`: `harvest` | `harvest-final` | `money`)
- Purpose: Same field workspace.
- Who: Users who can open the field.
- Modes: Everyday and Full use different layout order.
- Everyday order: name + season line + “This is wrong” (`canOwn`); overdue banner; environmental alerts (max 2, `alertsPlain`); next-task CTA (`canWork`); `FieldHarvestCard` (compact unless `harvest-final`); `FieldCostsCard`; `WhoWorksHere`; directions; map 160px; upcoming tasks (max 5); peek → intelligence, maps, edit, Full-picture onramp.
- Full order: `FieldDetailHeader` (health, tasks, overdue); map 300px; toolbar (tasks, calendar, money, maps, history, edit); harvest + costs; `WhoWorksHere`; advisor comments (`advisorComments` + `canAdvise`); all alerts; intelligence; upcoming tasks; lifecycle stepper; cadastre; InfoRows; activity timeline; manage field (lifecycle + create task) when `canOwn`.
- Harvest add on mobile: `canWork`. Void: `canOwn`.

---

## Feature: Field history

Weather and vegetation time series for one field.

### Website

- **Field history** — `/fields/:id/history`
- Purpose: Charts of daily weather and satellite vegetation over 90 days, 1 year, or 3 years.
- Who: Authenticated users who can load the field (linked from field detail).
- Modes: Both (no FullOnlyRoute). Density tools are Full-oriented but the route is allowed in Everyday via field navigation.
- Information shown:
  - Range chips: `90d` | `1y` | `3y`
  - Weather series: `minTemperatureC`, `maxTemperatureC`, `rainTotalMm`, `et0Mm` (daily or monthly aggregates)
  - Vegetation series: satellite `ndvi.mean`, `ndmi.mean` for usable observations
  - Gathering/backfill state when fewer than 60 weather days or 6 usable satellite observations
  - Empty/error; back to field

### Mobile

- **FieldHistory** — stack `FieldHistory` (`fieldId`)
- Purpose: Same history view for the field.

---

## Feature: Field task templates

Catalog of olive task templates for one field, used to create scheduled tasks.

### Website

- **Field task templates** — `/fields/:id/task-templates`
- Purpose: Browse `OLIVE_TASK_TEMPLATES`, filter, and start the create-task wizard with `templateId` + `fieldId`.
- Who: **FieldOwner or Administrator**. Other roles see an access-restricted empty state.
- Modes: Both.
- Field context strip: `name`, `variety`, irrigation (drip vs rain-fed), static tree type / production / region labels.
- Information shown:
  - Filters: search, category, season (`All year` | `Winter` | `Spring` | `Summer` | `Autumn` | `Harvest season`), priority, recommended-only, field-suitable-only
  - Year calendar with template highlights
  - Template cards: `category`, `priority`, `title`, `shortDescription`, recommended-now / coming-soon / passed-season, month chips; expand `whyItMatters`, checklist preview
  - Detail panel: `timingExplanation`, `repetition`, `estimatedDuration`, `requiredInputs`, `checklist`, `warnings`, `completionFields`, Create Task
  - Empty filter state
- Catalog (27 templates): general field inspection, soil analysis, leaf analysis, annual fertilization plan, nitrogen application, pre-flowering nutrition check, potassium nutrition check, main pruning, remove pruning residues, sucker removal, weed control / mowing, pre-harvest field access cleanup, irrigation system startup inspection, irrigation event, irrigation filter cleaning, olive fruit fly trap installation, olive fruit fly monitoring, fruit damage sampling, disease scouting, post-pruning disease protection review, ripening index sampling, harvest planning, olive harvest, equipment maintenance, harvest equipment preparation, post-harvest field inspection, post-harvest irrigation check, annual field report.
- Categories: Observation, Soil & Analysis, Fertilization, Irrigation, Pruning, Weed Management, Pest Monitoring, Disease Management, Harvest, Equipment, Post-Harvest. Priorities: `Low` | `Medium` | `High` | `Critical`.

### Mobile

Not a standalone screen. Create Task can start from a template via `CreateTask` params / in-wizard selection.

---

## Feature: Tasks

List and board of work items.

### Website

- **Tasks list** — `/tasks` (query `?focus=`, `?status=`)
- Purpose: Filter, search, and open tasks; owners add from template.
- Who: Nav `FieldOwner`, `Producer`, `Agronomist`. Family needs module `tasks`. Producer API filter uses `assignedTo=userId`.
- Modes: Everyday forces **list** (no board). Full can toggle list/board when `taskBoardView`.
- Information shown:
  - Title; subtitle producer vs default
  - Owner: Add from template → `/tasks/new`
  - Summary: active, overdue, due today
  - Filters: search (`title`, `type`, `description`); focus pills `all` | `action` (overdue or due today) | `active` | `completed`; field (owner); sort `due` | `priority` | `field` (owner) | `recent`; status pills `all` | `pending` | `in_progress` | `completed`
  - Owner recommended templates (up to 4) for a selected field: `category`, `title`, `shortDescription`; Schedule / Browse all
  - List `TaskCard`: `type` chip, `priority`, template sparkle, `status`, `title`, `description` (non-compact), field name, `scheduledEnd` + overdue/due-today, checklist count. **Approval is not shown on the web list.**
  - Board (`TasksBoardView`): columns `overdue`, `today`, `thisWeek`, `done`
  - Empty: no tasks (owner CTA) or no search results

Task record fields: `id`, `fieldId`, `templateId`, `type`, `title`, `description`, `status` (`pending` | `in_progress` | `completed`), `assignedTo`, `partnerUserId`, `serviceContactRequestId`, `approvalStatus` (`not_required` | `pending` | `approved` | `rejected`), `approvalNote`, `priority` (`Low` | `Medium` | `High` | `Critical`), `estimatedMinutes`, `materials`, `checklist`, `scheduledStart`, `scheduledEnd`, `actualStart`, `actualEnd`, `lifecycleYear`, `harvestPhase` (`prepare` | `daily` | `final` on mobile/API), `cost`, `evidence[]` (`photoUrl`, `notes`, `timestamp`, `kind`), `notes`

### Mobile

- **Tasks** — tab `Tasks` (`tasks`, optional `fieldId`, `filter`)
- Purpose: Same list.
- Who: Authenticated. Tab badge = overdue + `approvalStatus === 'pending'`.
- Modes: Everyday compact cards, 3-line header, no search. Full: search, sort (`due` | `priority` | `field` | `recent`), density.
- Information: chips `all` | `pending` | `in_progress` | `completed` plus `approval` for FieldOwner; `TaskCard` rows; empty; owner can open CreateTask.

---

## Feature: Task create

Wizard to create a task from a template or manually.

### Website

- **New task** — `/tasks/new` (query `templateId`, `fieldId`, `month`)
- Purpose: Four-step create. `TaskFormPage` also has edit-mode code when `:id` is present; **App.tsx does not register `/tasks/:id/edit`**, though Task detail’s Edit button links there.
- Who: **FieldOwner only** for the create wizard (header/calendar CTAs). Other roles hitting the page do not get the wizard.
- Modes: Both.
- Steps: `field` → `template` → `schedule` → `review`
- Forms / inputs:
  - Field picker
  - Template search, recommended-only toggle, or manual mode (category + title)
  - `title`, `description`, `type`, `lifecycleYear` (`low`/`high`), `assignedTo` (producer list), `scheduledStart`, `scheduledEnd`, `priority`, `checklist` (add steps), `repetition`, `completionFields`, `notes`
- Actions: next/back, create

### Mobile

- **CreateTask** — stack modal `CreateTask` (`fieldId?`, `scheduledStart?`, `scheduledEnd?`, `templateId?`)
- Purpose: Create-task wizard with `TaskWizardStepIndicator`. Everyday skips `review` when `taskCreateReview` is off. Harvest jobs from `HARVEST_JOBS` with `harvestPhase` `prepare` | `daily` | `final`.
- Who: Owners and others who can create (API enforces family `tasks` + `work` for create).

---

## Feature: Task detail

Single task: status, assignment, evidence, partner CTA.

### Website

- **Task detail** — `/tasks/:id`
- Purpose: View and progress one task.
- Who: Users who can load the task. Edit/approve/assign: FieldOwner. Status change: FieldOwner or Producer assigned to the task (`canEdit`).
- Modes: Both.
- Information shown:
  - Title, `status`, `approvalStatus`
  - Description
  - Field name (link), assigned user (`firstName`, `lastName`, `email`), scheduled start/end, actual start/end, `type`, `lifecycleYear`
  - FieldOwner: Need help / Find partner → `/partners?fieldId=&taskId=&from=task&taskType=&start=&end=`
  - Actions: Approve / Reject (prompt `approvalNote`) when completed + pending; Mark as in_progress / completed; assign or reassign producer select
  - Evidence upload (`EvidenceUpload`, `kind: 'general'`)
  - Edit button (FieldOwner) → `/tasks/:id/edit` (route not registered in `App.tsx`)
  - Not-found / load-error states

### Mobile

- **TaskDetail** — stack `TaskDetail` (`taskId`)
- Purpose: Same. Everyday hides `TaskStatusStepper` (`taskDetailStatusStepper`) and extra detail (`taskDetailMore`). Harvest-phase checklists (`prepare` / `daily` / `final`). `harvest-final` focus. `canOwn` / `canWork` / `canAdvise` for start/complete/approve.
- Information: title, status, approval, field, assignee, schedule, type, lifecycle year, evidence form, partner/find-help when applicable. FieldOwner-only edit. Producer: add photo, add note, save. Owner: save, harvest extras, delete.

---

## Feature: Calendar

Scheduled tasks and recommended templates on a calendar.

### Website

- **Calendar** — `/calendar`
- Purpose: Month/week/agenda/field views of `CalendarEvent`s.
- Who: Nav all five roles. Family needs module `calendar`.
- Modes:
  - **Everyday**: agenda only; view toggle hidden; day drawer closed by default on desktop
  - **Full**: month (`calendarMonthView`), week (`calendarWeekView`), field (`calendarFieldView`), agenda
- Information shown:
  - Title, subtitle; New task; FieldOwner From template
  - Period nav (prev/next/today); header label month/week
  - **CalendarFilterBar**: field picker; `showTasks`, `showLifecycles`, `showDeadlines`; status (`all` | `pending` | `in_progress` | `completed` | `overdue`); priority (`all` | `Low` | `Medium` | `High` | `Critical`); category (`all` | `task` | `lifecycle` | `deadline`)
  - **CalendarLegend**
  - Events: click → task or field
  - Recommendations for month/day; schedule recommended template
  - **CalendarDayPanel** (drawer): day’s events and recommended templates
- Event filters type: `CalendarFilters`

### Mobile

- **Calendar** — hidden tab `Calendar` (`calendar`, optional `date`, `fieldId`); opened from More as “This week”
- Purpose: Agenda-oriented calendar (`CalendarEventRow`, filter sheet). FieldOwner FAB create task. Event → `TaskDetail` or `FieldDetail`.
- Modes: Tab hidden in both modes; reachable from More. Everyday: agenda + month (`CalendarGrid`). Full: also week and field views. Filter sheet matches website (field, status including overdue, priority, category).

---

## Feature: Money / costs

Field-scoped expenses and income.

### Website

- **Money** — `/money` (query `?fieldId=`)
- Purpose: Pick a field and view/add/void financial entries.
- Who: Nav `FieldOwner`, `Producer`, `Agronomist`, `Administrator`. Family needs module `money`. `canAdd` = canWork or Producer or owner; `canVoid` = canOwn / FieldOwner / field owner.
- Modes: Both. Everyday: compact panel + everyday hint subtitle. Full: `detailed` form fields.
- Information shown:
  - Title; everyday vs full hint
  - Link to This harvest for FieldOwner/Administrator
  - Field picker buttons (`name`) when more than one field
  - Empty: no fields
  - **FieldCostsPanel**: `totalExpenses`, `totalIncome`, `net`, `currency`, `thisWeekExpenses`, `expensesByBucket`; list of posted entries (`amount`, `description`, `kind` expense/income, `bucket` labor/inputs/harvest/other, `occurredOn`, `taskId`, `quantity`, `unit`, `unitPrice`, `notes`, `status`)
- **Add cost form** (`AddCostSheet`): `amount`, `description`, `bucket`, `kind`, `occurredOn`; Full/`detailed` also `category` (labor, mill_cost, harvest_workers, fertilizers, other), `taskId`, `quantity`, `unit`, `unitPrice`, `notes`
- Also on Field detail when `fieldCosts` widget is on.

### Mobile

- **Money** — stack `Money` (`money`); More item when role is FieldOwner, Producer, Agronomist, or Administrator.
- Purpose: Same field costs UI (`FieldCostsCard`).
- Field detail can focus money via `focus: 'money'`.

---

## Feature: This harvest

Season rollup of olives, spend, and income across fields.

### Website

- **This harvest** — `/this-harvest`
- Purpose: Current harvest season totals and per-field cards.
- Who: Nav `FieldOwner`, `Administrator`. Family needs module `harvest`.
- Modes: Everyday allowed under More paths; Full in operations nav.
- Information shown:
  - Title; season year (`currentHarvestSeason`)
  - Totals: olive kg, spent (`totalExpenses`), received (`totalIncome`), net (`netProfit`)
  - Per-field cards: `fieldName` (link to field), olive kg, spent, received (if > 0)
  - Empty title/hint when all zeros
- Data: harvest records, profit/loss, field summaries for the season.

### Mobile

- **ThisHarvest** — stack `ThisHarvest` (`this-harvest`); More item when `isFieldOwner()`.
- Purpose: Same season totals.

---

## Feature: Harvest recording

Log a harvest event on a field (Full picture panel).

### Website

- Not a standalone route. **FieldHarvestPanel** on Field detail when `isFullPicture`.
- Who: Create needs family module `harvest` plus `work` (or `canOwn`). Void: field owner or Administrator.
- Modes: **Full only** on website field detail.
- List: posted `HarvestRecord` — `harvestDate`, `oliveKg`, `oilKg`, `oilYieldPercent`, `workersUsed`, `harvestMethod`, `millName`, `qualityGrade`, `notes`, `status`
- Create form: `harvestDate`, `oliveKg` (required), `oilKg`, `workers`, `method`, `millName`, `saleAmount`, `millCost`, `notes`
- Actions: add (can auto-create financial entries from `saleAmount` income and `millCost` expense), void (also voids linked financial entries)

### Mobile

- `FieldHarvestCard` on Field detail in **Everyday** (compact) and Full. `focus: 'harvest' | 'harvest-final'` scrolls to it. Add: `canWork`. Void: `canOwn`.

---

## Feature: Lifecycle

Biennial olive year (`low` / `high`) and phenology stage on a field.

### Website

- Embedded on Field detail (Full sidebar) and Field cards (`LifecycleIndicator`).
- Who: Initialize / advance / revert / progress year: `canOwn`.
- Modes: Year/stage shown in Everyday season line; management controls Full sidebar.
- Information: `currentLifecycleYear`, `currentLifecycleStage`, `cycleStartDate`; actions initialize, advance stage, revert stage, progress to other year (confirm).

### Mobile

- Lifecycle chips/cards on field UI. **`LifecycleScreen.tsx` exists but is not registered** in RootNavigator or MainTabs.

---

## Feature: Partners, people, and family

Grove people, saved contacts, family circle, and “need help” categories.

### Website

- **Partners home** — `/partners` (query `fieldId`, `add=1`, `from`, `taskType`/`category`, `taskId`, `start`, `end`). `/people` redirects here.
- Purpose: One place for family, field people, contacts, and starting a partner search.
- Who: Nav all five roles. Family manage: FieldOwner, Administrator, or owner of at least one field. Field people manage: `canOwn` / FieldOwner / Administrator / field owner.
- Modes: Both (Everyday primary nav).
- Information shown:
  - Field selector
  - **FamilySection**: circle `seatsUsed` / `seatsMax`; members `displayName`, `phone`, `email`, `modules`, `accessLevel`, `status`, checklist (`hasContact`, `inviteSent`, `accepted`, `hasModules`, `canCallOrMessage`); pending invite share URLs
  - **AddFamilySheet** forms: `displayName`, `phone`, `email`, modules checkboxes, access level `view`/`help`/`work`
  - Grove people (`PersonCard`): memberships, outgoing requests, saved contacts; connections; phone actions
  - Unassigned saved contacts
  - **AddPersonSheet** / **SavedContactSheet**: `displayName`, `phone`, `email`, `notes`, `serviceCategoryIds`, `fieldIds`, `source` (`Manual` | `PhoneBook`)
  - **NeedHelpSection**: service categories (`slug`, localized `name`/`description`, `icon`, `isProminent`) → search
  - Empty people state; invite CTA when `canInvite && fieldId`

### Mobile

- **Partners** — stack `Partners` (`fieldId?`, `category?`, `taskId?`, `addContact?`); More item for all roles that use More.
- Purpose: Same home. **`PeopleScreen.tsx` exists but is not registered** (Partners replaced it).

---

## Feature: Partner search

Radius search for listed service providers near a field.

### Website

- **Partner search** — `/partners/search?fieldId=&categoryId=&category=&radiusKm=&taskId=&start=&end=`
- Purpose: List providers in a radius for a category.
- Who: Authenticated; requires `fieldId` or redirects to `/partners`.
- Modes: Both.
- Information shown:
  - Title; `fieldApproximateArea`; selected category chip
  - Distance select: 25 / 50 / 60 / 100 km; expand via `nextRadiusKm` / `canExpandRadius`
  - Results: `displayName`, `photoUrl`, `businessName`, `providerKind`, categories, `distanceKm`, `availability`, `experienceYears`, `crewSize`, `equipment`, `isVerified`, `verificationStatus`, `completenessScore`, `serviceRadiusKm`, `baseAreaLabel`, `pricingNote`
  - Empty / error; open profile

### Mobile

- **PartnerSearch** — stack `PartnerSearch` (`fieldId`, `categoryId?`, `category?`, `radiusKm?`, `taskId?`)
- Purpose: Same search list.

---

## Feature: Partner public profile

View a provider and send a contact request.

### Website

- **Partner profile** — `/partners/:userId?fieldId=&categoryId=&category=&taskId=&start=&end=`
- Purpose: Public listing + contact form + optional add-to-field.
- Who: Authenticated.
- Modes: Both.
- Information shown (`PartnerPublicProfile`): `displayName`, `photoUrl`, `businessName`, `providerKind`, categories, `baseAreaLabel`, `serviceRadiusKm`, `serviceAreas`, `shortDescription`, `experienceYears`, `crewSize`, `equipment`, mill fields (`millOperatingPeriod`, `millProcessingMethod`, `millOrganic`, `millAppointmentRequired`), `languages`, `certifications`, `contactPreference`, `phoneNumber` (PhoneActions), `availability`, `availableFrom`, `availableUntil`, `isVerified`, `verificationStatus`, `pricingNote`, `completenessScore`
- Forms: `message` (required), `start`, `end`, `categoryId`
- Actions: send contact (`CreatePartnerContactPayload`); add to field (`upsertMembership` with `work`)

### Mobile

- **PartnerProfile** — stack `PartnerProfile` (`userId`, `fieldId?`, `categoryId?`, `taskId?`)
- Purpose: Same profile and contact.

---

## Feature: My service profile

Offer services: create/edit listing, pause, go to requests.

### Website

- **My services** — `/partners/me`
- Purpose: Activate a `ServiceProviderProfile` and edit via wizard.
- Who: Any authenticated user (Settings links here). Listing is not limited to the `ServiceProvider` JWT role.
- Modes: Both.
- Information shown: listed / paused / not listed; `displayName`, `shortDescription`, `baseAreaLabel`, radius, `providerKind`, `crewSize`, category chips
- Actions: Enable (`activate`), Pause / Resume, Requests, Edit
- **ServiceProfileWizard** (`UpsertServiceProfilePayload`): `displayName`, `photoUrl`, `businessName`, `providerKind` (`Individual` | `Team` | `Business`), `serviceCategoryIds`, lat/lng, `baseAreaLabel`, `serviceRadiusKm`, `serviceAreas`, `shortDescription`, `experienceYears`, `equipment`, `crewSize`, mill fields, `languages`, `certifications`, `contactPreference` (`InApp` | `Phone` | `Both`), `showPhone`, `phoneNumber`, `availability` (`Available` | `Limited` | `Unavailable`), `availableFrom`, `availableUntil`, `pricingNote`

### Mobile

- **MyServices** — stack `MyServices`; More “My services”
- Purpose: Same (`ServiceProfileScreen`).

---

## Feature: Service contact requests

Inbox of incoming/outgoing partner contact requests.

### Website

- **Service requests** — `/partners/requests`
- Purpose: Provider inbox and sent requests.
- Who: Authenticated (linked from My services).
- Modes: Both.
- Information shown: tabs incoming / outgoing; each row `requesterName` or `providerName`, `status` (`New` | `Viewed` | `Accepted` | `Declined` | `Closed`), category, `message`, `approximateArea`, `areaHectares`, `suggestedStart`/`End`, `contactMethod`, `taskId`
- Actions (incoming New/Viewed): Mark viewed, Accept (optionally `linkTask`), Decline; Accepted/Declined: Close
- Empty: no requests

### Mobile

- **ServiceRequests** — stack `ServiceRequests`
- Purpose: Same inbox.

---

## Feature: Notes

Free-text notes, optionally pinned and linked to a field.

### Website

- **Notes** — `/notes` (Everyday More path; not a primary sidebar item)
- Purpose: Full list plus create/edit sheet.
- Who: Authenticated users who can call `GET /api/v1/me/notes`.
- Modes: Both. Everyday widget `recentNotes` also embeds NotesWidget on Today/Dashboard.
- List: pin icon, preview title (first line of `body`), full `body`, field name, relative `updatedAt`
- Empty title/description
- **NoteSheet** forms: `body` (required, max 4000), `fieldId` select, `pinned` checkbox; save; delete if existing

### Mobile

- **NotesList** — stack `NotesList` (`notes`)
- Purpose: Same list + sheet. Also NotesWidget on Today/Dashboard.

---

## Feature: In-app notifications

Product inbox (partner/user notifications) and a website header dropdown.

### Website

- Not a full-page inbox. **NotificationBell** + **NotificationDropdown** in the header.
- Who: Authenticated (MainLayout).
- Modes: Both.
- Bell badge capped at `9+`. Polls `GET /api/v1/me/notifications` every 60s via `partnerService.getNotifications()`. Local ephemeral items use prefix `notif-`.
- Dropdown items: `title`, `message`, `type` indicator (`info` | `success` | `warning` | `error`), relative `timestamp`, `read`; `actionUrl` navigation
- Actions: mark all read, clear all, remove one
- Empty: no notifications
- Separate from ministry (see next feature)

### Mobile

- **Notifications** — stack `Notifications` (`notifications`); More “Inbox” with unread badge (ministry unread + partner inbox unread); Settings → Notifications is **FieldOwner only**.
- Purpose: Combined list of `UserNotificationItem` (`type`, `title`, `message`, `relatedEntityId`, `relatedEntityType`, `actionUrl`, `isRead`, `createdAt`) and ministry rows, sorted by date desc.
- Rows show section label Inbox or Ministry; unread left-border accent; ministry priority badge (critical/high → error, medium → warning, else info). Pull-to-refresh reloads both sources.
- Actions: tap marks read (`markNotificationRead` or ministry `markAsRead`).

---

## Feature: Ministry notifications

Role-targeted regulations, subsidies, deadlines, alerts, training.

### Website

- **Ministry** — `/ministry`
- Purpose: List ministry notices for the current role.
- Who: Nav all five roles. Everyday More path.
- Modes: Both.
- Information shown: title; subtitle; urgent-only toggle (`getUrgentNotifications` vs `getNotifications`); mark all read; unread badge
- Item fields (`MinistryNotification`): `title`, `message`, `type` (`regulation` | `subsidy` | `deadline` | `alert` | `training`), `priority` (`critical` | `high` | `medium` | `low`), `date`, `expirationDate`, `read`, `actionUrl`, `category`, `targetRoles`
- Card: title, priority badge, type badge, message, category, relative date; Mark read; Open if `actionUrl`
- Actions: open (marks read), mark as read, mark all read
- Website mock: 8 items; expired hidden; read ids in localStorage `Oleachron_ministry_notification_read_ids_v1`

### Mobile

- Not a standalone ministry page. Rows appear on **Notifications**. More inbox badge includes ministry unread.
- API: `GET /api/v1/ministry/notifications?urgentOnly=`, `POST .../notifications/:id/read`, `POST .../notifications/read-all`. DTO has id, title, message, type, priority, date, read, actionUrl (no category/expiration).
- `MinistryNotificationList.tsx` and `MinistryNotificationCard.tsx` exist under `mobile/src/components/domain/` but are not imported by any screen.

---

## Feature: Analytics

Task, cost, and completion charts.

### Website

- **Analytics** — `/analytics`
- Purpose: Date-range analytics dashboard.
- Who: Nav `FieldOwner`, `Administrator`. Page also shows “no permission” for other roles. Hidden for Everyday (`FullOnlyRoute`) and for family members.
- Modes: **Full only**.
- Information shown:
  - Period: week / month / quarter / year (auto date range). Field filter uses all field IDs (no deselect UI).
  - Stats: total tasks, completion rate %, total cost, average completion time (days)
  - Pie: task status pending / in progress / completed
  - Bar: cost by field, cost by task type
  - Line: monthly completion rate (`completionRates.monthly[].rate`)
  - Field Performance table: Field, Total Tasks, Completed, Completion Rate, Total Cost, Avg Cost/Task
- Data: `analyticsService` task metrics, field metrics, cost analysis, completion rates, status distribution. `costOverTime` and daily/weekly completion series are fetched but not charted. `AreaChart` exists unused. `ProducerPerformance` is typed with no getter.

### Mobile

- **Analytics** — stack `Analytics`; More only when `isFullPicture && (FieldOwner || Administrator)`. Stack screen has no extra role gate.
- Purpose: Metrics lists, no charts. Period chips week / month / quarter / year.
- Displayed: total tasks; completed / completion rate %; in progress / pending; per-field `{completed}/{total} · {completionRate}%`.

---

## Feature: Reports

Season reports with preview and PDF / Excel / CSV export.

### Website

- **Reports** — `/reports`
- Purpose: Generate four report types for a harvest season.
- Who: Nav `FieldOwner`, `Administrator`. Full only. Hidden for family members.
- Modes: **Full only**.
- Controls: report type, season (current year and two prior), field multi-select (select all / clear), preview toggle
- Report types:
  - **field-summary**: name, location, variety, productionType, irrigationType; areaHa, treeCount, treeAge, soilType, lastPruningDate, lastSoilAnalysis, lastHarvestDate; tasksCompleted/pending/overdue; totalProductionKg, oilProducedKg, oilYieldPercent, yieldPerTree, yieldPerHa; totalCost, costPerHa, revenue, profit; issues[]; recommendations[]
  - **production-harvest**: field, harvest date, olive kg, oil kg, oil yield %, kg/tree, kg/ha, mill, quality; optional harvestMethod, workersUsed, deliveryTime, rejectedKg, oilAcidity, notes
  - **profit-loss**: totalIncome, totalExpenses, netProfit; income line “Money in”; 15 expense categories (labor, fertilizers, treatments, irrigationWater, electricityFuel, equipment, repairs, pruning, harvestWorkers, millCost, transport, packaging, storage, agronomist, other); KPIs when non-zero (costPerKgOlives, costPerKgOil, revenuePerKgOil, breakEvenPrice, profitPerHa, profitPerTree); profit by field; cost-breakdown bar
  - **field-comparison**: field, olive kg, oil kg, oil %, kg/tree, kg/ha, cost/ha, profit/ha, tasks, pest, water m³; insights bestYieldField, bestOilYieldField, mostProfitableField, mostExpensiveField
- Actions: export PDF, Excel, CSV
- Mock mode: `MOCK_*` from `mockReportData.ts`; demo-data badge

### Mobile

- **Reports** — stack `Reports`; same More gate as Analytics. No export. Season fixed to `currentHarvestSeason()` (no picker).
- Display: summary cards (fieldName, kg, totalCost, tasks completed/pending/overdue); harvest (fieldName, oliveKg, optional oilKg); P&L (totalIncome, totalExpenses, netProfit, profitByField); comparison (fieldName, oliveKg, cost, tasksCompleted).

---

## Feature: Data sources

Operational health of geospatial providers (admin).

### Website

- **Data sources** — `/data-sources`
- Purpose: Show provider health and background job counters.
- Who: Nav **Administrator only**. Page shows forbidden for other roles. Full only.
- Modes: **Full only**.
- Information shown:
  - Refresh (reloads both endpoints)
  - Providers: `displayName` / `sourceId`, `status` (healthy / degraded / fail), last success (stale if > 24h), details, lastError
  - Job counters: `pending`, `processing`, `completed`, `partial`, `failed`
  - Recent failures table: jobType, fieldId, attempts, failedAt, lastError
  - Empty: no providers; load failed
- Data: `GET /api/v1/admin/data-sources`, `GET /api/v1/admin/data-sources/jobs` via `geospatialService`

### Mobile

Not present as a screen. `dataSourcesNav` is Full-only and not on the mobile More menu.

---

## Feature: Settings

Profile display and device preferences.

### Website

- **Settings** — `/settings`
- Purpose: Show identity and save preferences.
- Who: All five JWT roles.
- Modes: Both (Everyday primary).
- Information / controls:
  - Profile: `email`, `userId` (read-only); button to `/partners/me`
  - Theme: `light` | `dark` | `white`
  - Date format: `MM/dd/yyyy` | `dd/MM/yyyy` | `yyyy-MM-dd`
  - Default view: `dashboard` | `fields` | `tasks` | `calendar` (schema also has `'today'` as default; it is not in this dropdown)
  - Language: `el` | `en`
  - Experience mode toggle
  - Font scale: `default` | `large` | `xl`
  - Large controls checkbox
  - Mock only: Reset demo data
  - Save preferences (`settingsService.savePreferences()` + localStorage `olive_lifecycle_preferences`)
- Stored in `UserPreferences` but **not shown** on Settings: `emailNotifications` (default true), `taskAssignmentNotifications` (true), `deadlineReminders` (true), `lifecycleAlerts` (true), `reportNotifications` (false), `experienceModeChosen`, `everydayIntelligenceOpens`, `fullPictureOnrampDismissed`.
- Server prefs also include `Language` on `UserExperiencePreferencesDto`.

### Mobile

- **Settings** — hidden tab `Settings`; opened from More.
- Information: first/last name, email; Everyday/Full; font scale; large controls; “Set up this phone”; language `en`/`el`; theme `system`/`light`/`dark`; Notifications (FieldOwner); Logout; version `1.0.0`

---

## Feature: Weather

Field-centered weather, not a standalone website route.

### Website

- Embedded **FieldWeatherCard** on Field detail when `weatherAdvice` and the field has a center.
- Information (from `weatherService.getFieldWeatherData`): current conditions, rain, wind, frost-related advice, last-updated age; Everyday can open extra details and record an intelligence open; data-source info modal (source, licence, dates).
- Field history charts: min/max °C, rain mm, ET0 mm.

### Mobile

- **WeatherWidget** on Dashboard; Today shows frost/rain advice line; field weather on Field detail. `useDashboardWeather` loads from fields.

---

## Feature: Field intelligence, satellite, and geospatial

Vegetation, terrain, soil, environment, and map layers for a field with a boundary.

### Website

- Embedded **FieldIntelligencePanel** on Field detail: Full always (if boundary); Everyday behind “More about this field.”
- Metrics:
  - Vegetation: `ndviMean`, `ndmiMean`, `ndviTrendLabel`, `ndviChangePercent`, `areaBelowBaselinePercent`, `ndreMean`, `ndwiMean`, `saviMean`
  - Terrain: average/min/max elevation m, average slope %, dominant slope class, dominant aspect
  - Ground: dominant land-cover class + %, soil pH, clay/sand texture, organic carbon %
  - Environment: Natura intersection or distance + site name; closest fire distance/direction/time
- Actions: refresh intelligence (queued); open `DataSourceInfoModal` (source, URL, attribution, licence, spatial/temporal resolution, value type, dates, confidence note)
- Map layer widgets (`satelliteLayers`, `mapLayerPanel`) are Full-only. Overlay assets include truecolor, ndvi, ndvi-change, ndmi, ndre, ndwi, savi (storage under geospatial uploads).
- Cadastre details: official vs measured area; sidebar KAEK card.

### Mobile

- Equivalent intelligence / layer sheets on Field detail when Full (`MapLayerSheet`, `MapLayerToggle`). Everyday keeps default map.

---

## Feature: Offline

Cached reads and queued writes when the device is offline.

### Website

- **OfflineBanner** in MainLayout.
- `OfflineContext` `showingCachedData` / `refreshGeneration`.
- Entity cache + `OfflineQueue` for fields, tasks, notes (temp ids). Preferences stay local if `PUT` preferences fails.

### Mobile

- **OfflineBanner** in MainLayout.
- Same cache/queue pattern in services.

---

## Feature: Demo tour (mock mode)

Guided demo steps when mock data is enabled.

### Website

- **DemoTourPanel** on Dashboard and Today when `isMockMode()` and progress not dismissed.
- Settings: Reset demo data (`demoStore.reset()`).
- Login: demo account quick-login when `showDemoLogin()`.
- Demo steps marked e.g. `producer_visit_today`, `owner_visit_calendar`.

### Mobile

- Tutorial overlays on Today (Everyday) and Dashboard (Full), stored as `everydayTutorialSeen` / `fullTutorialSeen`.

---

## Feature: More hub (mobile)

Secondary navigation and mode switch.

### Mobile

- **More** — tab `More` (`more`)
- Purpose: Reach screens not on the thumb bar and switch experience mode.
- Who: All authenticated users on main tabs.
- Information shown:
  - Title; user display name
  - Mode buttons Everyday / Full
  - Work: Partners; Costs (if FieldOwner/Producer/Agronomist/Administrator); This harvest (FieldOwner); Analytics + Reports (Full and FieldOwner/Administrator); This week (Calendar); Dashboard (FieldOwner)
  - Account: My services; Inbox (badge); Settings
- Website equivalent: sidebar sections + mobile bottom nav “More” that opens the sidebar.

---

## Feature: Activities / timeline

Recent work events on dashboards and field timeline.

### Website

- **RecentActivityFeed** on Dashboard (Full, up to 10) and Today (up to 3): `id`, `fieldId`, `type`, `message`, `actorUserId`, `taskId`, `timestamp`, `metadata`
- **FieldTimeline** on Field detail Full tab “timeline”
- Source: `MeDashboard.recent` and field activity APIs

### Mobile

- **ActivityTimeline** on Today and Dashboard (`useRecentActivities`)

Not a standalone route on either platform.

---

## Cross-cutting / shared chrome

### Website

| Chrome | Everyday | Full picture | Role notes |
| --- | --- | --- | --- |
| Header | Brand, hamburger, page title, compact mode toggle, notification bell, user name/email, logout | Same | Overflow menu on small screens repeats mode toggle + logout |
| Sidebar sections | command hidden (no Dashboard); work/operations/account as filtered | command (Dashboard), work, operations, insights (Analytics/Reports), compliance (Ministry), account | See nav table below |
| Mobile bottom nav | Primary items with `mobilePrimary`: Today, Fields, Tasks, Partners + More | Same primaries if role allows | More opens sidebar |
| Offline banner | Yes | Yes | |
| Breadcrumbs | Most inner pages | Most inner pages | |
| First-run | Redirect `/experience` | Same | |
| Full-picture onramp banner | After 2 intelligence peeks | Not shown | |

**Sidebar items by role (Full, no family restriction):**

| Path | FieldOwner | Producer | Agronomist | Administrator | ServiceProvider |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | yes | yes | yes | yes | no |
| `/today` | yes | yes | yes | yes | yes |
| `/fields` | yes | yes | yes | no | no |
| `/tasks` | yes | yes | yes | no | no |
| `/partners` | yes | yes | yes | yes | yes |
| `/money` | yes | yes | yes | yes | no |
| `/calendar` | yes | yes | yes | yes | yes |
| `/this-harvest` | yes | no | no | yes | no |
| `/analytics` | yes | no | no | yes | no |
| `/reports` | yes | no | no | yes | no |
| `/ministry` | yes | yes | yes | yes | yes |
| `/data-sources` | no | no | no | yes | no |
| `/settings` | yes | yes | yes | yes | yes |

Everyday additionally hides Dashboard, Analytics, Reports, Data sources regardless of role.

### Mobile

| Chrome | Everyday | Full picture |
| --- | --- | --- |
| AppHeader | Logo + display-name badge | Same |
| Tab bar | Today, Fields, Tasks, More | Same visible tabs; initial route Dashboard if Full + FieldOwner |
| Hidden tabs | Dashboard, Calendar, Settings | Same, opened from More |
| Task tab badge | Overdue + pending approval count | Same |
| Offline banner | Yes | Yes |
| Experience chooser | Until chosen | Until chosen |
| Tutorials | Today overlay | Dashboard overlay |

---

## Screens that exist as files but are not in navigation

| File | Platform | Fact |
| --- | --- | --- |
| `mobile/src/screens/PeopleScreen.tsx` | Mobile | Not registered; Partners stack replaced people |
| `mobile/src/screens/LifecycleScreen.tsx` | Mobile | Not registered; lifecycle is embedded on field UI |
| `mobile/src/screens/EmptyTestScreen.tsx` | Mobile | Test/empty screen, not in navigators |
| `mobile/src/components/domain/MinistryNotificationList.tsx` | Mobile | Not imported; inbox renders ministry rows inline |
| `mobile/src/components/domain/MinistryNotificationCard.tsx` | Mobile | Not imported; inbox renders ministry rows inline |

---

## Index

| Feature | Website pages | Mobile screens | Modes | Users |
| --- | --- | --- | --- | --- |
| Public landing | `/` | Not present | n/a | Unauthenticated |
| Authentication | `/login`, `/register` | Login, Register, SessionExpired | n/a (post-login uses mode) | Unauthenticated |
| Experience mode | `/experience` + header/settings toggle | ExperienceChooser, More, Settings | Sets Everyday/Full | All authenticated |
| Field invite | `/invite/:token` | InviteAccept | Both | Token holder; accept needs login |
| Family invite | `/family-invite/:token` | FamilyInviteAccept | Both | Token holder; accept needs login |
| Dashboard | `/dashboard` | Dashboard (hidden tab) | Full (web redirects Everyday) | FieldOwner, Producer, Agronomist, Administrator |
| Today | `/today` | Today | Both | All JWT roles |
| Fields | `/fields` | Fields | Both | FieldOwner, Producer, Agronomist; family module `fields` |
| Field create/edit | `/fields/new`, `/fields/:id/edit` | FieldForm | Both | Create hidden for Producer; edit `canOwn` |
| Field map boundary | (wizard step) | FieldMapBoundary | Both | Same as field form |
| Field detail | `/fields/:id` | FieldDetail | Both (content differs) | Field access + capacities |
| Field history | `/fields/:id/history` | FieldHistory | Both | Field access |
| Field task templates | `/fields/:id/task-templates` | Not a screen | Both | FieldOwner, Administrator |
| Tasks | `/tasks` | Tasks | Both (no board in Everyday) | FieldOwner, Producer, Agronomist; family `tasks` |
| Task create | `/tasks/new` | CreateTask | Both | Web wizard FieldOwner only; API also family `tasks` + `work` |
| Task detail | `/tasks/:id` | TaskDetail | Both | Task access; owner approve/assign |
| Calendar | `/calendar` | Calendar (hidden) | Web Everyday agenda; mobile Everyday agenda + month; Full week/field | All JWT roles; family `calendar` |
| Money / costs | `/money` | Money | Both (compact vs detailed) | FieldOwner, Producer, Agronomist, Administrator; family `money` |
| This harvest | `/this-harvest` | ThisHarvest | Both | FieldOwner, Administrator; family `harvest` |
| Harvest recording | Field detail panel (Full) | Field detail (Everyday compact + Full) | Web Full; mobile both | Create: harvest + work / `canOwn`; void: owner/Admin |
| Lifecycle | Field detail / cards | Embedded (LifecycleScreen unused) | Both (manage in Full) | `canOwn` to change |
| Partners / family / contacts | `/partners` | Partners | Both | All JWT roles; manage owner/admin |
| Partner search | `/partners/search` | PartnerSearch | Both | Authenticated with field |
| Partner profile | `/partners/:userId` | PartnerProfile | Both | Authenticated |
| My service profile | `/partners/me` | MyServices | Both | Authenticated |
| Service requests | `/partners/requests` | ServiceRequests | Both | Authenticated |
| Notes | `/notes` | NotesList | Both | Authenticated |
| In-app notifications | Header dropdown | Notifications | Both | Authenticated |
| Ministry | `/ministry` | Inside Notifications | Both | All JWT roles |
| Analytics | `/analytics` | Analytics | Full | FieldOwner, Administrator |
| Reports | `/reports` | Reports | Full | FieldOwner, Administrator |
| Data sources | `/data-sources` | Not present | Full | Administrator |
| Settings | `/settings` | Settings | Both | All JWT roles |
| Weather | Field/Today widgets | Dashboard/Today/Field widgets | Both (`weatherAdvice`) | Field access |
| Field intelligence / satellite | Field detail panel | Field detail | Full; Everyday peek | Field with boundary |
| Offline | Banner | Banner | Both | Authenticated |
| Demo tour | Dashboard/Today/Settings (mock) | Today/Dashboard tutorials | Both | Mock / first-run |
| More hub | Sidebar + bottom More | More | Both | Authenticated |

**Counts:** 38 features · 31 website pages (excluding redirects) · 30 mobile screens in navigation (including ExperienceChooser and SessionExpired).
