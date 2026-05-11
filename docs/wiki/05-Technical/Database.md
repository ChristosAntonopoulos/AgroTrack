# Database

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

What the database is, in plain language.

## What the database is

The database is where AgroTrack stores all customer information — fields, crop cycles, tasks, activities, expenses, users and so on. Whenever a user does something in the app (creates a field, logs an activity, adds an expense), the data goes here.

## What we use

**MongoDB.**

That is all the detail this page needs at this stage. MongoDB is a well-known database used by thousands of products. We picked it because the team is comfortable with it and it fits how our data looks.

## What is important for our customers

- Their data is stored safely.
- Their data is backed up regularly.
- One customer's data is never mixed with another's.
- They can export their data if they want it.

## What is NOT in scope right now

- Complex data analytics (later).
- Multiple databases per customer.
- Heavy custom reporting infrastructure.

## Open Questions

- What is our backup frequency and retention policy?
- Do we keep audit logs of every change in MVP?

## Next Actions

- Confirm backup setup before the first pilot goes live
- Document a customer data export process (manual is fine for now)
