import {
  isFieldLimitError,
  mustUpgradeToAddField,
  normalizeSnapshot,
  resolveManageTarget,
  resolveSubscriptionNotice,
} from './subscriptionModel';

describe('subscriptionModel', () => {
  it('degrades unknown payloads to a safe free snapshot', () => {
    const snapshot = normalizeSnapshot(null);
    expect(snapshot.plan).toBe('free');
    expect(snapshot.canCreateField).toBe(false);
    expect(snapshot.limits.ownedFields).toBe(1);
  });

  it('reads the backend contract', () => {
    const snapshot = normalizeSnapshot({
      plan: 'pro',
      status: 'cancel_at_period_end',
      entitlementActive: true,
      limits: { ownedFields: 5 },
      usage: { ownedFields: 2 },
      provider: 'google_play',
      canCreateField: true,
      willRenew: false,
    });
    expect(snapshot.plan).toBe('pro');
    expect(snapshot.limits.ownedFields).toBe(5);
    expect(resolveSubscriptionNotice(snapshot)).toBe('cancel_at_period_end');
    expect(resolveManageTarget(snapshot).kind).toBe('store');
  });

  it('prioritises billing issues and writable selection', () => {
    expect(resolveSubscriptionNotice(normalizeSnapshot({ plan: 'pro', hasBillingIssue: true }))).toBe(
      'billing_issue'
    );
    expect(
      resolveSubscriptionNotice(normalizeSnapshot({ needsWritableFieldSelection: true }))
    ).toBe('needs_writable_selection');
  });

  it('requires an upgrade only for free users at their limit', () => {
    expect(mustUpgradeToAddField(normalizeSnapshot({ plan: 'free', canCreateField: false }))).toBe(true);
    expect(mustUpgradeToAddField(normalizeSnapshot({ plan: 'free', canCreateField: true }))).toBe(false);
    expect(mustUpgradeToAddField(normalizeSnapshot({ plan: 'pro', canCreateField: false }))).toBe(false);
    expect(mustUpgradeToAddField(null)).toBe(false);
  });

  it('detects the field-limit error code', () => {
    expect(
      isFieldLimitError({ response: { data: { error: { code: 'SUBSCRIPTION_FIELD_LIMIT_REACHED' } } } })
    ).toBe(true);
    expect(isFieldLimitError({ response: { data: { code: 'other' } } })).toBe(false);
  });
});
