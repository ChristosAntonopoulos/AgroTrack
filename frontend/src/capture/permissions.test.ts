import { getAvailableCaptureActions } from './permissions';

describe('capture money permissions', () => {
  it('lets owners record income and expense', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: true,
    });
    expect(perms.canRecordMoney).toBe(true);
    expect(perms.canRecordIncome).toBe(true);
    expect(perms.canRecordExpense).toBe(true);
  });

  it('lets collaborators record expense but not income', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
    });
    expect(perms.canRecordMoney).toBe(true);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordExpense).toBe(true);
  });

  it('hides money from viewers with no work or own rights', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: false,
    });
    expect(perms.canRecordMoney).toBe(false);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordExpense).toBe(false);
  });

  it('hides income and harvest when family modules omit money/harvest', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: true,
      canWork: true,
      familyModules: new Set(['fields', 'tasks', 'chronologio']),
    });
    expect(perms.canRecordExpense).toBe(false);
    expect(perms.canRecordObservation).toBe(true);
    expect(perms.canRecordWork).toBe(true);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordHarvest).toBe(false);
  });

  it('view accessLevel disables all create actions', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: true,
      canWork: true,
      accessLevel: 'view',
    });
    expect(perms.canRecordObservation).toBe(false);
    expect(perms.canRecordPhoto).toBe(false);
    expect(perms.canRecordWork).toBe(false);
    expect(perms.canRecordExpense).toBe(false);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordHarvest).toBe(false);
    expect(perms.canRecordMoney).toBe(false);
    expect(perms.canRecordVoice).toBe(false);
    expect(perms.canRecordDocument).toBe(false);
  });

  it('help accessLevel allows work/observation but not money or harvest create', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      accessLevel: 'help',
      familyModules: new Set(['fields', 'tasks', 'chronologio', 'documents', 'money', 'harvest']),
    });
    expect(perms.canRecordObservation).toBe(true);
    expect(perms.canRecordPhoto).toBe(false);
    expect(perms.canRecordWork).toBe(true);
    expect(perms.canRecordVoice).toBe(true);
    expect(perms.canRecordDocument).toBe(true);
    expect(perms.canRecordExpense).toBe(false);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordHarvest).toBe(false);
    expect(perms.canRecordMoney).toBe(false);
  });

  it('work accessLevel keeps existing create behavior', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      accessLevel: 'work',
      familyModules: new Set(['fields', 'tasks', 'chronologio', 'money', 'photos', 'harvest']),
    });
    expect(perms.canRecordWork).toBe(true);
    expect(perms.canRecordExpense).toBe(true);
    expect(perms.canRecordMoney).toBe(true);
    expect(perms.canRecordIncome).toBe(false);
    expect(perms.canRecordPhoto).toBe(true);
  });

  it('empty collaborator modules deny feature capture', () => {
    const perms = getAvailableCaptureActions({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      familyModules: new Set(),
    });
    expect(perms.canRecordObservation).toBe(false);
    expect(perms.canRecordWork).toBe(false);
    expect(perms.canRecordMoney).toBe(false);
    expect(perms.canRecordDocument).toBe(false);
  });
});
