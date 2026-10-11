import React from 'react';
import { render, screen } from '@testing-library/react';
import FieldSeatCard from './FieldSeatCard';
import type { FieldMembership } from '../../services/fieldPeopleService';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => (opts?.ref ? `${key}:${opts.ref}` : key),
  }),
}));
jest.mock('./PhoneActions', () => () => null);
jest.mock('./PartnersSheet', () => () => null);
jest.mock('./FamilySharePanel', () => () => null);
jest.mock('./FamilyAccessFields', () => () => null);

const person = (overrides: Partial<FieldMembership>): FieldMembership => ({
  userId: 'user-0001',
  displayName: 'Maria Papadopoulou',
  role: 'Family',
  modules: ['tasks'],
  accessLevel: 'view',
  status: 'active',
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('QA-018 same display name stays distinguishable', () => {
  it('QA-018 shows role label and email for each of two identical names', () => {
    render(
      <>
        <FieldSeatCard fieldId="f1" person={person({ email: 'maria.a@example.com' })} />
        <FieldSeatCard
          fieldId="f1"
          person={person({ userId: 'user-0002', role: 'Partner', email: 'maria.b@example.com' })}
        />
      </>
    );
    expect(screen.getAllByText('Maria Papadopoulou')).toHaveLength(2);
    expect(screen.getByText('maria.a@example.com')).toBeInTheDocument();
    expect(screen.getByText('maria.b@example.com')).toBeInTheDocument();
    expect(document.querySelectorAll('.partner-person-role')).toHaveLength(2);
    const roles = Array.from(document.querySelectorAll('.partner-person-role')).map((el) => el.textContent);
    expect(roles).toEqual(['partners:connection.family', 'partners:connection.partnerSeat']);
  });

  it('QA-018 falls back to a short reference when there is no email or phone', () => {
    render(<FieldSeatCard fieldId="f1" person={person({ userId: 'abcd-1234' })} />);
    expect(screen.getByText('partners:identityRef:1234')).toBeInTheDocument();
  });
});
