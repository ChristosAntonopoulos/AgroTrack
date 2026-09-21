# Canonical product definitions

**Status:** Locked for trust-first cycle  
**Scope:** Web product + shared backend rules

These definitions are the single contract for dates, totals, units, and roles. Screens, APIs, and demo seeders must obey them.

## Time

### Καλλιεργητική χρονιά (`ResultYear`)

- Window: **1 February Y → 31 January Y+1** (Europe/Athens).
- Code: `AgriculturalYear` / `ResultYear`.
- This is the **only** year used for totals, comparisons, Money, Chronologio year views, field year glance, and harvest quantity attribution.
- Always show the range beside the year, e.g. `Καλλιεργητική χρονιά 2026 · 1 Φεβ 2026 – 31 Ιαν 2027`.
- Default when creating money or harvest: `AgriculturalYear.For(occurredOn)`.

### Περίοδος συγκομιδής

- Window: **1 September Y → 31 August Y+1**.
- Code: `CultivationSeason`.
- Operational campaign only (This Harvest readiness / start harvest).
- Must **not** attribute kg, oil, or euros to a competing year.

### Ημερολογιακό έτος

- The real calendar date of the record.
- Always stored on the record.
- Never the default for `ResultYear`.

## Units

- Internal storage: square metres (and hectares where legacy APIs require them). `1 ha = 10 στρέμματα`.
- Greek UI: **στρέμματα** and **€/στρέμμα**.
- Olives: kg. Oil: kg and litres as separate measures with one shared rounding helper.

## Field language

- **Χωράφι** — farmer term for a parcel (nav, cards, filters).
- **Ελαιώνας** — grove as a whole / brand voice.
- **Αγροτεμάχιο** — cadastre / KAEK only.

## Field stage

One authoritative stage:

1. Phenology observation when known.
2. Else `field.currentLifecycleStage`.
3. Unknown only when both are empty.

Header chip and “Τώρα” strip must agree.

## Collaboration

A collaborator is a **permission set**, not a second owner.

Default demo collaborator: assigned work + granted fields. Money, harvest campaign, partners admin, and owner settings stay hidden unless a module is granted.
