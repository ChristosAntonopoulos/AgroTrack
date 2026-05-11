# MVP Definition

**Status:** Draft — to be locked at next team review
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Define exactly what the MVP includes and excludes. This is the single most important page in the Product section.

## MVP goal

Ship the smallest version of AgroTrack that a small olive owner and their producer can use weekly to plan, run and review work on at least one field.

If, after using it for 4 weeks, they say "I don't want to go back to my old way of working" — the MVP succeeded.

## Must have (in MVP)

| Feature | Why |
|---|---|
| User registration and login | Basic access |
| Roles: owner, producer, admin | Reflects real-world reality and access boundaries |
| Field management | The fundamental object |
| Crop cycle management | The lifecycle is what makes us different |
| Lifecycle stage tracking | Visibility of where each field is right now |
| Task management | Plan and execute the work |
| Notes / activity history | The record of what actually happened |
| Basic expense tracking | First step toward cost visibility |
| Basic dashboard | One screen to see status across fields |

## Should have (close after MVP)

- Multiple users per organisation with proper invitations
- Filters and search across fields, tasks and activity
- Simple weekly reminders / notifications
- Mobile experience polished for producers in the field

## Could have later (not now)

- Documents and photo upload tied to fields and activity
- Reports and exports (PDF / CSV)
- Agronomist as a first-class user role
- Detailed cost reporting per cycle / per hectare
- Calendar view and seasonal planning
- Integrations (accounting, weather)
- Multi-crop support beyond olive

## Out of scope for MVP

- Satellite imagery, sensors, IoT
- Native iOS / Android apps (basic mobile web is enough)
- Offline-first sync (the demo can be online-only)
- Marketplace, trading, supply chain
- Heavy financial accounting
- AI recommendations

## Acceptance criteria for "MVP complete"

- [ ] An owner can sign up, create an organisation, add a field, start a crop cycle, and see lifecycle stages.
- [ ] A producer can be invited to that organisation and access the same field.
- [ ] A task can be created, assigned, and completed by either role.
- [ ] An activity (e.g. "irrigated 4 hours") can be logged from a phone in under 30 seconds.
- [ ] An expense can be recorded against a field or cycle.
- [ ] The dashboard shows fields, current stages and open tasks at a glance.
- [ ] At least 3 pilot customers use the platform weekly for 4 weeks.

## Open Questions

- Do we include simple notifications in MVP or push to "Should have"?
- How polished must the mobile experience be for MVP?

## Next Actions

- Lock the must-have list at the next team review
- Translate must-haves into Epics in Azure Boards (see [Work Item Structure](../06%20Scrum%20and%20Delivery/Work%20Item%20Structure.md))
