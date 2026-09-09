/**
 * Fixed product-domain accents — not user-editable.
 * Keep in sync with frontend/src/utils/domainAccents.ts
 *
 * Field color = primary left accent; domain accent = secondary top strip.
 */
export const DOMAIN_ACCENTS = {
  /** Universal work / task identity across the product */
  task: '#3A6EA5',
} as const;

export type DomainAccentKey = keyof typeof DOMAIN_ACCENTS;

export const resolveDomainAccent = (domain: DomainAccentKey): string =>
  DOMAIN_ACCENTS[domain];
