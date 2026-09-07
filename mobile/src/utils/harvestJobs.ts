export type HarvestPhase = 'prepare' | 'daily' | 'final';

export type HarvestJobType =
  | 'harvest_ready_nets'
  | 'harvest_book_mill'
  | 'harvest_call_crew'
  | 'harvest_check_access'
  | 'harvest_daily_kilos'
  | 'harvest'
  | 'olive_harvest'
  | 'harvest_mill_delivery'
  | 'harvest_close_season'
  | 'harvest_planning'
  | 'harvest_equipment_preparation'
  | 'pre_harvest_field_access_cleanup'
  | 'ripening_index_sampling'
  | 'post_harvest_field_inspection'
  | 'annual_field_report';

export type HarvestJobSpec = {
  type: HarvestJobType;
  phase: HarvestPhase;
  aliasOf?: HarvestJobType;
};

export const HARVEST_JOBS: HarvestJobSpec[] = [
  { type: 'harvest_ready_nets', phase: 'prepare' },
  { type: 'harvest_book_mill', phase: 'prepare' },
  { type: 'harvest_call_crew', phase: 'prepare' },
  { type: 'harvest_check_access', phase: 'prepare' },
  { type: 'harvest_planning', phase: 'prepare' },
  { type: 'harvest_equipment_preparation', phase: 'prepare' },
  { type: 'pre_harvest_field_access_cleanup', phase: 'prepare' },
  { type: 'ripening_index_sampling', phase: 'prepare' },
  { type: 'harvest_daily_kilos', phase: 'daily' },
  { type: 'harvest', phase: 'daily', aliasOf: 'harvest_daily_kilos' },
  { type: 'olive_harvest', phase: 'daily', aliasOf: 'harvest_daily_kilos' },
  { type: 'harvest_mill_delivery', phase: 'final' },
  { type: 'harvest_close_season', phase: 'final' },
  { type: 'post_harvest_field_inspection', phase: 'final' },
  { type: 'annual_field_report', phase: 'final' },
];

export const CREATE_HARVEST_JOBS: HarvestJobType[] = [
  'harvest_ready_nets',
  'harvest_book_mill',
  'harvest_call_crew',
  'harvest_check_access',
  'harvest_daily_kilos',
  'harvest_mill_delivery',
  'harvest_close_season',
];

export const PHASE_ORDER: HarvestPhase[] = ['prepare', 'daily', 'final'];

export const getHarvestJob = (type?: string | null): HarvestJobSpec | undefined =>
  HARVEST_JOBS.find((job) => job.type === type);

export const canonicalHarvestType = (type?: string | null): HarvestJobType | undefined => {
  const job = getHarvestJob(type);
  return job?.aliasOf ?? job?.type;
};
