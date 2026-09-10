const LAST_FIELD_KEY = 'Oleachron.money.lastFieldId';

export function readLastMoneyFieldId(): string | undefined {
  try {
    return localStorage.getItem(LAST_FIELD_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function rememberLastMoneyFieldId(fieldId: string | undefined): void {
  try {
    if (!fieldId) {
      localStorage.removeItem(LAST_FIELD_KEY);
      return;
    }
    localStorage.setItem(LAST_FIELD_KEY, fieldId);
  } catch {
    /* ignore quota / private mode */
  }
}
