# Work Item Structure

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How we organise work in Azure DevOps Boards. One shared structure across the team.

## Hierarchy

```
Epic
  └── Feature
        └── Product Backlog Item (PBI)
              └── Task
```

| Level | What it is | Example |
|---|---|---|
| **Epic** | A large business objective. Spans multiple sprints. Owned by the business. | "Launch MVP with first pilots" |
| **Feature** | A deliverable capability. Multiple PBIs roll up into a Feature. | "Field management" |
| **Product Backlog Item (PBI)** | A user or business outcome we can ship. Has acceptance criteria. | "An owner can create a field with name, size and crop" |
| **Task** | A specific implementation, research or design action. Hours of work, not days. | "Build the create-field form" |

## Examples for AgroTrack MVP

### Epic: Launch MVP with first pilots

Features under this Epic:

- Authentication and roles
- Field management
- Crop cycle and lifecycle
- Task management
- Activity logging
- Basic expenses
- Basic dashboard
- Multi-user organisations

### Feature: Field management

PBIs under this Feature:

- An owner can create a field.
- An owner can edit a field.
- An owner can archive a field.
- An owner can view a field's details.
- An owner can see a list of all their fields.

### PBI: An owner can create a field

Acceptance criteria (Given / When / Then):

- **Given** I am logged in as an owner,
  **When** I create a field with a name, size and crop,
  **Then** the field appears in my list of fields.

- **Given** I try to create a field without a name,
  **When** I submit the form,
  **Then** I see an error telling me the name is required.

Tasks under this PBI (illustrative):

- Design the create-field form
- Build the create-field form
- Save the field to the database
- Show the new field in the dashboard
- Write a manual test plan

## How we name things

| Type | Naming convention | Example |
|---|---|---|
| Epic | Short outcome phrase | "Launch MVP with first pilots" |
| Feature | Capability area | "Field management" |
| PBI | User-style outcome | "An owner can create a field" |
| Task | Action verb + object | "Build the create-field form" |

## Fields we keep up to date

- State (New, In Progress, Done, Removed)
- Assignee
- Sprint / Iteration
- Tags (use sparingly)
- Acceptance criteria (PBIs only)

## What we don't do

- Story points obsession. We may estimate roughly but we don't burn time tuning velocity.
- Sub-tasks beyond Task level. Keep it simple.
- Statuses beyond New / Active / Done unless we really need them.

## Open Questions

- Do we use Story Points or just T-shirt sizes (S/M/L)?
- Do we keep "Bug" as a separate work item type or fold into PBIs?

## Next Actions

- Lock the work item types we use in Azure Boards
- Seed the first Epics and Features in Sprint 0
