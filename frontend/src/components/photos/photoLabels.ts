import { normalizeTaskStatus } from '../../utils/categoryNormalize';

export const localizeLinkedStatus = (
  status: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null => {
  if (!status || !status.trim()) return null;
  const normalized = normalizeTaskStatus(status);
  if (normalized) {
    return t(`common:taskStatus.${normalized}`);
  }
  if (/[^\u0000-\u007f]/.test(status)) return status.trim();
  return null;
};

export const capturedDateIsFallback = (capturedAt?: string | null): boolean => !capturedAt;

export const daysUntilPurge = (deletedAt: string | null | undefined, retentionDays = 30): number | null => {
  if (!deletedAt) return null;
  const deleted = new Date(deletedAt).getTime();
  if (Number.isNaN(deleted)) return null;
  const purgeAt = deleted + retentionDays * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
};
