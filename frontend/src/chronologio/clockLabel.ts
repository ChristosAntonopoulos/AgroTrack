/** Midnight timestamps are date-only records, not a real transaction time. */
export const isDateOnlyTimestamp = (value?: string | null): boolean => {
  if (!value) return true;
  if (/T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:?00)?$/.test(value.trim())) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getHours() === 0 && date.getMinutes() === 0;
};
