# Product Requirements

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Functional requirements for the MVP, written in plain language. Detailed acceptance criteria live in Product Backlog Items inside Azure Boards.

## Accounts and organisations

- A user can register with email and password.
- A user can log in and out.
- A user can create an organisation.
- An organisation has a name, country and base crop type.
- A user can belong to multiple organisations.
- An admin can invite other users to an organisation.
- Each member has a role: owner, producer or admin.

## Fields

- A user can create a field with name, size, optional location, and crop.
- A field belongs to exactly one organisation.
- A user can edit a field.
- A user can archive a field (not delete) to keep history.
- A field shows: current crop cycle, current lifecycle stage, recent tasks, recent activity.

## Crop cycles

- A user can start a crop cycle on a field.
- A crop cycle has a planned start date and expected end date.
- A crop cycle has lifecycle stages (e.g. olive: dormant → bud break → flowering → fruit set → harvest).
- A user can move to the next or previous stage.
- A user can close a crop cycle when the season ends.
- A field can have one active cycle at a time; previous cycles are kept as history.

## Tasks

- A user can create a task on a field, optionally tied to a cycle or stage.
- A task has: title, description, status (planned, in progress, done), assignee, due date.
- A user can update a task's status.
- Tasks are listed per field and per organisation.

## Activity / notes

- A user can log an activity on a field with a short description and timestamp.
- Activities form a timeline per field.
- A user can add a free-text note on a field, cycle or activity.

## Expenses

- A user can record an expense with amount, currency, description, against a field, cycle or task.
- A user can see total cost per field and per cycle.

## Dashboard

- Logged-in users see a dashboard listing their fields and current lifecycle stages.
- The dashboard shows open tasks for the user.
- The dashboard shows recent activity across fields.

## Permissions (MVP-level)

- Owner: full access within the organisation.
- Producer: can view fields, log activity, manage tasks; cannot manage users or pricing.
- Admin: can invite/remove members and edit organisation settings.

## Out of scope for MVP

See [Out of Scope](./Out%20of%20Scope.md).

## Open Questions

- Are lifecycle stages fixed per crop, or user-configurable?
- Should expenses support categories in MVP?

## Next Actions

- Convert each section above into Epics and PBIs in Azure Boards
- Add Given/When/Then acceptance criteria per PBI (see [Work Item Structure](../06%20Scrum%20and%20Delivery/Work%20Item%20Structure.md))
