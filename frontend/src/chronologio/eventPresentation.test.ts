import { presentChronologioEvent, presentExpenseCategory, presentActorName, presentCategory } from './eventPresentation';
import { presentPrimaryCategory } from './primaryCategories';
import type { ChronologioEntry } from '../services/chronologioService';

const entry = (overrides: Partial<ChronologioEntry>): ChronologioEntry =>
  ({
    id: 'Note:n1',
    fieldId: 'f1',
    field: { id: 'f1', name: 'Grove' },
    occurredAt: '2026-09-08T10:00:00Z',
    category: 'note',
    eventType: 'note.created',
    title: 'Observation',
    sourceType: 'Note',
    sourceId: 'n1',
    isSystemGenerated: false,
    importance: 'normal',
    media: [],
    details: { note: { noteId: 'n1', bodyPreview: 'Δάκος', pinned: false } },
    ...overrides,
  }) as ChronologioEntry;

describe('eventPresentation', () => {
  it('never returns Observation as a raw English title in Greek', () => {
    const presented = presentChronologioEvent(entry({ title: 'Observation' }), 'el');
    expect(presented.label).toBe('Παρατήρηση');
    expect(presented.shortLabel).toBe('Παρατήρηση');
    expect(presented.icon).toBe('note');
  });

  it('maps expense category codes to Greek labels', () => {
    expect(presentExpenseCategory('fuel_and_energy', 'el')).toBe('Καύσιμα και ενέργεια');
    expect(presentExpenseCategory('plant_protection', 'el')).toBe('Φυτοπροστασία');
    expect(presentExpenseCategory('fertilizers', 'el')).toBe('Λιπάσματα');
  });

  it('uses primary Greek labels instead of source enums', () => {
    expect(presentPrimaryCategory('note')).toBe('Παρατηρήσεις');
    expect(presentPrimaryCategory('expense')).toBe('Χρήματα');
    expect(presentPrimaryCategory('lifecycle')).toBe('Αλλαγές χωραφιού');
    expect(presentCategory('note')).toBe('Παρατήρηση');
    expect(presentCategory('note')).not.toBe('Observation');
    expect(presentCategory('fuel_and_energy')).not.toBe('fuel_and_energy');
  });

  it('maps demo actor names to the Greek selector spelling', () => {
    expect(presentActorName('Giorgos Papadakis', 'el')).toBe('Γιώργος Παπαδάκης');
  });

  it('uses API expense labels when they are already human', () => {
    const presented = presentChronologioEvent(
      entry({
        category: 'expense',
        title: 'Έξοδο 40 €',
        details: {
          expense: {
            expenseId: 'e1',
            expenseCategory: 'fuel_and_energy',
            expenseCategoryLabel: 'Καύσιμα και ενέργεια',
          },
        },
      }),
      'el'
    );
    expect(presented.description).toBe('Καύσιμα και ενέργεια');
    expect(presented.label).not.toMatch(/fuel_and_energy/);
  });
});
