# Account data export contract (QA-009)

Single source of truth for what **Settings → Download my data** returns, so the
Settings help text, the Privacy Policy (§7 Your rights) and the backend stay aligned.

- Endpoint: `GET /api/users/me/export` (`UsersController` → `AccountService.ExportAsync`)
- Format: one JSON file, scoped to the signed-in user
- UI copy: `settings.json` → `exportHelp`; legal copy: `legal.json` → privacy section 7 (EL/EN/IT)

## Included

| Section | Fields |
| --- | --- |
| `exportedAt` | UTC timestamp of the export |
| `profile` | id, email, first/last name, role, createdAt |
| `preferences` | experience preferences (`UserExperiencePreferencesDto`) |
| `fields` | id, name, location text, area (ha), variety, status — for groves the user **owns** (groves shared with them are not listed) |
| `notifications` | id, type, title, message, isRead, createdAt — the latest 100 only |
| `support` | support email and purpose of the contact route |

## Not included (available on request)

Tasks, notes and observations, photos and documents, harvest records, My Oil stock
and movements, money / financial transactions, contacts, field people and invites.

Users request these by emailing `support@theolivelot.com` from their account email.
Copy must say so plainly and must not imply the file contains them.

## Changing the export

1. Update `AccountExportDto` / `AccountService.ExportAsync`.
2. Update the tables above.
3. Update `settings.exportHelp` and the privacy §7 paragraph in `el`, `en` and `it`.
4. Note the change in `docs/qa/living-qa-log.md` if it closes a QA item.
