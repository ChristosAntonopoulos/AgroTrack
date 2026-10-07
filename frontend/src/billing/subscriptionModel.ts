import { STORE_MANAGEMENT_URLS } from '../config/billingConfig';
import { extractApiErrorPayload } from '../utils/translateApiError';

/**
 * Stable subscription model returned by `GET /api/v1/me/subscription`.
 * The backend is authoritative for permissions; this file only describes and
 * interprets that contract. RevenueCat CustomerInfo is used for purchase UX only.
 */

export const FIELD_LIMIT_ERROR_CODE = 'SUBSCRIPTION_FIELD_LIMIT_REACHED';

export type SubscriptionPlan = 'free' | 'pro';

export type SubscriptionStatus =
  | 'active'
  | 'grace_period'
  | 'billing_issue'
  | 'cancel_at_period_end'
  | 'expired';

export type SubscriptionProvider = 'google_play' | 'app_store' | 'web';

export interface SubscriptionSnapshot {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  entitlementActive: boolean;
  limits: { ownedFields: number };
  usage: { ownedFields: number };
  provider: SubscriptionProvider | null;
  productId: string | null;
  renewsAt: string | null;
  expiresAt: string | null;
  willRenew: boolean;
  canCreateField: boolean;
  needsWritableFieldSelection: boolean;
  selectedWritableFieldId: string | null;
  hasBillingIssue: boolean;
}

export interface OwnedFieldSummary {
  id: string;
  name: string;
  isWritable: boolean;
}

/** Client hint sent after a purchase while the backend webhook may still be in flight. */
export interface ClientSubscriptionHint {
  entitlementActive?: boolean;
  productId?: string;
  store?: string;
  expirationAt?: string;
  willRenew?: boolean;
}

const STATUSES: SubscriptionStatus[] = [
  'active',
  'grace_period',
  'billing_issue',
  'cancel_at_period_end',
  'expired',
];

const PROVIDERS: SubscriptionProvider[] = ['google_play', 'app_store', 'web'];

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Defensive parsing: unknown values degrade to the safest (free, no-create) reading. */
export const normalizeSnapshot = (raw: unknown): SubscriptionSnapshot => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const limits = (data.limits && typeof data.limits === 'object' ? data.limits : {}) as Record<string, unknown>;
  const usage = (data.usage && typeof data.usage === 'object' ? data.usage : {}) as Record<string, unknown>;
  const status = STATUSES.includes(data.status as SubscriptionStatus)
    ? (data.status as SubscriptionStatus)
    : 'active';
  const provider = PROVIDERS.includes(data.provider as SubscriptionProvider)
    ? (data.provider as SubscriptionProvider)
    : null;

  return {
    plan: data.plan === 'pro' ? 'pro' : 'free',
    status,
    entitlementActive: data.entitlementActive === true,
    limits: { ownedFields: readNumber(limits.ownedFields, 1) },
    usage: { ownedFields: readNumber(usage.ownedFields, 0) },
    provider,
    productId: readString(data.productId),
    renewsAt: readString(data.renewsAt),
    expiresAt: readString(data.expiresAt),
    willRenew: data.willRenew === true,
    canCreateField: data.canCreateField === true,
    needsWritableFieldSelection: data.needsWritableFieldSelection === true,
    selectedWritableFieldId: readString(data.selectedWritableFieldId),
    hasBillingIssue: data.hasBillingIssue === true,
  };
};

export const isPro = (snapshot: SubscriptionSnapshot | null | undefined): boolean =>
  snapshot?.plan === 'pro' && snapshot.entitlementActive;

/** What the plan card / banners should communicate. Order = priority. */
export type SubscriptionNotice =
  | 'billing_issue'
  | 'needs_writable_selection'
  | 'cancel_at_period_end'
  | 'expired_over_limit'
  | null;

export const resolveSubscriptionNotice = (
  snapshot: SubscriptionSnapshot | null | undefined
): SubscriptionNotice => {
  if (!snapshot) return null;
  if (snapshot.hasBillingIssue) return 'billing_issue';
  if (snapshot.needsWritableFieldSelection) return 'needs_writable_selection';
  if (snapshot.plan === 'pro' && snapshot.status === 'cancel_at_period_end') return 'cancel_at_period_end';
  if (snapshot.plan === 'free' && snapshot.usage.ownedFields > snapshot.limits.ownedFields) {
    return 'expired_over_limit';
  }
  return null;
};

/** Free user at their limit: the next create must show the paywall, not the form. */
export const mustUpgradeToAddField = (snapshot: SubscriptionSnapshot | null | undefined): boolean =>
  snapshot != null && !snapshot.canCreateField && snapshot.plan === 'free';

/** True when the owner has hit the Pro cap too; upgrading cannot help. */
export const isAtProLimit = (snapshot: SubscriptionSnapshot | null | undefined): boolean =>
  snapshot != null && !snapshot.canCreateField && snapshot.plan === 'pro';

export type ManageTarget =
  | { kind: 'store'; url: string }
  | { kind: 'web_portal' }
  | { kind: 'none' };

/**
 * Where "Manage subscription" should go, based on the *billing provider* —
 * a Play/App Store subscription can only be changed in that store.
 */
export const resolveManageTarget = (snapshot: SubscriptionSnapshot | null | undefined): ManageTarget => {
  switch (snapshot?.provider) {
    case 'google_play':
      return { kind: 'store', url: STORE_MANAGEMENT_URLS.google_play };
    case 'app_store':
      return { kind: 'store', url: STORE_MANAGEMENT_URLS.app_store };
    case 'web':
      return { kind: 'web_portal' };
    default:
      return { kind: 'none' };
  }
};

/** A store-billed Pro user must not be sold a second (web) subscription. */
export const isBilledOutsideWeb = (snapshot: SubscriptionSnapshot | null | undefined): boolean =>
  isPro(snapshot) && (snapshot?.provider === 'google_play' || snapshot?.provider === 'app_store');

export const isFieldLimitError = (err: unknown): boolean => {
  const data = (err as { response?: { data?: unknown } } | null)?.response?.data;
  return extractApiErrorPayload(data).code === FIELD_LIMIT_ERROR_CODE;
};