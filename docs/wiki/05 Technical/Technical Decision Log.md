# Technical Decision Log

**Status:** Living document
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Important decisions on the technical side. Smaller, more frequent than the company [Decision Log](../01%20Company/Decision%20Log.md).

Use the [Decision Record Template](../11%20Templates/Decision%20Record%20Template.md) for each entry.

## Decisions

### TD-001 — Database: MongoDB

- **Date:** TBD
- **Status:** Validated
- **Context:** We need a database for the demo and MVP.
- **Decision:** Use MongoDB.
- **Consequences:** Team works with a familiar tool. We avoid premature switching costs.
- **Owner:** CTO

### TD-002 — Demo platform exists; treat it as a learning vehicle, not as the final product

- **Date:** TBD
- **Status:** Proposed
- **Context:** A working demo exists in the repo.
- **Decision:** Keep evolving the demo to support sales conversations and early pilots. Do not invest in heavy refactors until validation is complete.
- **Consequences:** Some quick decisions in the demo will need to be revisited later. That is acceptable.
- **Owner:** CTO

### TD-003 — Wiki published from `/docs/wiki` via Azure DevOps "Publish code as Wiki"

- **Date:** TBD
- **Status:** Validated
- **Context:** We want documentation that lives next to the code and is version controlled.
- **Decision:** Publish the wiki from `/docs/wiki` in this repo.
- **Consequences:** Wiki edits go through the same review process as code.
- **Owner:** CTO

### TD-004 — Defer native mobile apps until MVP web mobile is proven insufficient

- **Date:** TBD
- **Status:** Proposed
- **Context:** Native apps are expensive to build and maintain.
- **Decision:** Start with web mobile only. Build native only if pilots clearly need it.
- **Consequences:** Faster MVP. Possible later effort if native becomes required.
- **Owner:** CTO

## Open Questions

- Do we add an issue tracker beyond Azure Boards for technical debt?
- When do we lock the language stack for v1 production rebuild (if ever)?

## Next Actions

- Add new decisions as they happen
- Re-review TD-002 after Sprint 1
