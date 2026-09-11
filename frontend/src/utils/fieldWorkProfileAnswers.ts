import type { FieldWorkProfile } from '../services/fieldWorkService';
import type { OnboardingStepId } from './fieldWorkOnboardingSteps';

export type WorkProfileAnswerRow = {
  id: string;
  step: OnboardingStepId;
  titleKey: string;
  lines: string[];
};

type LabelFn = (key: string, params?: Record<string, string | number>) => string;

const PURPOSE_LABEL: Record<string, string> = {
  olive_oil: 'purpose.oil',
  table_olives: 'purpose.table',
  both: 'purpose.both',
};

const WHO_LABEL: Record<string, string> = {
  self: 'who.self',
  collaborator_or_family: 'who.family',
  agronomist: 'who.agronomist',
  automatic_system: 'who.auto',
  contractor: 'who.contractor',
  no_fixed_way: 'who.nofixed',
};

const GROUND_LABEL: Record<string, string> = {
  mower_or_mulcher: 'ground.mower',
  soil_tillage: 'ground.tillage',
  grazing: 'ground.grazing',
  herbicide: 'ground.herbicide',
  no_fixed_clearing: 'ground.nofixed',
};

const ANALYSIS_LABEL: Record<string, string> = {
  soil: 'analysis.soil',
  leaf: 'analysis.leaf',
  water: 'analysis.water',
};

const joinLines = (parts: Array<string | null | undefined>): string[] =>
  parts.map((p) => (p || '').trim()).filter(Boolean);

const choice = (label: LabelFn, key: string): string =>
  label(`tasks:fieldWork.onboarding.choices.${key}`);

const monthName = (label: LabelFn, month: number): string =>
  label(`tasks:fieldWork.onboarding.months.${month}`, { defaultValue: String(month) });

const whoLine = (label: LabelFn, who?: string | null): string | null => {
  if (!who || who === 'unknown' || who === 'skip') return null;
  const key = WHO_LABEL[who];
  return key ? choice(label, key) : null;
};

const frequencyLine = (
  label: LabelFn,
  frequencyType?: string,
  frequencyValue?: number | null
): string | null => {
  if (frequencyType === 'when_needed') return choice(label, 'times.whenNeeded');
  if (frequencyType === 'times_per_year') {
    if (frequencyValue === 1) return choice(label, 'times.1');
    if (frequencyValue === 2) return choice(label, 'times.2');
    if (frequencyValue && frequencyValue >= 3) return choice(label, 'times.3');
  }
  if (frequencyType === 'every_n_years' && frequencyValue === 1) {
    return choice(label, 'fertilisation.annual');
  }
  return null;
};

