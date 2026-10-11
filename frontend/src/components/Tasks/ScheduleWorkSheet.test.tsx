import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ScheduleWorkSheet from './ScheduleWorkSheet';
import type { Field } from '../../services/fieldService';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));
jest.mock('../Common/RightDrawer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const fields = [
  { id: 'f1', name: 'North', status: 'Active' },
  { id: 'f2', name: 'South', status: 'Active' },
] as unknown as Field[];

describe('QA-049 schedule wizard loads people of the chosen field', () => {
  it('QA-049 reports the selected field so the parent can load that field’s members', async () => {
    const onFieldChange = jest.fn();
    render(
      <ScheduleWorkSheet
        open
        fields={fields}
        assigneeOptions={[
          { key: 'user:me', label: 'Me', group: 'self' },
          { key: 'later', label: 'Later', group: 'later' },
        ]}
        prefill={{ fieldId: 'f2', title: 'Prune' }}
        onFieldChange={onFieldChange}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );
    await waitFor(() => expect(onFieldChange).toHaveBeenCalledWith('f2'));
    expect(screen.queryByText('schedule.templates.suggestedNow')).not.toBeInTheDocument();
  });
});
