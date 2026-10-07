/**
 * Thin analytics seam for subscription events. The app has no analytics SDK yet, so
 * events go to the console in development and to a window CustomEvent that a future
 * provider can subscribe to. Never include PII or price strings here.
 */

export type BillingEventName =
  | 'paywall_viewed'
  | 'paywall_closed'
  | 'paywall_dismissed'
  | 'plan_selected'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_succeeded'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'purchase_pending_sync'
  | 'offerings_unavailable'
  | 'restore_started'
  | 'restore_succeeded'
  | 'restore_failed'
  | 'manage_subscription_opened'
  | 'field_limit_reached'
  | 'writable_selection_opened'
  | 'writable_field_selected'
  | 'read_only_notice_viewed'
  | 'subscription_refresh_failed'
  | 'subscription_screen_viewed'
  | 'readonly_field_upgrade_clicked';

export type BillingEventProps = Record<string, string | number | boolean | null | undefined>;

export const ANALYTICS_EVENT = 'theolivelot:analytics';

export const trackBillingEvent = (name: BillingEventName, props: BillingEventProps = {}): void => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { name, props, at: Date.now() } }));
  } catch {
    /* analytics must never break the UI */
  }
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[billing] ${name}`, props);
  }
};
