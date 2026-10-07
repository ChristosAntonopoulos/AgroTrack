import { isDeliverableEmail } from './emailValidation';

describe('isDeliverableEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isDeliverableEmail('elena@gmail.com')).toBe(true);
    expect(isDeliverableEmail('  Name@Farm.gr  ')).toBe(true);
  });

  it('rejects malformed and reserved non-deliverable domains', () => {
    expect(isDeliverableEmail('')).toBe(false);
    expect(isDeliverableEmail('not-an-email')).toBe(false);
    expect(isDeliverableEmail('qa-olive-test@example.invalid')).toBe(false);
    expect(isDeliverableEmail('someone@domain.test')).toBe(false);
    expect(isDeliverableEmail('a@b.localhost')).toBe(false);
  });
});
