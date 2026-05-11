# DevOps and CI/CD

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How we move code from a developer's machine to customers, in plain language.

## The flow

1. A developer writes code on their own machine.
2. They share it through Azure DevOps Repos.
3. An automatic pipeline checks the code (builds it, runs tests, looks for problems).
4. If everything is fine, the code is deployed to staging.
5. Once tested in staging, it is promoted to production where real customers use it.

## Tools we use

| Area | Tool |
|---|---|
| Code hosting | Azure DevOps Repos |
| Work tracking | Azure DevOps Boards |
| Documentation | Azure DevOps Wiki (this) |
| Automated builds | Azure Pipelines |

## What is automated today

- Building the code.
- Running basic checks.
- Deploying to staging.

## What is NOT automated yet

- Full end-to-end test coverage.
- Automatic rollback if something goes wrong in production.
- Automated database migrations beyond basic scripts.

## Branching basics

- One main branch for the current good state.
- Each piece of work happens on its own branch.
- Code is reviewed before being merged.

## Open Questions

- When do we add automatic deploy to production?
- When do we add automatic rollback?

## Next Actions

- Confirm staging environment is stable before first pilot
- Add a simple "deploy to production" button before paid customers
