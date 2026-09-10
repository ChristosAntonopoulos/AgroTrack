import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import type { FieldWeather } from '../../services/geospatialService';
import type { TaskProposal } from '../../services/fieldWorkService';
import TaskProposalCard from './TaskProposalCard';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);

const proposal = (overrides: Partial<TaskProposal> = {}): TaskProposal => ({
  id: 'p-1',
  fieldId: 'field-1',
  resultYear: 2026,
  templateCode: 'T14',
  templateVersion: 1,
  sourceType: 'seasonal_baseline',
  sourceTypeLabel: 'Εποχική υπενθύμιση',
  generatedAt: '2026-06-01T00:00:00Z',
  confidence: 'worth_checking',
  confidenceLabel: 'Χρειάζεται έλεγχο',
  reasonCodes: ['olive_fly_weekly_check'],
  explanation: 'Οι συνθήκες και οι καταγραφές δείχνουν ότι χρειάζεται έλεγχος.',
  greekExplanation: 'Οι συνθήκες και οι καταγραφές δείχνουν ότι χρειάζεται έλεγχος.',
  recommendedWindowStart: '2026-06-01',
  recommendedWindowEnd: '2026-06-14',
  status: 'active',
  statusLabel: 'Πρόταση',
  ...overrides,
});

const weather = (): FieldWeather => ({
  fieldId: 'field-1',
  stale: false,
  lastUpdatedAt: new Date().toISOString(),
  current: {
    temperatureC: 24,
    apparentTemperatureC: 24,
    humidityPercent: 50,
    windSpeedKmh: 8,
    windGustKmh: 12,
    precipitationMm: 0,
    weatherCode: 0,
    description: 'Clear',
    highC: 28,
    lowC: 16,
  },
  rain: {
    previous1hMm: 0,
    previous6hMm: 0,
    previous12hMm: 0,
    previous24hMm: 0,
    previous7dMm: 0,
    previous48hMm: 0,
    forecast3hMm: 0,
    forecast6hMm: 0,
    forecast12hMm: 0,
    forecast24hMm: 0,
    forecast48hMm: 0,
  },
  wind: {
    currentSpeedKmh: 8,
    currentGustKmh: 12,
    maxNext6hKmh: 10,
    maxNext12hKmh: 12,
    maxNext24hKmh: 14,
  },
  frost: { level: 'None', confidence: 'medium' },
  evapotranspiration: { todayMm: 0, last7DaysMm: 0 },
  waterBalance: { rainMm: 0, et0Mm: 0, irrigationMm: 0, balanceMm: 0, label: '' },
  metadata: { source: 'cache', valueType: 'observation' },
});

const renderCard = (
  item: TaskProposal,
  extras: { weather?: FieldWeather | null; onSchedule?: () => void; onSnooze?: () => void } = {}
) =>
  render(
    <I18nextProvider i18n={i18n}>
      <TaskProposalCard
        proposal={item}
        fieldName="Κτήμα Φιλιατρών"
        weather={extras.weather}
        onSchedule={extras.onSchedule || jest.fn()}
        onSnooze={extras.onSnooze || jest.fn()}
        onDismiss={jest.fn()}
      />
    </I18nextProvider>
  );

describe('TaskProposalCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
  });

  it('keeps the schedule action visible when the explanation is long', async () => {
    renderCard(
      proposal({
        greekExplanation: 'Λόγω '.repeat(80),
        explanation: 'Λόγω '.repeat(80),
        reasonCodes: [],
      })
    );
    expect(screen.getByRole('button', { name: 'Προγραμμάτισέ την' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Περισσότερες ενέργειες' })).toBeVisible();
  });

  it('returns keyboard focus to the overflow trigger after Escape', async () => {
    renderCard(proposal());
    const more = screen.getByRole('button', { name: 'Περισσότερες ενέργειες' });
    await userEvent.click(more);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    expect(more).toHaveFocus();
  });

  it('opens a weather explanation from the chip and never calls missing weather a good day', async () => {
    renderCard(proposal({ templateCode: 'T06', reasonCodes: [] }), { weather: null });
    expect(screen.queryByText('Καλή ημέρα')).not.toBeInTheDocument();
    const chip = screen.getByRole('button', { name: 'Δεν υπάρχουν δεδομένα' });
    await userEvent.click(chip);
    expect(
      screen.getByText('Δεν υπάρχουν αρκετά δεδομένα καιρού για να αξιολογηθεί η ημέρα.')
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(
        screen.queryByText('Δεν υπάρχουν αρκετά δεδομένα καιρού για να αξιολογηθεί η ημέρα.')
      ).not.toBeInTheDocument();
    });
    expect(chip).toHaveFocus();
  });

  it('explains a good weather day with facts, not a template code', async () => {
    renderCard(proposal({ templateCode: 'T06', reasonCodes: [] }), { weather: weather() });
    expect(screen.queryByText(/T06/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Καλή ημέρα' }));
    expect(screen.getByText('Δεν αναμένεται βροχή')).toBeInTheDocument();
  });
});
