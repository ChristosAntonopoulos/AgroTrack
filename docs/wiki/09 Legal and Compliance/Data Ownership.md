# Data Ownership

**Status:** Draft — important to clarify early
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Who owns the data inside AgroTrack — owners, producers, organisations, us. Critical for trust.

## Our principles

1. **The customer's data belongs to the customer.** We store it for them; we don't claim it.
2. **The organisation, not the individual, owns its operational data.** If a producer leaves an organisation, the field history stays.
3. **We never sell customer data.**
4. **We never train external AI models on customer data without explicit consent.**
5. **Customers can export their data at any time, in a usable format.**

## Tricky cases

### A producer works for multiple owners

- Each owner's data stays with that owner's organisation.
- The producer can be a member of multiple organisations.
- Removing the producer from one organisation does not affect the others.

### An owner sells a field

- The new owner can be invited to the organisation, or the field can be transferred to a new organisation.
- History travels with the field if the buyer wants it; otherwise it is archived in the original organisation.

### An organisation closes

- All members are notified.
- A 30-day window allows export of all data.
- After that, data is deleted in line with our retention policy (subject to legal exceptions).

### Disputes between owner and producer

- We do not adjudicate.
- Both parties have agreed (through their roles) on data sharing within the organisation.
- We provide the data; we do not decide who is right.

## What we make easy

- Full export (per organisation) in a common format (CSV / JSON).
- Bulk archive of fields.
- Clear ownership labels in the UI.

## Open Questions

- Do we allow read-only "guests" that don't share organisation ownership?
- How do we handle data when a country requires data residency?

## Next Actions

- Codify the data ownership statement in the Terms of Service
- Add a "Download all my data" feature for organisations before scaling beyond pilots
