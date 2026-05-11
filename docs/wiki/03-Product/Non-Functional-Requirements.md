# Non Functional Requirements

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Quality attributes the product should have, in plain language. Not "what" it does, but "how well" it does it.

## Usability

- A new user can add their first field within 5 minutes of signing up.
- A producer can log an activity in under 30 seconds on a phone.
- Buttons and labels are written for non-technical users (no jargon).

## Mobile

- The web app works well on a recent smartphone browser (Android and iOS).
- Forms are large, simple and one-handed friendly.
- Native apps are out of scope for MVP.

## Performance

- Common pages load fast enough to feel instant on a modern phone with mobile data.
- The system handles small teams (up to 20 users per organisation) without slowdown.

## Reliability

- The platform is available during typical working hours for our target geographies.
- Data is not lost — every write is durable.
- Recovery from a server restart is automatic.

## Security and privacy

- Passwords are stored securely.
- Each organisation's data is isolated from others.
- GDPR principles apply (see [GDPR](../09-Legal-and-Compliance/GDPR.md)).
- We do not share or sell customer data.

## Data ownership

- Customer data belongs to the customer. They can export it on request.
- Detailed policy in [Data Ownership](../09-Legal-and-Compliance/Data-Ownership.md).

## Accessibility

- Reasonable color contrast and font sizes.
- Keyboard navigation works for primary flows.
- Full accessibility review comes later (see [Accessibility](../07-Design-and-UX/Accessibility.md)).

## Internationalisation

- MVP language: English first.
- Plan for Greek and Italian translations after MVP.
- All user-facing text designed to be translatable.

## Observability (light, for MVP)

- We know if the app is up or down.
- We know if a user gets a critical error.
- We capture basic usage signals to inform product decisions (respecting privacy).

## Open Questions

- Do we support offline-first in MVP or push to later?
- What is the realistic load to plan for at pilot scale?

## Next Actions

- Confirm uptime expectation with pilots
- Decide MVP language(s) for first pilots
