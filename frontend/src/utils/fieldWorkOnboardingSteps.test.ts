import {
  buildStepSequence,
  hasSelectedAnalysisKinds,
  inferResumeStep,
  nextStep,
  normalizeOnboardingStep,
  prevStep,
  primaryIndexForStep,
  PRIMARY_TOTAL,
  resultYearOptions,
} from './fieldWorkOnboardingSteps';
import type { FieldWorkProfile } from '../services/fieldWorkService';
import { mergePendingUpdates } from './fieldWorkProfileDraft';

describe('fieldWorkOnboardingSteps', () => {
  it('maps primary progress indices 1–8', () => {
    expect(primaryIndexForStep('welcome')).toBeNull();
    expect(primaryIndexForStep('purpose')).toBe(1);
    expect(primaryIndexForStep('irrigationWho')).toBe(2);
    expect(primaryIndexForStep('harvestWho')).toBe(8);
    expect(primaryIndexForStep('personalizing')).toBeNull();
    expect(PRIMARY_TOTAL).toBe(8);
  });

  it('builds conditional step sequences without mill, reminders, or months', () => {
    const minimal = buildStepSequence({
      irrigationEnabled: false,
      pruningEnabled: false,
      fertilisationEnabled: false,
      fertilisationAnnual: false,
      pestMonitoring: false,
      analysisKindsSelected: false,
    });
    expect(minimal).toContain('welcome');
    expect(minimal).toContain('purpose');
    expect(minimal).not.toContain('irrigationMethod');
    expect(minimal).not.toContain('pruningLastYear');
    expect(minimal).not.toContain('groundCoverMonths');
    expect(minimal).not.toContain('harvestMill');
    expect(minimal).not.toContain('reminders');
    expect(minimal[minimal.length - 1]).toBe('personalizing');

    const full = buildStepSequence({
      irrigationEnabled: true,
      pruningEnabled: true,
      fertilisationEnabled: true,
      fertilisationAnnual: true,
      pestMonitoring: true,
      analysisKindsSelected: true,
    });
    expect(full).toContain('irrigationMethod');
    expect(full).toContain('fertilisationFrequency');
    expect(full).toContain('pestTraps');
    expect(full).toContain('analysesYears');
  });

  it('navigates next/prev within a sequence', () => {
    const seq = buildStepSequence({
      irrigationEnabled: false,
      pruningEnabled: false,
      fertilisationEnabled: false,
      fertilisationAnnual: false,
      pestMonitoring: false,
      analysisKindsSelected: false,
    });
    expect(nextStep('welcome', seq)).toBe('purpose');
    expect(prevStep('purpose', seq)).toBe('welcome');
    expect(prevStep('welcome', seq)).toBeNull();
    expect(nextStep('harvestWho', seq)).toBe('personalizing');
  });

  it('offers real result years', () => {
    const years = resultYearOptions(2026);
    expect(years.map((y) => y.value)).toEqual([2026, 2025, 2024, 2023]);
  });

  it('treats none/unknown analysis kinds as unselected', () => {
    expect(hasSelectedAnalysisKinds([{ kind: 'none' }])).toBe(false);
    expect(hasSelectedAnalysisKinds([{ kind: 'soil' }])).toBe(true);
  });

  it('infers resume step from draft profile', () => {
    const base = {
      status: 'draft',
      productionPurpose: 'unknown',
      irrigation: { preferenceMode: 'unknown', method: 'unknown', decisionMaker: 'unknown' },
      pruning: { preferenceMode: 'unknown', lastPerformedYear: null, datePrecision: null },
      fertilisation: { preferenceMode: 'unknown', frequencyType: 'unknown' },
      groundCover: { preferenceMode: 'unknown', methods: [] },
      pestManagement: { decisionApproach: 'unknown', trapStatus: 'unknown' },
      analysis: { preferenceMode: 'unknown', kinds: [] },
      harvest: { expectedStartMonth: null, organizer: 'unknown', needsMillBooking: 'unknown' },
      notificationPreference: { intensity: 'unknown' },
    } as unknown as FieldWorkProfile;

    expect(inferResumeStep(null)).toBe('welcome');
    expect(inferResumeStep(base)).toBe('purpose');

    const withPurpose = {
      ...base,
      productionPurpose: 'olive_oil',
    } as FieldWorkProfile;
    expect(inferResumeStep(withPurpose)).toBe('irrigation');
  });

  it('maps retired steps onto the live flow', () => {
    const answered = {
      status: 'draft',
      productionPurpose: 'olive_oil',
      irrigation: { preferenceMode: 'disabled', method: 'unknown', decisionMaker: 'unknown' },
      pruning: { preferenceMode: 'disabled', lastPerformedYear: null, datePrecision: null },
      fertilisation: { preferenceMode: 'disabled', frequencyType: 'unknown' },
      groundCover: { preferenceMode: 'disabled', methods: ['no_fixed_clearing'] },
      pestManagement: { decisionApproach: 'no_usual_treatments', trapStatus: 'unknown' },
      analysis: { preferenceMode: 'disabled', kinds: [] },
      harvest: { expectedStartMonth: 11, organizer: 'self', needsMillBooking: 'unknown' },
      notificationPreference: { intensity: 'unknown' },
    } as unknown as FieldWorkProfile;

    expect(normalizeOnboardingStep('reminders', answered)).toBe('personalizing');
    expect(normalizeOnboardingStep('groundCoverMonths', answered)).toBe('pest');
  });
});

describe('mergePendingUpdates', () => {
  it('merges nested practice patches', () => {
    const merged = mergePendingUpdates(
      { irrigation: { preferenceMode: 'enabled' } },
      { irrigation: { method: 'drip' }, productionPurpose: 'olive_oil' }
    );
    expect(merged.productionPurpose).toBe('olive_oil');
    expect(merged.irrigation?.preferenceMode).toBe('enabled');
    expect(merged.irrigation?.method).toBe('drip');
  });
});
