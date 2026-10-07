import type { ClientSubscriptionHint } from './subscriptionModel';

export type BillingPeriod = 'monthly' | 'annual' | 'other';

/** Store-agnostic package. Prices are always provider-supplied; the UI never invents them. */
export interface BillingPackage {
  id: string;
  period: BillingPeriod;
  /** Numeric price in `currency` major units — only used to compare plans (e.g. savings). */
  amount: number;
  currency: string;
  /** Localised price string exactly as the provider formats it. */
  formattedPrice: string;
  title: string;
}

export type OfferingsUnavailableReason = 'not_configured' | 'network' | 'empty';

export type OfferingsResult =
  | { status: 'ready'; packages: BillingPackage[] }
  | { status: 'unavailable'; reason: OfferingsUnavailableReason };

export type PurchaseOutcome =
  | { status: 'purchased'; hint: ClientSubscriptionHint }
  | { status: 'cancelled' };

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
 * Purchase provider boundary. The default implementation is RevenueCat Web Billing;
 * tests / Test Store setups can swap another adapter without touching UI code.
 */
export interface BillingAdapter {
  /** False when no SDK key is configured. */
  readonly isConfigured: boolean;
  /** RevenueCat App User ID must equal The Olive Lot `user.userId`. Idempotent. */
  identify(userId: string, email?: string): Promise<void>;
  /** Forget per-user cached purchase state (call on logout / user switch). */
  reset(): Promise<void>;
  loadOfferings(): Promise<OfferingsResult>;
  /** Runs checkout. Resolves `cancelled` for a dismissed checkout; throws BillingError otherwise. */
  purchase(packageId: string): Promise<PurchaseOutcome>;
  /** Fresh CustomerInfo → hint (purchase UX only). Null when unknown. */
  getCustomerHint(): Promise<ClientSubscriptionHint | null>;
  /** Customer portal URL for web-billed customers, when RevenueCat provides one. */
  getManagementUrl(): Promise<string | null>;
}
