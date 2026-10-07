# Infrastructure

**Κατάσταση:** Πρόχειρο — μόνο υψηλού επιπέδου
**Υπεύθυνος:** TBD
**Τελευταία ενημέρωση:** TBD

## Σκοπός

Πού τρέχει το Oleachron και πώς. Έκδοση σε απλή γλώσσα.

## Πού τρέχει

- Στο cloud, σε τυπικό cloud hosting.
- Οι πελάτες δεν εγκαθιστούν τίποτα.
- Δεν τρέχουμε δικούς μας servers ή hardware.

## Περιβάλλοντα (environments)

| Περιβάλλον | Σκοπός | Ποιος το χρησιμοποιεί |
|---|---|---|
| Local | Developers που χτίζουν και δοκιμάζουν στις δικές τους μηχανές | Η ομάδα |
| Staging | Κοινόχρηστο περιβάλλον δοκιμών πριν δείξουμε σε πελάτες | Ομάδα + μερικές φορές pilots |
| Production | Το πραγματικό περιβάλλον που χρησιμοποιούν οι πελάτες | Όλοι οι πραγματικοί πελάτες |

## Backups

- Γίνονται backups της database σε τακτικό πρόγραμμα.
- Η επαναφορά από backup έχει δοκιμαστεί τουλάχιστον μία φορά πριν ζωντανέψουν τα pilots.

## Geospatial egress και storage

Το API pod καλεί εξωτερικούς παρόχους (Open-Meteo, Earth Search, SoilGrids, Terrascope, FIRMS). Τα overlay PNG ζουν στο PVC `olive-lifecycle-uploads` και σερβίρονται από το API host (`Storage__PublicBasePath`). Λεπτομέρειες: [Geospatial Data Sources](./Geospatial-Data-Sources.md).

## Monitoring (ελαφρύ, προς το παρόν)

- Ξέρουμε αν ο ιστότοπος είναι up ή down (`GET /health`).
- Ειδοποιούμαστε για κρίσιμα σφάλματα.
- Δεν έχουμε ακόμα βαριά εργαλεία monitoring / APM (π.χ. Sentry) — προστίθενται όταν το δικαιολογεί η κλίμακα πελατών.

### Admin ops overview (in-app)

Platform `Administrator` console at web `/admin` (API under `api/v1/admin/*`):

| Signal | Definition |
|---|---|
| Total users | Non-deleted accounts |
| Active 24h / 7d / 30d (DAU / WAU / MAU) | Distinct users with `LastSeenAt` in that window |
| New users | Accounts with `CreatedAt` in the window |
| Unseen feedback | `user_feedback` rows with null `SeenAt` |
| API errors (24h) | Unexpected 500s persisted to `api_error_events` (30-day TTL) |

`LastLoginAt` is stamped on successful password login; `LastSeenAt` is stamped on login and lightly refreshed from authenticated API traffic (≈15-minute throttle).

## Τι ΔΕΝ είναι στο scope προς το παρόν

- Ανάπτυξη multi-region.
- Auto-scaling για αιχμές (δεν χρειάζεται σε αυτή την κλίμακα).
- Σύνθετη disaster recovery πέρα από τακτικά backups.

## Ανοιχτά ερωτήματα

- Σε ποιον cloud provider standardize;
- Ποια downtime είναι αποδεκτή για pilots;

## Επόμενα βήματα

- Επιβεβαίωση setup hosting πριν το πρώτο pilot
- Βασικό uptime monitoring πριν go-live
