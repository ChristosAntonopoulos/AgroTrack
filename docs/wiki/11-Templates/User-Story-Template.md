# User Story Template

**Status:** Template
**Owner:** TBD
**Last Updated:** TBD

## How to use

Use this for every PBI in Azure Boards. Keep stories user-focused.

---

## Story format

> **As a** [persona],
> **I want** [outcome],
> **so that** [reason / value].

### Example

> As an **owner**,
> I want to **see all my fields and their current lifecycle stage**,
> so that I **know at a glance what's happening across my farm**.

### Acceptance criteria (Given / When / Then)

- **Given** [context],
  **When** [action],
  **Then** [observable outcome].

### Example acceptance criteria

- **Given** I am logged in as an owner with at least one field,
  **When** I open the dashboard,
  **Then** I see each of my fields and the lifecycle stage of its current crop cycle.

- **Given** I have a field with no active crop cycle,
  **When** I open the dashboard,
  **Then** the field is shown with "No active cycle" instead of a stage.

### Notes

- Keep the story to one sentence in each part.
- Keep acceptance criteria to 1–5 entries — more usually means the story is too big.
- One PBI should usually fit inside one sprint.
- If you can't write Given/When/Then for it, it's probably not Ready.

### Anti-patterns to avoid

- "As a user, I want a feature, so that it works." — Too vague.
- "As a developer, I want to refactor X." — Use a technical task, not a user story.
- Stories without acceptance criteria.
