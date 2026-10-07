/**
 * Billing configuration (RevenueCat Web Billing).
 *
 * Only the *public* SDK key is ever read here. Secret keys and webhook secrets
 * live on the backend. No prices are configured in the client — they always come
 * from RevenueCat Offerings.
 */

const read = (value: string | undefined): string => (value ?? '').trim();

/** Entitlement id that unlocks The Olive Lot Pro. Must match backend `Subscription:ProEntitlementId`. */
export const REVENUECAT_PRO_ENTITLEMENT_ID =
  read(process.env.REACT_APP_REVENUECAT_ENTITLEMENT_ID) || 'pro';

/** Public Web Billing (or Test Store) key. Empty means web purchases are not configured. */
export const getRevenueCatWebApiKey = (): string => read(process.env.REACT_APP_REVENUECAT_WEB_API_KEY);

/** Optional explicit offering id. When empty the "current" offering is used. */
export const getRevenueCatOfferingId = (): string => read(process.env.REACT_APP_REVENUECAT_OFFERING_ID);

export const isWebBillingConfigured = (): boolean => getRevenueCatWebApiKey().length > 0;

/** Stable product ids documented for the dashboard; never used to look up prices. */
export const BILLING_PRODUCT_IDS = {
  proMonthly: 'theolivelot_pro_monthly',
  proYearly: 'theolivelot_pro_yearly',
} as const;

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
