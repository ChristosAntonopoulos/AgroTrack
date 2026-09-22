export const CAPTURE_TOLERANCE_MS = 2000;

export type HashCapture = {
  contentHash?: string | null;
  capturedAt?: string | null;
  createdAt?: string | null;
};

export const isContentHash = (value: string | null | undefined): boolean =>
  !!value && /^[a-f0-9]{64}$/i.test(value);

/** Upload time stored as capturedAt sits within a couple of seconds of createdAt. */
export const hasDistinctCapture = (
  capturedAt?: string | null,
  createdAt?: string | null
): boolean => {
  if (!capturedAt) return false;
  if (!createdAt) return true;
  const captured = Date.parse(capturedAt);
  const created = Date.parse(createdAt);
  if (Number.isNaN(captured) || Number.isNaN(created)) return true;
  return Math.abs(captured - created) > CAPTURE_TOLERANCE_MS;
};

export const capturesAgree = (
  incomingExif: string | null | undefined,
  existingCapturedAt: string | null | undefined,
  existingCreatedAt?: string | null
): boolean => {
  const existingExif = hasDistinctCapture(existingCapturedAt, existingCreatedAt)
    ? existingCapturedAt
    : null;
  if (incomingExif && existingExif) {
    const left = Date.parse(incomingExif);
    const right = Date.parse(existingExif);
    if (Number.isNaN(left) || Number.isNaN(right)) return true;
    return Math.abs(left - right) <= CAPTURE_TOLERANCE_MS;
  }
  return true;
};

export const isPhotoDuplicate = (incoming: HashCapture, existing: HashCapture): boolean => {
  if (!incoming.contentHash || !existing.contentHash) return false;
  if (incoming.contentHash.toLowerCase() !== existing.contentHash.toLowerCase()) return false;
  return capturesAgree(incoming.capturedAt, existing.capturedAt, existing.createdAt);
};

export const sha256Hex = async (blob: Blob): Promise<string | null> => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};
