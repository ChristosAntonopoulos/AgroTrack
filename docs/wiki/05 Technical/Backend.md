# Backend

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

What the "backend" is, in plain language.

## What the backend is

The backend is the brain of AgroTrack. It is the part that:

- Receives every action the user takes in the app.
- Decides if the user is allowed to do it.
- Applies the business rules (for example, "a producer can log activity but cannot remove other users").
- Reads and writes data in the database.
- Sends results back to the app.

The user never sees the backend directly. It works behind the scenes.

## What it does for our customers

- Keeps their data safe and consistent.
- Makes sure each person only sees the fields and information they should.
- Powers every screen, every list, every save.

## What is NOT in scope right now

- Complex automation or AI logic.
- Integrations with external systems (accounting, weather, sensors).
- Heavy reporting and analytics engines.

## Open Questions

- When do we add proper logging and monitoring tooling?
- When do we move from a single backend to multiple services (if ever)?

## Next Actions

- Confirm the backend can support 3–5 pilots reliably
- Add basic health monitoring before the first paid customer
