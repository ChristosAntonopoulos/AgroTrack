import { Field } from '../services/fieldService';
import {
  evaluateStepCompletion,
  ownerHasAnyBoundary,
  ownerHasEstablishedFarm,
  shouldRunOwnerActivation,
} from './evaluate';

const ownerId = 'owner-1';

const namedActive = (overrides: Partial<Field> = {}): Field => ({
  id: 'f1',
  ownerId,
  name: 'Επάνω ελαιώνας',
  status: 'Active',
  area: 3200,
  latitude: 37.19,
  longitude: 21.59,
  currentLifecycleYear: 'high',
  irrigationStatus: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const ring = [
  [21.1, 37.1],
  [21.2, 37.1],
  [21.2, 37.2],
  [21.1, 37.2],
  [21.1, 37.1],
];

describe('owner activation evaluate', () => {
  it('unlocks established Active farms with place + size even without polygon', () => {
    const fields = [namedActive({ boundary: undefined })];
    expect(ownerHasEstablishedFarm(fields, ownerId)).toBe(true);
    expect(ownerHasAnyBoundary(fields, ownerId)).toBe(false);
    expect(shouldRunOwnerActivation('FieldOwner', fields, ownerId, true)).toBe(false);
  });

  it('keeps first-run for a named draft without place', () => {
    const fields = [
      namedActive({
        status: 'Draft',
        area: 0,
        latitude: undefined,
        longitude: undefined,
        boundary: undefined,
      }),
    ];
    expect(ownerHasEstablishedFarm(fields, ownerId)).toBe(false);
    expect(shouldRunOwnerActivation('FieldOwner', fields, ownerId, true)).toBe(true);
  });

  it('marks drawBoundary complete when any owned grove has όρια', () => {
    const withBoundary = namedActive({
      id: 'f-bound',
      boundary: { type: 'Polygon', coordinates: [ring] },
    });
    const needsBoundary = namedActive({
      id: 'f-open',
      name: 'Νέος',
      status: 'Draft',
      area: 0,
      latitude: undefined,
      longitude: undefined,
      boundary: undefined,
    });
    const completion = evaluateStepCompletion([withBoundary, needsBoundary], needsBoundary, 'idle', {
      userId: ownerId,
    });
    expect(completion.createGrove).toBe(true);
    expect(completion.drawBoundary).toBe(true);
  });
});
