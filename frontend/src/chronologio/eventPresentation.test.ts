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
  it('uses the observation body as the card title, not a raw English system word', () => {
    const presented = presentChronologioEvent(entry({ title: 'Observation' }), 'el');
    expect(presented.label).toBe('Δάκος');
    expect(presented.shortLabel).toBe('Παρατήρηση');
    expect(presented.icon).toBe('note');
  });

  it('uses one preview line for an untitled observation and keeps the full text off the card', () => {
    const long = 'Περισσότερα τσιμπήματα δάκου στα δέντρα δίπλα στο μονοπάτι. Και δεύτερη πρόταση που δεν πρέπει να φανεί στην κάρτα.';
    const presented = presentChronologioEvent(
      entry({
        title: 'Observation',
        details: { note: { noteId: 'n1', bodyPreview: long, pinned: false } },
      }),
      'el'
    );
    expect(presented.label).toBe('Περισσότερα τσιμπήματα δάκου στα δέντρα δίπλα στο μονοπάτι');
    expect(presented.description).toBeUndefined();
  });

  it('shows a real title once and a single body preview that does not repeat it', () => {
    const presented = presentChronologioEvent(
      entry({
        title: 'Δάκος στο μονοπάτι',
        summary: 'Είδα περισσότερα τσιμπήματα στα δέντρα δίπλα στο μονοπάτι.',
        details: {
          note: {
            noteId: 'n1',
            bodyPreview: 'Είδα περισσότερα τσιμπήματα στα δέντρα δίπλα στο μονοπάτι.',
            pinned: false,
          },
        },
      }),
      'el'
    );
    expect(presented.label).toBe('Δάκος στο μονοπάτι');
    expect(presented.description).toBe('Είδα περισσότερα τσιμπήματα στα δέντρα δίπλα στο μονοπάτι');
    expect(presented.description).not.toBe(presented.label);
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

  it('labels merged harvest days as Harvest without duplicating sack summary', () => {
    const presented = presentChronologioEvent(
      entry({
        id: 'Harvest:day:2025-11-12',
        category: 'harvest',
        sourceType: 'Harvest',
        sourceId: 'day',
        occurredAt: '2025-11-12T14:00:00.000Z',
        title: 'Harvest',
        summary: '120 kg official weight · 4 people',
        details: {
          harvest: {
            harvestId: 'day',
            oliveKg: 120,
            workers: 4,
            sackCount: 8,
            hasOfficialWeight: true,
          },
        },
      }),
      'en'
    );
    expect(presented.shortLabel).toBe('Harvest');
    expect(presented.label).toBe('Harvest');
    expect(presented.description).toBeUndefined();
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
    expect(presented.label).toBe('Καύσιμα και ενέργεια');
    expect(presented.label).not.toMatch(/fuel_and_energy/);
  });
});
