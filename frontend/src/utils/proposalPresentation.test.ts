import type { FieldWeather } from '../services/geospatialService';
import type { TaskProposal } from '../services/fieldWorkService';
import {
  evaluateProposalWeather,
  groupProposals,
  looksLikeInternalCode,
  proposalChips,
  proposalExplanation,
  proposalTitle,
  proposalUrgencyRank,
  scheduleProposalPath,
  sortProposals,
} from './proposalPresentation';

const proposal = (overrides: Partial<TaskProposal> = {}): TaskProposal => ({
  id: 'p-1',
  fieldId: 'field-1',
  resultYear: 2026,
  templateCode: 'T14',
  templateVersion: 1,
  sourceType: 'seasonal_baseline',
  sourceTypeLabel: 'Εποχική',
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

const weather = (overrides: Partial<FieldWeather> = {}): FieldWeather => ({
  fieldId: 'field-1',
  stale: false,
  lastUpdatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
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
  ...overrides,
});

describe('proposal presentation', () => {
  it('replaces generic catalogue copy with a specific reason sentence', () => {
    expect(proposalExplanation(proposal(), 'el')).toBe(
      'Δεν έχει καταγραφεί έλεγχος παγίδων τις τελευταίες 7 ημέρες.'
    );
  });

  it('uses a seasonal fallback when there is no field evidence', () => {
    expect(
      proposalExplanation(
        proposal({
          reasonCodes: [],
          explanation: '',
          greekExplanation: '',
        }),
        'el'
      )
    ).toBe('Εποχική υπενθύμιση — δεν υπάρχουν ακόμη δεδομένα από το χωράφι.');
  });

  it('never falls back to a template code for the title', () => {
    expect(proposalTitle(proposal({ templateCode: 'T14' }), 'el')).toBe('Έλεγχος παγίδων δάκου');
    expect(proposalTitle(proposal({ templateCode: 'UNKNOWN' }), 'el')).toBe('Εργασία');
    expect(looksLikeInternalCode('T14')).toBe(true);
  });

  it('sorts official, expiring, weather-sensitive, seasonal, then informational', () => {
    const now = new Date('2026-09-10T12:00:00');
    const official = proposal({
      id: 'official',
      sourceType: 'official_warning',
      recommendedWindowEnd: '2026-12-01',
    });
    const expiring = proposal({
      id: 'expiring',
      validUntil: '2026-09-12',
      recommendedWindowEnd: '2026-09-12',
    });
    const weatherSensitive = proposal({
      id: 'weather',
      templateCode: 'T06',
      reasonCodes: [],
      recommendedWindowEnd: '2026-10-01',
    });
    const seasonal = proposal({
      id: 'seasonal',
      recommendedWindowEnd: '2026-11-01',
    });
    const informational = proposal({
      id: 'info',
      confidence: 'informational',
      recommendedWindowEnd: '2026-08-01',
    });

    expect(proposalUrgencyRank(official, now)).toBe(1);
    expect(proposalUrgencyRank(expiring, now)).toBe(2);
    expect(proposalUrgencyRank(weatherSensitive, now)).toBe(3);
    expect(proposalUrgencyRank(seasonal, now)).toBe(4);
    expect(proposalUrgencyRank(informational, now)).toBe(5);

    const sorted = sortProposals(
      [informational, seasonal, weatherSensitive, official, expiring],
      now
    );
    expect(sorted.map((item) => item.id)).toEqual([
      'official',
      'expiring',
      'weather',
      'seasonal',
      'info',
    ]);
  });

  it('groups only when there are many proposals', () => {
    const now = new Date('2026-09-10T12:00:00');
    const few = [
      proposal({ id: 'a', templateCode: 'T14' }),
      proposal({ id: 'b', templateCode: 'T18', reasonCodes: ['harvest_estimate'] }),
      proposal({ id: 'c', templateCode: 'T06' }),
    ];
    const fewGroups = groupProposals(few, now);
    expect(fewGroups.needsDecision).toHaveLength(3);
    expect(fewGroups.canWait).toHaveLength(0);

    const many = [
      proposal({ id: 'official', sourceType: 'official_warning' }),
      proposal({ id: 'weather', templateCode: 'T15' }),
      proposal({ id: 'seasonal', templateCode: 'T14' }),
      proposal({ id: 'info', confidence: 'low', templateCode: 'T01' }),
    ];
    const groups = groupProposals(many, now);
    expect(groups.needsDecision.map((item) => item.id)).toEqual(['official', 'weather']);
    expect(groups.canWait.map((item) => item.id)).toEqual(['seasonal', 'info']);
  });

  it('does not treat missing weather as a good day, and T14 is not weather-sensitive', () => {
    const weekly = proposal({ templateCode: 'T14' });
    expect(evaluateProposalWeather(weekly, null).kind).toBe('not_sensitive');
    expect(evaluateProposalWeather(weekly, weather()).kind).toBe('not_sensitive');

    const pruning = proposal({ templateCode: 'T06' });
    expect(evaluateProposalWeather(pruning, null).kind).toBe('unknown');
    expect(evaluateProposalWeather(pruning, weather()).kind).toBe('good');
    expect(
      evaluateProposalWeather(
        pruning,
        weather({
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
            forecast24hMm: 12,
            forecast48hMm: 12,
          },
        })
      ).kind
    ).toBe('unsuitable');

    const chips = proposalChips(pruning, 'unknown');
    expect(chips.some((chip) => chip.id === 'good')).toBe(false);
    expect(chips.some((chip) => chip.id === 'unknown')).toBe(true);
  });

  it('builds a schedule path without a template code', () => {
    expect(scheduleProposalPath(proposal({ id: 'abc', fieldId: 'field-9' }))).toBe(
      '/tasks/new?proposalId=abc&fieldId=field-9'
    );
  });
});
