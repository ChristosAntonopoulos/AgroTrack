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
});
