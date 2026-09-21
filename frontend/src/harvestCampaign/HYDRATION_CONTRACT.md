# Harvest FE — shared season hydration contract

## Problem

Live UI reads `localStorage` key `oleachron.harvestCampaign.${userId}.${seasonStartYear}` via `HarvestCampaignContext`. Individual creates may POST harvest records (`persist.ts`), but the **campaign** (status, fieldOrder, closedDays, in-progress edits) is private to the browser user. That breaks owner ↔ family collaboration and explains Chronologio vs Harvest page disagreement.

## Target identity

```
HarvestSeasonId = ownerWorkspaceId + seasonStartYear
```

Not `creatorUserId`. Contributors append entries with `recordedBy` / `recordedAt`.

## FE load algorithm (when API exists)

1. Resolve accessible field IDs for current user.
2. `GET` harvest season for those fields / owner workspace + season year.
3. Map server entries → `HarvestCampaign` shape (`sacks`, `millWeights`, `oils`, `peopleLogs`, `expenses`, `notes`, `closedDays`, `status`).
4. localStorage becomes **cache / offline draft** only; conflict policy: server wins on status; merge by entry id.

## FE until API is ready

Implemented now:

- **Best-effort hydrate:** `hydrateFromRecords.ts` lists harvest-records for all accessible fields, filters by season, maps into `HarvestCampaign`, and merges into localStorage (`mergeCampaignWithHydrated`). Idle local + server production → **active**, so owner/family both see the season when records exist on the server.
- Detect idle local campaign while URL/deep-link or known server harvest activity warrants a trust banner (`serverActivityHint` on the Harvest page) when hydrate cannot activate.
- Deep-link `HarvestRecordSheet` continues to show server records without implying a private live season.
- Do not claim full multi-device “shared season document” until season GET lands — pause/close status may still diverge per browser until then.

## API gaps to close

| Need | Purpose |
|------|---------|
| Season document (status, fieldOrder, closedDays, startedAt) | Shared live header |
| List entries by season + field | Hydrate campaign |
| `recordedBy` / `editedBy` on entries | Audit + edit rights |
| Authorize contributors (family/worker) | Capability matrix |
| Idempotent create/update/delete | Multi-device |
| Chronologio day events tied to season id | One Chronologio event per day close |

## Field year / Chronologio alignment

- Field year rollup and Chronologio must aggregate the same harvest records the season hydrates from.
- Completing a season must mark season closed server-side so review pages and Field Overview agree.
