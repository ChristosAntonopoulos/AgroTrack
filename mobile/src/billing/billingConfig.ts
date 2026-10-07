/**
 * Static billing configuration. No prices live here — they always come from
 * RevenueCat Offerings. SDK keys / entitlement id are read in `config/env.ts`.
 */

/** Where store-billed customers manage their subscription. */
export const STORE_MANAGEMENT_URLS = {
  google_play: 'https://play.google.com/store/account/subscriptions',
  app_store: 'https://apps.apple.com/account/subscriptions',
} as const;

/** Retry budget while the backend webhook catches up after a purchase. */
export const POST_PURCHASE_REFRESH = {
  attempts: 6,
  delayMs: 1500,
} as const;

/** Snapshot younger than this is reused by `ensureFresh` (gate checks stay snappy). */
export const SNAPSHOT_FRESH_MS = 15_000;

/** Longest the add-grove gate waits for a plan check before falling back to "backend decides". */
export const GATE_MAX_WAIT_MS = 4000;

/** After this age the plan screen shows the "last loaded" hint. */
export const SNAPSHOT_STALE_MS = 60_000;

export const BILLING_LEGAL_URLS = {
  terms: 'https://theolivelot.com/terms',
  privacy: 'https://theolivelot.com/privacy/',
} as const;

export const BILLING_SUPPORT_EMAIL = 'support@theolivelot.com';
