# Privacy Policy Notes

**Κατάσταση:** v1.1 για Play submission (νομική ανασκόπηση συνιστάται· νομική επωνυμία TBD)
**Υπεύθυνος:** TBD
**Τελευταία ενημέρωση:** 2026-10-07

## Δημόσιες URLs

| Χρήση | URL |
|---|---|
| Privacy Policy (Play listing) | https://theolivelot.com/privacy/ |
| Account deletion (Play Console) | https://theolivelot.com/delete-account/ |

Static HTML:

- `frontend/public/privacy/index.html`
- `frontend/public/delete-account/index.html`

In-app: Settings → Legal → Privacy, και Settings → Account → Delete account.

Data Safety: [Play-Data-Safety-Checklist.md](./Play-Data-Safety-Checklist.md)

## Υπεύθυνος επεξεργασίας (ενδιάμεσο)

Μέχρι σύσταση εταιρείας, η πολιτική δηλώνει:

> The Olive Lot operators, trading as The Olive Lot, Greece — support@theolivelot.com

**TODO:** αντικατάσταση με ακριβή νομική επωνυμία / ΑΦΜ / διεύθυνση μόλις υπάρχει, και ευθυγράμμιση με το όνομα developer στο Play Console.

## Διαγραφή λογαριασμού (συμπεριφορά backend)

Άμεσα:

- Κλείσιμο login / ανωνυμοποίηση email-ονόματος
- Διαγραφή push tokens, in-app notifications, saved contacts
- Αφαίρεση από shared fields
- Archive owned fields

Κριτήριο οριστικής εκκαθάρισης archived grove residuals: εντός 30 ημερών από `DeletedAt`.  
Backups έως 90 ημέρες (rotation).

Κώδικας άμεσης διαγραφής: `AccountService.DeleteAsync` (`AccountDataPurgeDays` / `BackupRetentionDays`).

**TODO (follow-up):** automated purge job που hard-delete archived owned fields + media όταν `DeletedAt + 30d` — μέχρι τότε η ομάδα τηρεί το κριτήριο operationally.

## Operational activity timestamps (admin ops)

For platform reliability the API stores:

- `LastLoginAt` / `LastSeenAt` on user accounts (login + throttled authenticated activity)
- Recent unexpected API failure summaries in `api_error_events` (exception type/message/path, optional user id; 30-day retention; no request bodies / Authorization headers)

These are operational metadata for Administrator ops overview, not marketing analytics. Treat them as account/security-related processing in the privacy policy when listing data categories.

## Permissions alignment

- Contacts: system picker only (`pickDeviceContact` / `presentContactPickerAsync`) — όχι `READ_CONTACTS`, όχι bulk import sheet
- Location: when-in-use / one-shot μόνο — όχι background / Always strings

## Επόμενες ενέργειες

- Deploy frontend (privacy + delete-account static pages)
- Rebuild mobile release APK/AAB
- Επικόλληση URLs + Data safety στο Play Console
- Συμπλήρωση νομικής επωνυμίας όταν υπάρχει εταιρεία
