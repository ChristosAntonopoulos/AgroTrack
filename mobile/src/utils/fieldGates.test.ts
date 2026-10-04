import { capabilitiesForAccess } from '../services/fieldPeopleService';
import {
  capturePermissionsFromCapabilities,
  harvestSeatFromFields,
  resolveFieldGates,
} from './fieldGates';

const partnerWork = capabilitiesForAccess(
  'Partner',
  ['chronologio', 'tasks', 'photos', 'money', 'harvest'],
  'work'
);

const familyView = capabilitiesForAccess('Family', ['chronologio', 'harvest'], 'view');

describe('resolveFieldGates', () => {
  it('trusts API capabilities over a global FieldOwner role', () => {
    const gates = resolveFieldGates({
      field: { ownerId: 'owner', capabilities: partnerWork, memberships: [] },
      userId: 'family-user',
      userRole: 'FieldOwner',
    });

    expect(gates.canOwn).toBe(false);
    expect(gates.canDelete).toBe(false);
    expect(gates.canManageAccess).toBe(false);
    expect(gates.canViewMoney).toBe(true);
    expect(gates.canCapture).toBe(true);
    expect(gates.canViewSensitiveIdentity).toBe(false);
  });

  it('lets the field admin edit and hides money from a view seat', () => {
    const admin = capabilitiesForAccess('Admin', ['money'], 'work');
    expect(
      resolveFieldGates({
        field: { ownerId: 'owner', capabilities: admin },
        userId: 'someone-else',
        userRole: 'Producer',
      }).canOwn
    ).toBe(true);

    const view = resolveFieldGates({
      field: { ownerId: 'owner', capabilities: familyView },
      userId: 'family-user',
      userRole: 'FieldOwner',
    });
    expect(view.canCapture).toBe(false);
    expect(view.canViewMoney).toBe(false);
    expect(view.canViewHarvest).toBe(true);
  });

  it('falls back to owner id only when capabilities are missing', () => {
    const gates = resolveFieldGates({
      field: { ownerId: 'owner-1' },
      userId: 'owner-1',
      userRole: 'Producer',
    });
    expect(gates.canOwn).toBe(true);
    expect(gates.canViewSensitiveIdentity).toBe(true);

    const stranger = resolveFieldGates({
      field: {
        ownerId: 'owner-1',
        memberships: [
          {
            userId: 'family-user',
            role: 'Family',
            modules: ['chronologio'],
            accessLevel: 'view',
            status: 'active',
            capacities: ['view'],
          },
        ],
      },
      userId: 'family-user',
      userRole: 'FieldOwner',
    });
    expect(stranger.canOwn).toBe(false);
  });
});

describe('capturePermissionsFromCapabilities', () => {
  it('lets a work partner record expenses but not income or harvest', () => {
    const perms = capturePermissionsFromCapabilities(partnerWork);
    expect(perms.canRecordExpense).toBe(true);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordHarvest).toBe(false);
    expect(perms.canRecordPhoto).toBe(true);
  });

  it('blocks every capture for a view seat', () => {
    const perms = capturePermissionsFromCapabilities(familyView);
    expect(perms.canRecordObservation).toBe(false);
    expect(perms.canRecordHarvest).toBe(false);
    expect(perms.canRecordMoney).toBe(false);
  });
});

describe('harvestSeatFromFields', () => {
  it('does not treat a family FieldOwner role as the campaign owner', () => {
    const seat = harvestSeatFromFields([
      { id: 'field-1', capabilities: familyView },
    ]);
    expect(seat?.canOwn).toBe(false);
    expect(seat?.accessLevel).toBe('view');
    expect(seat?.harvestModuleGranted).toBe(true);
  });
});
