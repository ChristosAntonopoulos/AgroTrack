/**
 * Fixed product-domain accents — not user-editable.
 * Keep frontend + mobile copies in sync.
 *
 * Used as AccentCard `secondaryColor` (top hairline) while field color
 * remains the primary left-edge accent (Chronologio inheritance).
 */
export const DOMAIN_ACCENTS = {
  /** Universal work / task identity across the product */
  task: '#3A6EA5',
} as const;

export type DomainAccentKey = keyof typeof DOMAIN_ACCENTS;

export const resolveDomainAccent = (domain: DomainAccentKey): string =>
  DOMAIN_ACCENTS[domain];

/** CSS custom property name for web theme inheritance. */
export const DOMAIN_ACCENT_CSS_VARS: Record<DomainAccentKey, string> = {
  task: '--domain-accent-task',
};
