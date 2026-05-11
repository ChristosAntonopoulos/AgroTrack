# Security

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How we protect customer data and the platform. Written for non-technical readers.

## Principles

- Customers' data belongs to them.
- We collect only what we need.
- We protect what we hold.
- We are honest if something goes wrong.

## What we do today

- Encrypt data in transit (HTTPS for all traffic).
- Encrypt sensitive data at rest in the database.
- Store passwords securely.
- Separate each organisation's data.
- Limit who on the team can access production data.

## What we will add later

- Two-factor authentication.
- Single sign-on with major providers.
- A more formal security review before scaling beyond pilots.
- Audit logs visible to admins.

## Risks we watch

- Phishing or password theft.
- Misconfigured cloud resources.
- Code mistakes that leak data between organisations.
- Loss of access (forgotten admin credentials).

## Incident response

If something goes wrong:

1. Contain it immediately (revoke access, take it offline if needed).
2. Tell affected customers as soon as possible.
3. Fix the root cause.
4. Write up the incident and what we learned.

## What we will never do

- Sell customer data.
- Share customer data with third parties without consent.
- Hide an incident from affected customers.

## Open Questions

- Do we need a formal security review before first paid customer?
- Do we need cyber insurance?

## Next Actions

- Confirm secure hosting setup before pilot
- Draft an incident response one-pager before first paid customer
