/** tel:/sms: URLs. Saved-contact numbers and ShowPhone marketplace numbers only. */
export function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let value = trimmed.replace(/[^\d+]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;

  const plus = value.startsWith('+');
  let digits = value.replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;

  if (!plus) {
    if (digits.startsWith('30') && digits.length >= 12) {
      /* already has GR country code */
    } else if (digits.length === 10 && (digits.startsWith('69') || digits.startsWith('2'))) {
      digits = `30${digits}`;
    }
  }

  return `+${digits}`;
}

export function phoneHref(raw: string | undefined | null, scheme: 'tel' | 'sms'): string | null {
  const number = normalizePhoneNumber(raw);
  return number ? `${scheme}:${number}` : null;
}
