# Work Item Structure

**Κατάσταση:** Πρόχειρο
**Υπεύθυνος:** TBD
**Τελευταία ενημέρωση:** TBD

## Σκοπός

Πώς οργανώνουμε τη δουλειά στο Azure Boards. Μία κοινή δομή σε όλη την ομάδα.

## Ιεραρχία

```
Epic
  └── Feature
        └── Product Backlog Item (PBI)
              └── Task
```

| Επίπεδο | Τι είναι | Παράδειγμα |
|---|---|---|
| **Epic** | Μεγάλος επιχειρηματικός στόχος. Διασχίζει πολλά Sprint. Ιδιοκτησία από την επιχείρηση. | «Launch MVP with first pilots» |
| **Feature** | Παραδοτέα δυνατότητα. Πολλά PBI συνοψίζονται σε Feature. | «Field management» |
| **Product Backlog Item (PBI)** | Αποτέλεσμα χρήστη ή επιχείρησης που μπορούμε να παραδώσουμε. Έχει acceptance criteria. | «An owner can create a field with name, size and crop» |
| **Task** | Συγκεκριμένη υλοποίηση, έρευνα ή σχεδιαστική ενέργεια. Ώρες δουλειάς, όχι ημέρες. | «Build the create-field form» |

## Παραδείγματα για Oleachron MVP

### Epic: Launch MVP with first pilots

Features κάτω από αυτό το Epic:

- Authentication and roles
- Field management
- Crop cycle and lifecycle
- Task management
- Activity logging
- Basic expenses
- Basic dashboard
- Multi-user organisations

### Feature: Field management

PBI κάτω από αυτό το Feature:

- An owner can create a field.
- An owner can edit a field.
- An owner can archive a field.
- An owner can view a field's details.
- An owner can see a list of all their fields.

### PBI: An owner can create a field

Acceptance criteria (Given / When / Then):

- **Given** I am logged in as an owner,
  **When** I create a field with a name, size and crop,
  **Then** the field appears in my list of fields.

- **Given** I try to create a field without a name,
  **When** I submit the form,
  **Then** I see an error telling me the name is required.

Tasks κάτω από αυτό το PBI (ενδεικτικά):

- Design the create-field form
- Build the create-field form
- Save the field to the database
- Show the new field in the dashboard
- Write a manual test plan

## Πώς ονομάζουμε πράγματα

| Τύπος | Σύμβαση ονοματοδοσίας | Παράδειγμα |
|---|---|---|
| Epic | Σύντομη φράση αποτελέσματος | «Launch MVP with first pilots» |
| Feature | Περιοχή δυνατότητας | «Field management» |
| PBI | Αποτέλεσμα σε στυλ χρήστη | «An owner can create a field» |
| Task | Ρήμα ενέργειας + αντικείμενο | «Build the create-field form» |

## Πεδία που κρατάμε ενημερωμένα

- State (New, In Progress, Done, Removed)
- Assignee
- Sprint / Iteration
- Tags (με φειδώ)
- Acceptance criteria (μόνο PBI)

## Τι δεν κάνουμε

- Εμμονή με story points. Μπορούμε να εκτιμήσουμε κατά προσέγγιση αλλά δεν καίμε χρόνο ρυθμίζοντας velocity.
- Υπο-εργασίες πέρα από επίπεδο Task. Κρατάμε απλά.
- Καταστάσεις πέρα από New / Active / Done εκτός αν πραγματικά τις χρειαζόμαστε.

## Ανοιχτά ερωτήματα

- Χρησιμοποιούμε Story Points ή μόνο μεγέθη μπλουζάκι (S/M/L);
- Κρατάμε το «Bug» ως ξεχωριστό τύπο work item ή το ενσωματώνουμε σε PBI;

## Επόμενα βήματα

- Κλειδώστε τους τύπους work item που χρησιμοποιούμε στο Azure Boards
- Σπείρατε τα πρώτα Epic και Features στο Sprint 0
