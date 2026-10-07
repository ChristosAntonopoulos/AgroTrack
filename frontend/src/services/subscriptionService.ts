import api from './api';
import {
  ClientSubscriptionHint,
  OwnedFieldSummary,
  SubscriptionSnapshot,
  normalizeSnapshot,
} from '../billing/subscriptionModel';

export const subscriptionService = {
  async getSubscription(): Promise<SubscriptionSnapshot> {
    const { data } = await api.get('/api/v1/me/subscription');
    return normalizeSnapshot(data);
  },

  async refresh(hint?: ClientSubscriptionHint | null): Promise<SubscriptionSnapshot> {
    const { data } = await api.post('/api/v1/me/subscription/refresh', hint ?? {});
    return normalizeSnapshot(data);
  },

  async getOwnedFields(): Promise<OwnedFieldSummary[]> {
    const { data } = await api.get<OwnedFieldSummary[]>('/api/v1/me/subscription/owned-fields');
    return Array.isArray(data) ? data : [];
  },

  async selectWritableField(fieldId: string): Promise<SubscriptionSnapshot> {
    const { data } = await api.post('/api/v1/me/subscription/writable-field', { fieldId });
    return normalizeSnapshot(data);
  },
};
