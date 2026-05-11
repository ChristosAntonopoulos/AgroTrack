# API Design

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

What the "API" is, in plain language.

## What the API is

The API is the way the web app talks to the backend. Every time the user clicks "Save field" or "Log activity", the app sends a small message to the backend through the API.

The user never sees this directly — it just happens.

## Principles

- Simple and consistent. Doing similar things should look similar.
- Built around the same words customers use: fields, crop cycles, tasks, activities.
- Secured. Every request is checked to make sure the user is who they say they are and is allowed to do what they're trying to do.

## What is NOT in scope right now

- Public API for third parties.
- Webhooks or external integrations.
- Versioning beyond a single current version.

## Open Questions

- Do we publish a public API once we have customers? Many farm tools never do.
- Do we expose a read-only API to agronomists in year 2?

## Next Actions

- Keep this page light until we have external integrations
- Document the small set of endpoints used by the web app inside the codebase
