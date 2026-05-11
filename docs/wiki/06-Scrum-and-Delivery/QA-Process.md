# QA Process

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How we keep quality acceptable at our current size — without slowing the team down.

## Principles

- Everyone owns quality, not just one QA person.
- We test before we call something Done.
- Bugs found in pilots are gold — they tell us what real users do.
- We catch what we can; we don't promise zero defects.

## Levels of testing (current phase)

| Level | What | When | Who |
|---|---|---|---|
| Developer self-test | Check the change works on the developer's machine | Before code review | Author |
| Code review | Another set of eyes on logic | Before merging | Another developer |
| Manual acceptance test | Run through the acceptance criteria on staging | Before marking PBI Done | PBI assignee + PM |
| Cross-browser / cross-device check | Quick check on a phone and a laptop | Before pilot exposure | Anyone available |
| Pilot feedback | Real users in real conditions | Continuous | Pilots + team |

## What we add as we grow

- Automated unit tests for tricky logic.
- Basic end-to-end tests for the main flows.
- A dedicated QA pass before each pilot release.

## Bug lifecycle

1. Bug reported (internal or from a pilot).
2. Triage: confirm, reproduce, classify (critical / high / medium / low).
3. Critical bugs: fix immediately outside the sprint.
4. Others: add to the backlog with severity, schedule like any work.
5. Closed after verification on staging or production.

## Triage rules

- **Critical:** Data loss, security issue, app unusable for many users. Drop everything.
- **High:** Important flow broken. Fix in current sprint if possible.
- **Medium:** Annoying but workaround exists. Next sprint.
- **Low:** Cosmetic, edge cases. Backlog, may stay there.

## Open Questions

- When do we hire / assign a dedicated QA role?
- Do we use a separate bug tracker or stay inside Azure Boards?

## Next Actions

- Run the first manual acceptance test pass in Sprint 1
- Add automated tests for the auth flow before pilot launch