/** Human-readable cards of what the grower answered during setup. */
export function buildWorkProfileAnswerRows(
  profile: FieldWorkProfile | null | undefined,
  label: LabelFn
): WorkProfileAnswerRow[] {
  if (!profile) return [];

  const rows: WorkProfileAnswerRow[] = [];

  const purposeKey = PURPOSE_LABEL[profile.productionPurpose];
  rows.push({
    id: 'purpose',
    step: 'purpose',
    titleKey: 'tasks:fieldWork.profile.sections.purpose',
    lines: joinLines([
      purposeKey ? choice(label, purposeKey) : choice(label, 'unsure'),
    ]),
  });

  const irrigation = profile.irrigation;
  const irrigationLines: Array<string | null> = [];
  if (irrigation.preferenceMode === 'enabled') irrigationLines.push(choice(label, 'irrigation.yes'));
  else if (irrigation.preferenceMode === 'disabled') irrigationLines.push(choice(label, 'irrigation.no'));
  else if (irrigation.preferenceMode === 'ask_first') irrigationLines.push(choice(label, 'irrigation.ask'));
  else irrigationLines.push(choice(label, 'unsure'));
  if (irrigation.preferenceMode === 'enabled') {
    if (irrigation.method === 'drip') irrigationLines.push(choice(label, 'irrigationMethod.drip'));
    else if (irrigation.method === 'sprinklers') irrigationLines.push(choice(label, 'irrigationMethod.sprinklers'));
    else if (irrigation.method === 'portable') irrigationLines.push(choice(label, 'irrigationMethod.portable'));
    else if (irrigation.method === 'other') irrigationLines.push(choice(label, 'irrigationMethod.other'));
  }
  irrigationLines.push(whoLine(label, irrigation.decisionMaker));
  rows.push({
    id: 'irrigation',
    step: 'irrigation',
    titleKey: 'tasks:fieldWork.profile.categories.irrigation',
    lines: joinLines(irrigationLines),
  });

  const pruning = profile.pruning;
  const pruningLines: Array<string | null> = [];
  if (pruning.preferenceMode === 'disabled') pruningLines.push(choice(label, 'pruning.no'));
  else if (pruning.preferenceMode === 'decided_by_professional') pruningLines.push(choice(label, 'pruning.pro'));
  else if (pruning.frequencyType === 'when_needed') pruningLines.push(choice(label, 'pruning.whenNeeded'));
  else if (pruning.preferenceMode === 'enabled') pruningLines.push(choice(label, 'pruning.yes'));
  else pruningLines.push(choice(label, 'unsure'));
  if (pruning.lastPerformedYear) {
    pruningLines.push(
      label('tasks:fieldWork.onboarding.planPreview.answers.lastYear', {
        year: pruning.lastPerformedYear,
      })
    );
  }
  rows.push({
    id: 'pruning',
    step: 'pruning',
    titleKey: 'tasks:fieldWork.profile.categories.pruning',
    lines: joinLines(pruningLines),
  });

  const fert = profile.fertilisation;
  const fertLines: Array<string | null> = [];
  if (fert.preferenceMode === 'disabled') fertLines.push(choice(label, 'fertilisation.no'));
  else if (fert.preferenceMode === 'decided_by_professional') fertLines.push(choice(label, 'fertilisation.pro'));
  else if (fert.frequencyType === 'when_needed') fertLines.push(choice(label, 'fertilisation.sometimes'));
  else if (fert.preferenceMode === 'enabled') fertLines.push(choice(label, 'fertilisation.annual'));
  else fertLines.push(choice(label, 'unsure'));
  fertLines.push(frequencyLine(label, fert.frequencyType, fert.frequencyValue));
  const fertDone = profile.currentYearDeclaredWork.find((w) => w.category === 'fertilisation');
  if (fertDone?.completion === 'yes') {
    fertLines.push(label('tasks:fieldWork.onboarding.planPreview.answers.doneThisYear'));
  } else if (fertDone?.completion === 'partially') {
    fertLines.push(choice(label, 'partially'));
  } else if (fertDone?.completion === 'no') {
    fertLines.push(label('tasks:fieldWork.onboarding.planPreview.answers.notYetThisYear'));
  }
  fertLines.push(whoLine(label, fert.decisionMaker));
  rows.push({
    id: 'fertilisation',
    step: 'fertilisation',
    titleKey: 'tasks:fieldWork.profile.categories.fertilisation',
    lines: joinLines(fertLines),
  });

  const ground = profile.groundCover;
  const methodLines = (ground.methods || [])
    .filter((m) => m !== 'unknown')
    .map((m) => (GROUND_LABEL[m] ? choice(label, GROUND_LABEL[m]) : null));
  const monthLines =
    ground.preferredMonths?.length
      ? ground.preferredMonths.map((m) => monthName(label, m)).join(', ')
      : null;
  const groundLines = joinLines([
    ground.preferenceMode === 'disabled' || ground.methods?.includes('no_fixed_clearing')
      ? choice(label, 'ground.nofixed')
      : null,
    ...methodLines,
    frequencyLine(label, ground.frequencyType, ground.frequencyValue),
    monthLines,
  ]);
  rows.push({
    id: 'groundCover',
    step: 'groundCover',
    titleKey: 'tasks:fieldWork.profile.categories.ground_cover',
    lines: groundLines.length ? groundLines : [choice(label, 'unsure')],
  });

  const pest = profile.pestManagement;
  const pestLines: Array<string | null> = [];
  if (pest.decisionApproach === 'official_warnings') pestLines.push(choice(label, 'pest.official'));
  else if (pest.decisionApproach === 'agronomist') pestLines.push(choice(label, 'pest.agronomist'));
  else if (pest.decisionApproach === 'trap_and_fruit_checks') pestLines.push(choice(label, 'pest.traps'));
  else if (pest.decisionApproach === 'combined') pestLines.push(choice(label, 'pest.combined'));
  else if (pest.decisionApproach === 'no_usual_treatments') pestLines.push(choice(label, 'pest.none'));
  else pestLines.push(choice(label, 'unsure'));
  if (pest.trapStatus === 'active') pestLines.push(choice(label, 'traps.active'));
  else if (pest.trapStatus === 'not_yet_installed') pestLines.push(choice(label, 'traps.notYet'));
  else if (pest.trapStatus === 'none') pestLines.push(choice(label, 'traps.none'));
  rows.push({
    id: 'pest',
    step: 'pest',
    titleKey: 'tasks:fieldWork.profile.categories.monitoring',
    lines: joinLines(pestLines),
  });

  const analysis = profile.analysis;
  const kinds = (analysis.kinds || []).filter((k) => k.kind !== 'unknown');
  const analysisLines =
    analysis.preferenceMode === 'disabled' || kinds.length === 0
      ? [choice(label, 'analysis.none')]
      : kinds.map((k) => {
          const name = ANALYSIS_LABEL[k.kind] ? choice(label, ANALYSIS_LABEL[k.kind]) : k.kind;
          return k.lastPerformedYear
            ? `${name} · ${k.lastPerformedYear}`
            : name;
        });
  rows.push({
    id: 'analyses',
    step: 'analyses',
    titleKey: 'tasks:fieldWork.onboarding.planPreview.answers.analyses',
    lines: analysisLines,
  });

  const harvest = profile.harvest;
  const harvestLines: Array<string | null> = [];
  if (harvest.expectedStartMonth) {
    harvestLines.push(monthName(label, harvest.expectedStartMonth));
  } else {
    harvestLines.push(choice(label, 'unsure'));
  }
  harvestLines.push(whoLine(label, harvest.organizer));
  if (harvest.needsMillBooking === 'yes') {
    harvestLines.push(label('tasks:fieldWork.onboarding.planPreview.answers.needsMill'));
  } else if (harvest.needsMillBooking === 'no') {
    harvestLines.push(label('tasks:fieldWork.onboarding.planPreview.answers.noMill'));
  }
  rows.push({
    id: 'harvest',
    step: 'harvestMonth',
    titleKey: 'tasks:fieldWork.profile.categories.harvest',
    lines: joinLines(harvestLines),
  });

  const intensity = profile.notificationPreference?.intensity;
  if (intensity && intensity !== 'unknown') {
    const reminderKey =
      intensity === 'decisions_only'
        ? 'reminders.decisions'
        : intensity === 'decisions_and_upcoming'
          ? 'reminders.upcoming'
          : intensity === 'all_proposals'
            ? 'reminders.all'
            : intensity === 'configure_later'
              ? 'reminders.later'
              : null;
    if (reminderKey) {
      rows.push({
        id: 'reminders',
        step: 'reminders',
        titleKey: 'tasks:fieldWork.onboarding.planPreview.answers.reminders',
        lines: [choice(label, reminderKey)],
      });
    }
  }

  return rows.filter((row) => row.lines.length > 0);
}
