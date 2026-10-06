# Field Overview — Canonical Sources

Every number on the field overview (Σήμερα) must come from **one** server-assembled read model:

`GET /api/v1/fields/{fieldId}/overview?resultYear={year}`

UI components must **not** query oil-lots, financial-summary, or harvest lists independently to recompute these values.

| UI value | DTO field | Canonical source |
|----------|-----------|------------------|
| Συγκομιδή kg | `production.harvestOliveKg` | Posted harvest-day entries for this field and result year |
| Παραγόμενο λάδι | `production.oilProducedLitres` | Mill/oil output linked to this field’s harvests (unchanged when oil is sold) |
| Λάδι που έχεις τώρα / Στο κελάρι τώρα | `production.oilCurrentlyInCellarLitres` | Current physical oil-stock movements with this field as provenance share |
| Λάδι σε κράτηση | `production.oilHeldLitres` | Held portion of lots attributed to this field via provenance share |
| Έσοδα | `money.postedIncome` | Posted income ledger rows linked to this field |
| Έξοδα | `money.postedExpense` | Posted expense ledger rows linked to this field |
| Αποτέλεσμα | `money.result` | Posted income minus posted expense |
| Χρειάζεται τώρα | `current.primaryAttention` | Server priority from overdue proposals / lifecycle attention |
| Τελευταία καταγραφή | `current.latestRecord` | Most recent Chronologio entry for this field |
| Καιρός headline | `weather.headline` | Field weather service short headline |
| Εκτίμηση νερού | `weather.estimatedWaterNeedMm` | Weather + soil estimate (not a field measurement) |
| Πρόσφατο ιστορικό | `recentHistory` | Chronologio preview (3–4 items) |
| Φωτογραφίες | `photos` | Field media preview |
| Έκταση / ποικιλία / όριο | `field.*` | Field entity identity |
| Έτος | `cropYear.label` | Grower-facing span for `resultYear` (e.g. 2026/27) |

## Related endpoints (not for overview totals)

| Endpoint | Allowed use on field page |
|----------|---------------------------|
| `GET /fields/{id}/year/{year}/summary` | Money/reports internals; overview service may reuse it |
| `GET /oil-lots/summary?fieldId=` | My Oil screens only — not field overview cells |
| `GET /financial-summary/year/{year}?fieldId=` | Money module year view |
| `GET /fields/{id}/chronologio` | Full Ιστορικό tab |

## Empty-state rule

Do **not** show “Δεν υπάρχουν ακόμη καταχωρήσεις” for oil when either `oilProducedLitres > 0` or `oilCurrentlyInCellarLitres > 0`.
