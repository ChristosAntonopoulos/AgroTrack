# Experience Modes (Everyday / Full picture)

**Status:** Active  
**Last updated:** 2026-09-03

## Purpose

OliveCycle serves people with very different comfort levels around software — from field owners who mainly use WhatsApp, to producers completing tasks in the grove, to agronomists who want maps and numbers. We support both with **one app, two presentation modes**, not two separate products.

## Modes

| Mode | EN name | EL name | Intent |
|---|---|---|---|
| Everyday | Everyday | Καθημερινή | “What should I do now?” — large actions, plain language, fewer numbers |
| Full picture | Full picture | Πλήρης εικόνα | Maps, satellite, soil, analytics, and denser history |

Rules:

- Modes change **what is shown**, not what is true. Alerts (frost, spray-unsafe weather, overdue work) stay visible in Everyday as plain-language actions.
- Do **not** name modes Beginner / Simple / Pro — that shames users.
- Comfort settings (text size, large controls) are **independent** of mode.
- Switching is reversible, saved per device (localStorage / AsyncStorage), and offered on first run.

## Defaults by role

| Role | Default mode |
|---|---|
| FieldOwner | Everyday |
| Producer | Everyday |
| Agronomist | Full picture |
| Administrator | Full picture |
| ServiceProvider | Everyday |

Never override a saved choice automatically. After a user opens field-intelligence peeks twice while in Everyday, show a one-time on-ramp: “Want the full picture?”

## What each mode shows

**Everyday**

- Home: Today-style work list for everyone
- Field detail: map preview, weather advice, next tasks; intelligence / cadastre / satellite layers behind “More about this field”
- Calendar: agenda only
- Tasks: list only (no board)
- Nav: Today, Fields, Tasks, Calendar, Ministry, Settings (no Analytics / Reports / Data Sources in the primary nav)

**Full picture**

- Existing control-room Field Detail, dashboard stats, month/week/field calendar, task board, analytics and reports

## Implementation notes

- Web: `ExperienceModeContext`, `settingsService` preferences, `frontend/src/experience/catalog.ts`
- Mobile: `PreferencesContext` + same catalog under `mobile/src/experience/`
- Screens stay singular — visibility is gated by `showWidget(...)` / `isEveryday`, not forked page trees

## Related

- [Design Principles](./Design-Principles.md)
- [Accessibility](./Accessibility.md)
- [User Personas](../03-Product/User-Personas.md)
