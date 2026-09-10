import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import type { FieldTask } from '../../services/fieldWorkService';
import PlannedTaskRow from './PlannedTaskRow';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);

const task = (overrides: Partial<FieldTask> = {}): FieldTask => ({
  id: 'planned-1',
  fieldId: 'field-1',
  resultYear: 2026,
  title: 'Προκαταρκτική εκτίμηση συγκομιδής',
  status: 'planned',
  statusLabel: 'Προγραμματισμένη',
  plannedStart: '2026-08-15',
  plannedEnd: '2026-10-01',
  checklist: [],
  additionalParticipantUserIds: [],
  assignmentResponse: 'pending',
  weatherSuitability: 'unknown',
  weatherSuitabilityLabel: 'Καλή ημέρα',
  attachmentIds: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...overrides,
});

describe('PlannedTaskRow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
  });

  it('keeps the start action visible and does not repeat the tab status', () => {
    const onStart = jest.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <PlannedTaskRow
          task={task({ title: 'Πολύ '.repeat(40) + 'μεγάλος τίτλος' })}
          fieldName="Κτήμα Φιλιατρών"
          personName="Κώστας"
          year={2026}
          onStart={onStart}
          onOpen={jest.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: 'Ξεκίνα' })).toBeVisible();
    expect(screen.getByText(/Κτήμα Φιλιατρών/)).toBeInTheDocument();
    expect(screen.queryByText('Προγραμματισμένη')).not.toBeInTheDocument();
  });

  it('opens a blocked task instead of starting it', async () => {
    const onOpen = jest.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <PlannedTaskRow
          task={task({ status: 'blocked', statusLabel: 'Μπλοκαρισμένη' })}
          fieldName="Κτήμα Φιλιατρών"
          year={2026}
          onStart={jest.fn()}
          onOpen={onOpen}
        />
      </I18nextProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Άνοιγμα' }));
    expect(onOpen).toHaveBeenCalled();
  });
});
