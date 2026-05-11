# Release Process

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How we get changes into customers' hands safely.

## Release approach

- **Staging first**: every change goes to staging before customers see it.
- **Frequent small releases**: rather than rare big ones.
- **Visible**: any customer-facing change is noted in a simple changelog.

## Release flow

1. Code is merged into the main branch.
2. The automatic pipeline builds and deploys to staging.
3. Manual acceptance testing on staging.
4. Once approved, the change is promoted to production.
5. A short note is added to the changelog.

## Release cadence

- During Sprint 0 and Sprint 1: as often as we can, with the team only.
- During pilots: small, frequent releases, communicated to pilots when relevant.
- During paid customer phase: predictable weekly or bi-weekly releases, plus emergency fixes.

## Communication with customers

- Major changes: short email / message before and after the release.
- Small changes: no proactive comms, but the changelog is available.
- Bugs that affect customers directly: communicate immediately and transparently.

## Rollback

- If something breaks, we revert the offending change.
- If we can't revert in code, we disable the feature flag (where applicable) or pull it from the menu.
- We always tell the customer what happened.

## Open Questions

- Do we expose the changelog publicly or only to logged-in users?
- When do we adopt feature flags as a default?

## Next Actions

- Write the first version of the customer changelog
- Confirm the staging-to-production promotion process
