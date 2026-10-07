# Google Play Data Safety checklist (The Olive Lot)

**Last updated:** 2026-10-07  
**Privacy policy URL:** https://theolivelot.com/privacy/  
**Account deletion URL:** https://theolivelot.com/delete-account/

Fill Play Console → App content → Data safety so answers match this table and the public Privacy Policy.

## Account deletion (required)

| Field | Value |
|---|---|
| In-app | Settings → Account → Delete account |
| Web / Play URL | https://theolivelot.com/delete-account/ |
| Also accepts | Email to support@theolivelot.com from the account address |

## Data types to declare (collected)

| Data type | Collected? | Shared? | Purpose | Notes |
|---|---|---|---|---|
| Name | Yes | No (except collaborators on shared fields) | App functionality | Account profile |
| Email | Yes | No (except transactional email infra) | App functionality, account management | |
| User IDs | Yes | No | App functionality | |
| Photos | Yes | With field collaborators | App functionality | Upload only after user confirms |
| Approximate / precise location | Yes (optional) | Field coords may go to weather/geospatial providers | App functionality | Foreground / one-shot only; not background |
| Contacts | Yes (optional, single pick) | No | App functionality | System picker only — no READ_CONTACTS / full book |
| Device or other IDs (push token) | Yes if notifications on | Expo push | App functionality | Deleted on account deletion |
| App interactions / crash logs | Minimal server logs | No ads/analytics SDKs | Security / fraud prevention | Serilog → console; no Sentry/Firebase Analytics |

## Not collected / not used

- Advertising ID / ads
- Third-party advertising or behavioural tracking SDKs
- Background location
- Payment card numbers in-app
- Broad address-book access

## Third parties that can receive data (product features)

- Our hosting / API / MongoDB deployment / upload storage
- SMTP transactional email
- Expo push (and Android push channel)
- Open-Meteo, Earth Search / satellite sources, SoilGrids, Terrascope, NASA FIRMS (server-side)
- Map tiles / Nominatim (device-side when user uses maps/search)

## Security practices (declare if true in Console)

- Data encrypted in transit (HTTPS)
- Users can request deletion
- Users can request export (Settings / support)

## After deploy

1. Confirm https://theolivelot.com/privacy/ and /delete-account/ serve static HTML (view-source shows policy text).
2. Paste both URLs in Play Console.
3. Submit Data safety form matching this checklist.
4. Rebuild the Android app so READ_CONTACTS and Always-location strings are gone from the release binary.
