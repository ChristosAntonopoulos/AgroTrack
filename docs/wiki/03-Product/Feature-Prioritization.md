# Feature Prioritization

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

A simple framework and a current snapshot of what we build first.

## Framework: MoSCoW

| Priority | Meaning |
|---|---|
| Must have | In MVP. Without this, MVP fails. |
| Should have | Soon after MVP. Important but not blocking the first pilot. |
| Could have later | Valuable but can wait. Re-evaluate when MVP is in pilots. |
| Out of scope for MVP | We explicitly don't build this now. |

## Snapshot

| Feature | Priority | Notes |
|---|---|---|
| User registration / login | Must | Basic access |
| Roles: owner, producer, admin | Must | Reflects two-sided reality |
| Field management | Must | The base object |
| Crop cycle management | Must | What makes us different |
| Lifecycle stage tracking | Must | Visibility per field |
| Task management | Must | Plan and execute |
| Notes / activity history | Must | The record of work |
| Basic expense tracking | Must | First cost visibility |
| Basic dashboard | Must | One-screen status |
| Multi-user invitations | Should | Smooth onboarding |
| Filters and search | Should | Usability at small scale |
| Weekly reminders | Should | Nudge active use |
| Mobile polish for producers | Should | Field reality |
| Documents and photos | Could | Useful but not blocking MVP |
| Reports / exports | Could | Useful for owners |
| Calendar view | Could | Nice once data is rich |
| Agronomist role | Could | Channel play later |
| Integrations (accounting, weather) | Could | Later |
| Multi-crop expansion | Could | Year 2 |
| Satellite / sensors / IoT | Out of scope | Not now |
| Heavy accounting | Out of scope | Not our space |
| Marketplace | Out of scope | Not our model |

## How we make changes to this list

- Anyone can propose a change in a sprint review.
- Changes are decided by the PM with founder sign-off if it affects MVP scope.
- All scope changes are logged in [Decision Log](../01-Company/Decision-Log.md).

## Open Questions

- Should "Weekly reminders" be Must (engagement risk) instead of Should?
- Is mobile polish truly a Should, or a Must for pilot success?

## Next Actions

- Re-score this list after first 5 interviews
- Translate Must-haves into Epics in Azure Boards
