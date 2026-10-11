import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvitePersonSheet from './InvitePersonSheet';

const mockLookup = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));
jest.mock('../Partners/PartnersSheet', () => ({
  __esModule: true,
  default: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}));
jest.mock('./FieldPermissionPanel', () => () => null);
jest.mock('../../services/fieldPeopleService', () => ({
  fieldPeopleService: {
    lookupInvitee: (...args: unknown[]) => mockLookup(...args),
    createInvites: jest.fn(),
  },
}));

const renderSheet = () =>
  render(
    <InvitePersonSheet
      fields={[{ id: 'f1', name: 'North' }]}
      contacts={[]}
      initialEmail="elena@example.com"
      onClose={() => undefined}
      onSent={() => undefined}
    />
  );

const goToReview = async () => {
  fireEvent.click(await screen.findByText('common:next')); // access -> review
};

describe('QA-039 invite review wording', () => {
  beforeEach(() => mockLookup.mockReset());

  it('QA-039 existing account: review says they already have an account (not "created after acceptance")', async () => {
    mockLookup.mockResolvedValue(true);
    renderSheet();
    await waitFor(() => expect(mockLookup).toHaveBeenCalledWith('elena@example.com'));
    await goToReview();
    expect(await screen.findByText('partners:peoplePage.registerAccountExisting')).toBeInTheDocument();
    expect(screen.queryByText('partners:peoplePage.registerAccount')).not.toBeInTheDocument();
  });

  it('QA-039 new person: review keeps the account-created-on-acceptance wording', async () => {
    mockLookup.mockResolvedValue(false);
    renderSheet();
    await waitFor(() => expect(mockLookup).toHaveBeenCalled());
    await goToReview();
    expect(await screen.findByText('partners:peoplePage.registerAccount')).toBeInTheDocument();
  });

  it('QA-039 unknown lookup result falls back to the neutral wording', async () => {
    mockLookup.mockResolvedValue(null);
    renderSheet();
    await waitFor(() => expect(mockLookup).toHaveBeenCalled());
    await goToReview();
    expect(await screen.findByText('partners:peoplePage.registerAccount')).toBeInTheDocument();
  });
});
