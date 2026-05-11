# Decision Log

**Status:** Living document
**Owner:** TBD
**Last Updated:** TBD

## Purpose

A running list of important decisions and why we made them. If a decision isn't here, it didn't happen.

Use the [Decision Record Template](../11%20Templates/Decision%20Record%20Template.md) for each entry.

## How to use

- Add new decisions at the top.
- Never edit a closed decision. If it changes, add a new decision that supersedes it and link it.
- Decisions are short. Detail lives in the underlying page.

## Decisions

### D-001 — Product name and positioning

- **Date:** TBD
- **Status:** Proposed
- **Context:** The existing codebase is currently branded "Olive Lifecycle Platform". We want a broader product brand that supports expansion into other crops.
- **Decision:** Use **AgroTrack** as the company and product name. Position olive cultivation as the first vertical.
- **Consequences:** Public materials, landing page, repo READMEs and demo screens will gradually update. Existing code namespaces (e.g. `OliveLifecycle.*`) remain until a refactor sprint is justified.
- **Owner:** CEO
- **Linked pages:** [Company Overview](./Company%20Overview.md), [Brand Positioning](../08%20Marketing%20and%20Sales/Brand%20Positioning.md)

### D-002 — Focus first vertical on olives

- **Date:** TBD
- **Status:** Proposed
- **Context:** We need a focused, deep beachhead market. Olives offer a multi-year, well-defined lifecycle and an underserved owner-producer relationship.
- **Decision:** First customer segment is olive owners and producers. Other crops are out of scope for MVP.
- **Consequences:** Domain language, lifecycle stages and pilot recruitment all target olive growers.
- **Owner:** CEO
- **Linked pages:** [Target Customers](../02%20Business/Target%20Customers.md), [MVP Definition](../03%20Product/MVP%20Definition.md)

### D-003 — Wiki-first documentation

- **Date:** TBD
- **Status:** Validated
- **Context:** The team needs a single source of truth that scales as we hire.
- **Decision:** All non-code knowledge lives in `/docs/wiki`, published to Azure DevOps Wiki via "Publish code as Wiki".
- **Consequences:** PRs may include wiki updates. New team members read the wiki first.
- **Owner:** PM
- **Linked pages:** [Azure DevOps Import README](../../azure-devops-import/README.md)

## Open Questions

- Who reviews proposed decisions?
- How often do we close out "Proposed" decisions into "Validated"?

## Next Actions

- Add real dates and owners as decisions are formally accepted
- Add D-004+ as new decisions land
