import { Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesPackage,
} from 'react-native-purchases';
import { getRevenueCatApiKey, getRevenueCatEntitlementId } from '../config/env';
import type { ClientSubscriptionHint } from './subscriptionModel';
import {
  BillingAdapter,
  BillingError,
  BillingPackage,
  BillingPeriod,
  OfferingsResult,
  PurchaseOutcome,
  RestoreOutcome,
} from './types';

type PurchasesSdk = typeof import('react-native-purchases');

/**
 * The native module is required lazily and defensively: a dev client built before
 * `react-native-purchases` was added (or Expo Go / web) has no native binding. Instead of
 * crashing at import, billing reports `not_configured` and the backend stays authoritative.
 */
let sdkCache: PurchasesSdk | null | undefined;
const loadSdk = (): PurchasesSdk | null => {
  if (sdkCache !== undefined) return sdkCache;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    sdkCache = null;
    return sdkCache;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as PurchasesSdk;
    sdkCache = mod?.default ? mod : null;
  } catch {
    sdkCache = null;
  }
  return sdkCache;
};

const periodOf = (pkg: PurchasesPackage, sdk: PurchasesSdk): BillingPeriod => {
  const types = sdk.PACKAGE_TYPE;
  if (pkg.packageType === types.ANNUAL) return 'annual';
  if (pkg.packageType === types.MONTHLY) return 'monthly';
  const iso = pkg.product.subscriptionPeriod;
  if (iso === 'P1Y') return 'annual';
  if (iso === 'P1M') return 'monthly';
  return 'other';
};

const toBillingPackage = (pkg: PurchasesPackage, sdk: PurchasesSdk): BillingPackage => ({
  id: pkg.identifier,
  period: periodOf(pkg, sdk),
  amount: pkg.product.price,
  currency: pkg.product.currencyCode,
  formattedPrice: pkg.product.priceString,
  perMonthFormatted: pkg.product.pricePerMonthString,
  title: pkg.product.title,
});

const hintFromCustomerInfo = (info: CustomerInfo): ClientSubscriptionHint => {
  const entitlement = info.entitlements.active[getRevenueCatEntitlementId()];
  if (!entitlement) return { entitlementActive: false };
  return {
    entitlementActive: true,
    productId: entitlement.productIdentifier,
    // Backend maps raw store names (PLAY_STORE, APP_STORE, ...) to its own provider enum.
    store: entitlement.store,
    expirationAt: entitlement.expirationDate ?? undefined,
    willRenew: entitlement.willRenew,
  };
};

class RevenueCatNativeAdapter implements BillingAdapter {
  private configured = false;
  private userId: string | null = null;
  /** Identity operations (login/logout) are serialised so a fast logout can't race a login. */
  private queue: Promise<void> = Promise.resolve();
  /** Package objects from the last offerings load, keyed by identifier. */
  private packages = new Map<string, PurchasesPackage>();

  get isConfigured(): boolean {
    return getRevenueCatApiKey().length > 0 && loadSdk() != null;
  }

