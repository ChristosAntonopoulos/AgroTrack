# Infrastructure

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Where AgroTrack runs and how. Plain-language version.

## Where it runs

- In the cloud, on standard cloud hosting.
- Customers do not install anything.
- We do not run our own servers or hardware.

## Environments

| Environment | Purpose | Who uses it |
|---|---|---|
| Local | Developers building and testing on their own machines | The team |
| Staging | A shared environment used to test before showing customers | Team + sometimes pilots |
| Production | The real environment used by customers | All real customers |

## Backups

- Database backups happen on a regular schedule.
- Restoring from backup is rehearsed at least once before going live with pilots.

## Monitoring (light, for now)

- We know if the site is up or down.
- We get alerted on critical errors.
- We do not have heavy monitoring tools yet (added when customer scale justifies it).

## What is NOT in scope right now

- Multi-region deployment.
- Auto-scaling for spikes (not needed at this scale).
- Complex disaster recovery beyond regular backups.

## Open Questions

- Which cloud provider do we standardise on?
- What is acceptable downtime for pilots?

## Next Actions

- Confirm hosting setup before first pilot
- Set up basic uptime monitoring before going live
