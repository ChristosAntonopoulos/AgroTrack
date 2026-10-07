import type { ClientSubscriptionHint } from './subscriptionModel';

export type BillingPeriod = 'monthly' | 'annual' | 'other';

/** Store-agnostic package. Prices are always provider-supplied; the UI never invents them. */
export interface BillingPackage {
  id: string;
  period: BillingPeriod;
  /** Numeric price in `currency` major units — only used to compare plans (e.g. savings). */
  amount: number;
  currency: string;
  /** Localised price string exactly as the store formats it. */
  formattedPrice: string;
  /** Store-formatted per-month equivalent (RevenueCat `pricePerMonthString`), when available. */
  perMonthFormatted?: string | null;
  title: string;
}

/**
 * - not_configured: no SDK key for this platform, unsupported platform, or the native
 *   module is missing from this build (needs a rebuild).
 * - network: the store / RevenueCat could not be reached.
 * - empty: reachable but no packages in the current offering.
 */
export type OfferingsUnavailableReason = 'not_configured' | 'network' | 'empty';

export type OfferingsResult =
  | { status: 'ready'; packages: BillingPackage[] }
  | { status: 'unavailable'; reason: OfferingsUnavailableReason };

export type PurchaseOutcome =
  | { status: 'purchased'; hint: ClientSubscriptionHint }
  /** Store accepted the order but payment is deferred (e.g. Play pending transaction). */
  | { status: 'pending' }
  | { status: 'cancelled' };

export type RestoreOutcome = { status: 'restored' | 'none'; hint: ClientSubscriptionHint | null };

/** Raised for failed purchases that are not a user cancellation. */
export class BillingError extends Error {
  readonly code: string;

  constructor(message: string, code = 'purchase_failed') {
    super(message);
    this.name = 'BillingError';
    this.code = code;
  }
}

/**
 * Purchase provider boundary. The default implementation is react-native-purchases;
 * tests can swap another adapter without touching UI code.
 */
export interface BillingAdapter {
  /** False when no SDK key / native module is available. */
  readonly isConfigured: boolean;
  /** The provider id this platform bills through (`google_play` / `app_store`), if any. */
  readonly ownProvider: 'google_play' | 'app_store' | null;
  /** Configure the SDK once (anonymous). Safe to call repeatedly. */
  init(): Promise<void>;
  /** RevenueCat App User ID must equal The Olive Lot `user.id`. Idempotent. */
  identify(userId: string): Promise<void>;
  /** Log out of RevenueCat (call on logout / session expiry). */
  reset(): Promise<void>;
  loadOfferings(): Promise<OfferingsResult>;
  /** Runs the store sheet. Resolves `cancelled` for a dismissed sheet; throws BillingError otherwise. */
  purchase(packageId: string): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  /** Fresh CustomerInfo → hint (purchase UX only). Null when unknown. */
  getCustomerHint(): Promise<ClientSubscriptionHint | null>;
  /** Customer portal URL for web-billed customers, when RevenueCat provides one. */
  getManagementUrl(): Promise<string | null>;
}
