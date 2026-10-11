/**
 * Shared e2e helpers for QA_* specs. Prefer API seeding when E2E_API_URL is set.
 */
export type QaSeed = {
  ownerEmail: string;
  ownerPassword: string;
  editableFieldId?: string;
  viewOnlyFieldId?: string;
};

export const defaultQaSeed = (): QaSeed => ({
  ownerEmail: process.env.E2E_OWNER_EMAIL || 'qa-owner@example.com',
  ownerPassword: process.env.E2E_OWNER_PASSWORD || 'Password123!',
});
