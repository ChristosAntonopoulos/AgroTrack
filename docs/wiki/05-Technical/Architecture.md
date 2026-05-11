# Architecture

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

The big picture of how the parts of AgroTrack fit together. No code, no schemas — just the shape of the system.

## High-level picture

```
[User on phone or laptop]
        |
        v
[Web App]  <-- the user interface
        |
        v
[Backend / API]  <-- the brain (business rules, security)
        |
        v
[Database]  <-- where data lives
```

## What each part does

- **Web App**: The screens the user sees. Built to work in any modern browser, including phones.
- **Backend / API**: Receives the user's actions, applies rules (e.g. "is this user allowed to see this field?"), and reads/writes data.
- **Database**: Stores everything — users, fields, crop cycles, tasks, activities, expenses.

## Where data flows

1. The user opens the app on their phone.
2. They log in.
3. The app asks the backend for their fields.
4. The backend checks their permissions and reads from the database.
5. The backend sends the fields back to the app.
6. The user sees their fields.

That same pattern repeats for every action — create a field, add a task, log an activity.

## Why it's simple right now

- We are validating the business. Complexity costs time and money.
- A simple architecture is enough for early pilots.
- We add complexity when a real customer need justifies it.

## What we will add when needed

- More reliable hosting setup (load balancing, backups, monitoring)
- Native mobile apps (only if mobile web isn't enough)
- Offline support (only if pilots need it)
- Integrations with other tools (later)

## Open Questions

- When does the demo platform get replaced with a "production-ready" version?
- Do we keep the same architecture or simplify further before MVP?

## Next Actions

- Confirm hosting setup for pilots
- Document any change to this picture as the system grows
