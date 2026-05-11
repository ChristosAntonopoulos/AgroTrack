# Technical Overview

**Status:** Draft — intentionally light at this stage
**Owner:** TBD
**Last Updated:** TBD

## Purpose

A plain-language summary of what the AgroTrack platform looks like under the hood. Written so anyone on the team — not just developers — can understand it.

> **Note on depth:** This section is intentionally lightweight while we are validating the business and defining the MVP. We add detail only when we need it. The goal of the wiki right now is to support business and product decisions, not to document complex architecture.

## What AgroTrack is, technically

A simple web and mobile-web application backed by an API and a database. Customers access it through a browser on their phone or laptop. Their data lives safely in the cloud.

## The three main parts

| Part | What it does | Who uses it |
|---|---|---|
| **Web app** | The interface owners and producers use on their phone or laptop | All users |
| **Backend / API** | The brain — receives requests, applies business rules, stores data | The web app talks to it |
| **Database** | Where every field, task, activity and user lives | The backend |

## Where it runs

- In the cloud, on standard hosting.
- Customers do not install anything — they just go to the website.
- We don't run any of our own hardware.

## What it does not do (yet)

- No mobile native apps (later — for now mobile web is enough)
- No offline mode (later)
- No connections to sensors, satellites or external farm equipment
- No AI / machine learning features

## Decisions that affect the technical side

These are noted briefly here and explained in [Technical Decision Log](./Technical%20Decision%20Log.md):

- Demo platform exists and runs today.
- Data is stored in MongoDB.
- Heavy technical investments wait until validation is complete.

## Open Questions

- Do we keep the demo as-is or refactor before pilots?
- How much do we share about the technical side with customers in sales conversations?

## Next Actions

- Keep this section short and current until MVP is locked
- Add depth only when product decisions force it
