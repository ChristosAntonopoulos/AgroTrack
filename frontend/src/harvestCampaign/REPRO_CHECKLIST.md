# Harvest FE — three-user repro checklist

Run on web `/harvest` with demo accounts. Record localStorage key:
`oleachron.harvestCampaign.<userId>.<seasonStartYear>`.

## H1 — Field default

1. Ελένη: Start harvest → select **only** Φιλιατρών 088 → continue → start.
2. Open Sacks / Mill / Oil / Note.
3. **Expect:** default or locked field is 088; save CTA names 088.
4. DevTools: campaign `fieldOrder` is `["…088…"]` only.

## H2 — Shared season (hydrate)

1. Ελένη records sacks (persists to server) on field 088.
2. Logout → Γιώργος → `/harvest`.
3. **Expect:** campaign hydrates to **active** with those sacks (not idle Start), same season totals.
4. Pause/close may still be local-only until season API exists.

## H3 — Surface disagreement

1. Chronologio has harvest day; local was idle.
2. **Expect:** after load, Harvest page shows live season from records (or banner if unmapped).
3. Field year glance may still lag until it reads the same records.

## H4 — Pause ≠ complete

1. Live harvest → Totals → Παύση.
2. **Expect:** status paused; complete sheet **closed**.
3. Ολοκλήρωση opens complete sheet only after confirm intent.

## H5 — Expense permission

1. Family seat without money create → Add menu.
2. **Expect:** Expense hidden or disabled with reason — never open Money then fail.

## H7–H9 — Lifecycle / i18n

1. Complete with 0 kg → checklist warnings visible; title is readiness not “finished”.
2. Close empty day → explicit “no harvest” path.
3. Setup Continue is Greek; Chronologio link not a raw key.
