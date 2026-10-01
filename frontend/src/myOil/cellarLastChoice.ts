const KEY = (fieldId: string) => `oleachron.oilCellar.last.${fieldId}`;

/** Remember whose cellar was last chosen for this grove (ease of use). */
export const readLastCellarOwner = (fieldId: string): string | null => {
  if (!fieldId) return null;
  try {
    return localStorage.getItem(KEY(fieldId));
  } catch {
    return null;
  }
};

export const writeLastCellarOwner = (fieldIds: string[], userId: string): void => {
  if (!userId) return;
  for (const fieldId of fieldIds) {
    if (!fieldId) continue;
    try {
      localStorage.setItem(KEY(fieldId), userId);
    } catch {
      /* ignore */
    }
  }
};
