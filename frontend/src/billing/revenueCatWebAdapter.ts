import type { CustomerInfo, Package, Purchases as PurchasesInstance } from '@revenuecat/purchases-js';
import {
  REVENUECAT_PRO_ENTITLEMENT_ID,
  getRevenueCatOfferingId,
  getRevenueCatWebApiKey,
  isWebBillingConfigured,
} from '../config/billingConfig';
import type { ClientSubscriptionHint } from './subscriptionModel';
import {
  BillingAdapter,
  BillingError,
  BillingPackage,
  BillingPeriod,
  OfferingsResult,
  PurchaseOutcome,
} from './types';

type PurchasesModule = typeof import('@revenuecat/purchases-js');

/** RevenueCat Web SDK is loaded lazily so it stays out of the main bundle. */
let modulePromise: Promise<PurchasesModule> | null = null;
const loadModule = (): Promise<PurchasesModule> => {
  if (!modulePromise) {
    modulePromise = import('@revenuecat/purchases-js').catch((err) => {
      modulePromise = null;
      throw err;
    });
  }
  return modulePromise;
};

const periodOf = (pkg: Package, mod: PurchasesModule): BillingPeriod => {
  if (pkg.packageType === mod.PackageType.Annual) return 'annual';
  if (pkg.packageType === mod.PackageType.Monthly) return 'monthly';
  const unit = pkg.webBillingProduct?.period?.unit;
  const count = pkg.webBillingProduct?.period?.number;
  if (unit === mod.PeriodUnit.Year && count === 1) return 'annual';
  if (unit === mod.PeriodUnit.Month && count === 1) return 'monthly';
  return 'other';
};

const toBillingPackage = (pkg: Package, mod: PurchasesModule): BillingPackage => {
  const product = pkg.webBillingProduct;
  const price = product.currentPrice;
  return {
    id: pkg.identifier,
    period: periodOf(pkg, mod),
    amount: price.amountMicros / 1_000_000,
    currency: price.currency,
    formattedPrice: price.formattedPrice,
    title: product.title || product.displayName,
  };
};

const hintFromCustomerInfo = (info: CustomerInfo): ClientSubscriptionHint | null => {
  const entitlement = info.entitlements.active[REVENUECAT_PRO_ENTITLEMENT_ID];
  if (!entitlement) return { entitlementActive: false };
  return {
    entitlementActive: true,
    productId: entitlement.productIdentifier,
    // Backend maps this to its own provider enum.
    store: entitlement.store,
    expirationAt: entitlement.expirationDate?.toISOString(),
    willRenew: entitlement.willRenew,
  };
};

class RevenueCatWebAdapter implements BillingAdapter {
  private instance: PurchasesInstance | null = null;
  private userId: string | null = null;
  private identifying: Promise<void> | null = null;
  /** Package objects from the last offerings load, keyed by identifier. */
  private packages = new Map<string, Package>();

  get isConfigured(): boolean {
    return isWebBillingConfigured();
  }

  identify(userId: string, _email?: string): Promise<void> {
    if (!this.isConfigured || !userId) return Promise.resolve();
    if (this.userId === userId && this.instance) return this.identifying ?? Promise.resolve();
    const run = async () => {
      const mod = await loadModule();
      if (this.instance && mod.Purchases.isConfigured()) {
        await this.instance.changeUser(userId);
      } else {
        this.instance = mod.Purchases.configure({
          apiKey: getRevenueCatWebApiKey(),
          // RevenueCat App User ID = The Olive Lot user id. Never email/device.
          appUserId: userId,
        });
      }
      this.userId = userId;
      this.packages.clear();
    };
    this.identifying = run();
    return this.identifying;
  }

  async reset(): Promise<void> {
    // Web SDK has no anonymous logout; the next identify() switches user.
    this.userId = null;
    this.identifying = null;
    this.packages.clear();
  }

  async loadOfferings(): Promise<OfferingsResult> {
    if (!this.isConfigured) return { status: 'unavailable', reason: 'not_configured' };
    try {
      await this.identifying;
    } catch {
      return { status: 'unavailable', reason: 'network' };
    }
    if (!this.instance) return { status: 'unavailable', reason: 'network' };
    try {
      const mod = await loadModule();
      const offerings = await this.instance.getOfferings();
      const wanted = getRevenueCatOfferingId();
      const offering = (wanted ? offerings.all[wanted] : null) ?? offerings.current;
      if (!offering || offering.availablePackages.length === 0) {
        return { status: 'unavailable', reason: 'empty' };
      }
      this.packages = new Map(offering.availablePackages.map((p) => [p.identifier, p]));
      const packages = offering.availablePackages
        .map((p) => toBillingPackage(p, mod))
        .filter((p) => p.period === 'monthly' || p.period === 'annual');
      if (packages.length === 0) return { status: 'unavailable', reason: 'empty' };
      return { status: 'ready', packages };
    } catch {
      return { status: 'unavailable', reason: 'network' };
    }
  }

  async purchase(packageId: string): Promise<PurchaseOutcome> {
    const rcPackage = this.packages.get(packageId);
    if (!this.instance || !rcPackage) {
      throw new BillingError('Package is not available.', 'package_unavailable');
    }
    const mod = await loadModule();
    try {
      const result = await this.instance.purchase({ rcPackage });
      return {
        status: 'purchased',
        hint: hintFromCustomerInfo(result.customerInfo) ?? { entitlementActive: true },
      };
    } catch (err) {
      if (err instanceof mod.PurchasesError && err.errorCode === mod.ErrorCode.UserCancelledError) {
        return { status: 'cancelled' };
      }
      const code = err instanceof mod.PurchasesError ? String(err.errorCode) : 'purchase_failed';
      throw new BillingError(err instanceof Error ? err.message : 'Purchase failed.', code);
    }
  }

  async getCustomerHint(): Promise<ClientSubscriptionHint | null> {
    if (!this.instance) return null;
    try {
      return hintFromCustomerInfo(await this.instance.getCustomerInfo());
    } catch {
      return null;
    }
  }

  async getManagementUrl(): Promise<string | null> {
    if (!this.instance) return null;
    try {
      return (await this.instance.getCustomerInfo()).managementURL ?? null;
    } catch {
      return null;
    }
  }
}

export const revenueCatWebAdapter: BillingAdapter = new RevenueCatWebAdapter();
