# Authentication and Authorization

**Status:** Draft — high level only
**Owner:** TBD
**Last Updated:** TBD

## Purpose

Plain-language explanation of how AgroTrack handles logging in and permissions.

## Authentication — who you are

- Users sign up with an email and a password.
- Passwords are stored securely (never as plain text).
- Forgot-password flow is included.
- More advanced login methods (Google sign-in, magic links) are out of scope for MVP.

## Authorization — what you can do

AgroTrack uses three main roles inside each organisation:

| Role | Can do |
|---|---|
| **Owner** | Everything inside their organisation. Sees all fields, all activities, all costs. Manages users. |
| **Producer** | Sees fields they are assigned to or invited to. Logs activity, updates tasks. Cannot manage users or organisation settings. |
| **Admin** | Manages users, invitations and organisation settings. May or may not also be an owner. |

A future role for **Agronomist** is planned but not in MVP.

## Multi-organisation users

A single user can belong to multiple organisations (e.g. a producer who works for several owners). Their role can be different in each one.

## What is NOT in scope right now

- Single sign-on (SSO) with corporate identity providers.
- Two-factor authentication (added later).
- Granular per-field permissions (the role applies organisation-wide).

## Open Questions

- Do we need a "view only" role for family members?
- Do we expose role differences clearly enough in the UI?

## Next Actions

- Confirm three-role model with first pilot customers
- Plan 2FA for after first paid customers