  get ownProvider(): 'google_play' | 'app_store' | null {
    if (Platform.OS === 'android') return 'google_play';
    if (Platform.OS === 'ios') return 'app_store';
    return null;
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Initialise the SDK exactly once for the app session. */
  async init(): Promise<void> {
    if (this.configured || !this.isConfigured) return;
    const sdk = loadSdk();
    if (!sdk) return;
    try {
      if (__DEV__) void sdk.default.setLogLevel(sdk.LOG_LEVEL.WARN);
      // Anonymous at first; `identify` then logs in with The Olive Lot user id.
      sdk.default.configure({ apiKey: getRevenueCatApiKey() });
      this.configured = true;
    } catch {
      this.configured = false;
    }
  }

  identify(userId: string): Promise<void> {
    if (!userId) return Promise.resolve();
    return this.enqueue(async () => {
      await this.init();
      const sdk = loadSdk();
      if (!sdk || !this.configured) return;
      if (this.userId === userId) return;
      // RevenueCat App User ID = The Olive Lot user.id. Never email or device id.
      await sdk.default.logIn(userId);
      this.userId = userId;
      this.packages.clear();
    }).catch(() => {
      // Identity failure must not break the app; offerings/purchase will surface it.
      this.userId = null;
    });
  }

  reset(): Promise<void> {
    return this.enqueue(async () => {
      const sdk = loadSdk();
      this.userId = null;
      this.packages.clear();
      if (!sdk || !this.configured) return;
      try {
        // logOut throws for anonymous users; skip it quietly.
        if (await sdk.default.isAnonymous()) return;
        await sdk.default.logOut();
      } catch {
        /* nothing to forget */
      }
    });
  }

  async loadOfferings(): Promise<OfferingsResult> {
    const sdk = loadSdk();
    if (!this.isConfigured || !sdk) return { status: 'unavailable', reason: 'not_configured' };
    try {
      await this.init();
      // configure() throws when the native module is missing (build predates the dependency).
      if (!this.configured) return { status: 'unavailable', reason: 'not_configured' };
      await this.queue; // wait for logIn so offerings/purchases attach to the right user
      const offerings = await sdk.default.getOfferings();
      const packages = offerings.current?.availablePackages ?? [];
      this.packages = new Map(packages.map((pkg) => [pkg.identifier, pkg]));
      if (packages.length === 0) return { status: 'unavailable', reason: 'empty' };
      return { status: 'ready', packages: packages.map((pkg) => toBillingPackage(pkg, sdk)) };
    } catch {
      return { status: 'unavailable', reason: 'network' };
    }
  }

  async purchase(packageId: string): Promise<PurchaseOutcome> {
    const sdk = loadSdk();
    const rcPackage = this.packages.get(packageId);
    if (!sdk || !rcPackage) {
      throw new BillingError('Package is not available.', 'package_unavailable');
    }
    await this.queue;
    try {
      const result = await sdk.default.purchasePackage(rcPackage);
      return { status: 'purchased', hint: hintFromCustomerInfo(result.customerInfo) };
    } catch (err) {
      const codes = sdk.PURCHASES_ERROR_CODE;
      const rcError = err as Partial<PurchasesError> | null;
      if (rcError?.userCancelled || rcError?.code === codes.PURCHASE_CANCELLED_ERROR) {
        return { status: 'cancelled' };
      }
      if (rcError?.code === codes.PAYMENT_PENDING_ERROR) {
        return { status: 'pending' };
      }
      if (rcError?.code === codes.PRODUCT_ALREADY_PURCHASED_ERROR) {
        // Same store account already owns it: sync that instead of failing.
        const hint = await this.getCustomerHint();
        if (hint?.entitlementActive) return { status: 'purchased', hint };
      }
      throw new BillingError(
        err instanceof Error ? err.message : String(rcError?.message ?? 'Purchase failed.'),
        String(rcError?.code ?? 'purchase_failed')
      );
    }
  }

  async restore(): Promise<RestoreOutcome> {
    const sdk = loadSdk();
    if (!sdk || !this.configured) throw new BillingError('Billing is not available.', 'not_configured');
    await this.queue;
    try {
      const hint = hintFromCustomerInfo(await sdk.default.restorePurchases());
      return { status: hint.entitlementActive ? 'restored' : 'none', hint };
    } catch (err) {
      throw new BillingError(err instanceof Error ? err.message : 'Restore failed.', 'restore_failed');
    }
  }

  async getCustomerHint(): Promise<ClientSubscriptionHint | null> {
    const sdk = loadSdk();
    if (!sdk || !this.configured) return null;
    try {
      return hintFromCustomerInfo(await sdk.default.getCustomerInfo());
    } catch {
      return null;
    }
  }

  async getManagementUrl(): Promise<string | null> {
    const sdk = loadSdk();
    if (!sdk || !this.configured) return null;
    try {
      return (await sdk.default.getCustomerInfo()).managementURL ?? null;
    } catch {
      return null;
    }
  }
}

export const revenueCatAdapter: BillingAdapter = new RevenueCatNativeAdapter();
