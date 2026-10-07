/** Format check aligned with login/register. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 2606 / special-use TLDs that never deliver mail. */
const NON_DELIVERABLE_TLDS = new Set(['invalid', 'test', 'localhost', 'example']);

/**
 * True when the value looks like a real mailbox we can attempt to email.
 * Rejects empty, malformed, and reserved non-deliverable domains (e.g. *.invalid).
 */
export const isDeliverableEmail = (value: string): boolean => {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return false;

  const at = email.lastIndexOf('@');
  const domain = email.slice(at + 1);
  if (!domain || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  if (!tld || NON_DELIVERABLE_TLDS.has(tld)) return false;

  return true;
};
