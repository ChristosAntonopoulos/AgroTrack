# Data Model

**Status:** Draft — conceptual only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

The list of things AgroTrack keeps track of, in plain language. Useful for product, design and business — not a technical schema.

## Entities (conceptual)

| Entity | What it represents | Example |
|---|---|---|
| User | A person who uses AgroTrack | Maria (owner), Yiannis (producer) |
| Organisation | A group of users sharing fields and data | "Family Olives" |
| Organisation Member | A user's role inside an organisation | Maria is "owner" in "Family Olives" |
| Field | A piece of land managed in AgroTrack | "Lower Grove", 3 hectares, olives |
| Field Owner | Link between an owner and a field (when ownership matters) | Maria owns "Lower Grove" |
| Crop | What is grown on a field | Olive |
| Crop Cycle | One season or production cycle on a field | "2026 cycle" on "Lower Grove" |
| Lifecycle Stage | A phase within a crop cycle | "Flowering" stage |
| Field Task | A specific job to do on a field | "Prune row 3 by 15 March" |
| Field Activity | A record of what happened on a field | "Irrigated 4 hours on 12 May" |
| Expense | A cost recorded against a field, cycle, or task | "€200 for pruning labor" |
| Document | A file attached to a field, cycle or activity (later) | "Receipt for fertiliser" |
| Notification | A signal sent to a user (later) | "Pruning is due tomorrow" |

## How they relate (in plain language)

- A user can belong to one or more organisations.
- Each organisation owns many fields.
- Each field has one current crop cycle and a history of past cycles.
- Each crop cycle moves through several lifecycle stages.
- Tasks, activities, and expenses are attached to fields and (optionally) to cycles or tasks.
- Documents and notifications come later.

## Why we wrote it like this

- It mirrors how customers describe their operation.
- The same words appear in the product UI, in sales conversations, and in our work items.
- We keep technical details (IDs, types, indexes) out of this page on purpose.

## Open Questions

- Do we keep "Field Owner" as a separate concept, or merge it into the field itself?
- Should "Crop" be a free-text label or a predefined list?

## Next Actions

- Confirm naming with the team — UI labels must match these entity names
- Re-check when wireframes get created
