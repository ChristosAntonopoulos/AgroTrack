# Frontend

**Κατάσταση:** Πρόχειρο — μόνο υψηλού επιπέδου
**Υπεύθυνος:** TBD
**Τελευταία ενημέρωση:** TBD

## Σκοπός

Τι είναι το «frontend», σε απλή γλώσσα.

## Τι είναι το frontend

Το frontend είναι το μέρος του Oleachron που ο χρήστης βλέπει και πατά. Τρέχει σε web browser — σε κινητό, tablet ή laptop. Ο χρήστης δεν εγκαθιστά τίποτα· απλώς ανοίγει ιστότοπο.

## Τι κάνει

- Εμφανίζει τις οθόνες (login, dashboard, πεδία, εργασίες κ.λπ.).
- Καταγράφει ό,τι πληκτρολογεί και πατά ο χρήστης.
- Μιλάει στο backend για ανάκτηση και αποθήκευση δεδομένων.

## Τι έχει σημασία για τους πελάτες μας

- Δουλεύει καλά σε κινητά.
- Φορτώνει γρήγορα σε mobile data.
- Εύκολο στη χρήση χωρίς εκπαίδευση.
- Μεταφράσιμο σε άλλες γλώσσες αργότερα.

## Τι ΔΕΝ είναι στο scope προς το παρόν

- Native εφαρμογή iOS ή Android.
- Ξεχωριστή έκδοση «μόνο για κινητό».
- Βαριά γραφικά, animations ή σύνθετες αλληλεπιδράσεις.

## Ανοιχτά ερωτήματα

- Χρειαζόμαστε native app για τον ρόλο παραγωγού ώστε η χρήση στο πεδίο να μένει γρήγορη;
- Πότε προσθέτουμε γλώσσες πέρα από τα Αγγλικά;

## Internationalization (i18n)

The React web app uses **i18next** and **react-i18next**. User-facing strings live in JSON files under `frontend/src/locales/{en,el,it}/`, organized by namespace (`common`, `nav`, `auth`, `settings`, `tasks`, `fields`, etc.).

### Adding or changing a string

1. Add a stable key in the English file, e.g. `frontend/src/locales/en/tasks.json` under the right namespace.
2. Mirror the key in `el/` and `it/` (English fallback applies until translated).
3. In components: `const { t } = useTranslation('tasks');` then `t('detail.field')` or `t('tasks:detail.field')` with multiple namespaces.
4. For links inside translated text, use `<Trans i18nKey="dashboard:fieldsSection.emptyOwner" components={{ 1: <Link to="..." /> }} />`.

### Pluralization example

```json
"items": "{{count}} item",
"items_other": "{{count}} items"
```

```tsx
t('items', { count: n })
```

### Dates and numbers

Use `useLocaleFormatters()` from `frontend/src/hooks/useLocaleFormatters.ts` instead of raw `toLocaleDateString()`. It respects the active locale and the user’s date format preference from Settings.

### Language selection

`LocaleProvider` syncs i18n, `document.documentElement.lang`, and `settingsService` (`language`: `en` | `el` | `it`). API error messages are mapped in `frontend/src/utils/translateApiError.ts`.

### Optional extraction

Run `npm run i18n:extract` in `frontend/` to scan `t()` calls (requires `i18next-parser`).

## Επόμενα βήματα

- Επιβεβαίωση ότι το mobile UX αρκεί για παραγωγούς στα pilots
- Ρύθμιση υποδομής μετάφρασης όταν έχουμε pilot μη αγγλόφωνο
