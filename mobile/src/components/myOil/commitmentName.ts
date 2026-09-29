export const commitmentDisplayName = (
  c: { counterpartyName?: string | null },
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  const name = (c.counterpartyName || '').trim();
  if (name) return name;
  return t('commitments.unnamedHold', { defaultValue: t('commitments.unnamed') });
};
