export type ExperienceMode = 'everyday' | 'full';

export type FontScale = 'default' | 'large' | 'xl';

/** UI surfaces gated by experience mode. Full picture shows all; Everyday uses the catalog allow-list. */
export type ExperienceWidget =
  | 'fieldIntelligence'
  | 'satelliteLayers'
  | 'mapLayerPanel'
  | 'cadastreDetails'
  | 'analyticsNav'
  | 'reportsNav'
  | 'dataSourcesNav'
  | 'calendarMonthView'
  | 'calendarWeekView'
  | 'calendarFieldView'
  | 'taskBoardView'
  | 'dashboardStats'
  | 'fieldMapDefault'
  // Phase 1 plan expansions — first-class Everyday surfaces
  | 'todayAction'
  | 'weatherAdvice'
  | 'nextTasks'
  | 'peopleStrip'
  | 'alertsPlain'
  | 'fieldCosts'
  // Phase 4 Full-picture people depth
  | 'advisorComments'
  | 'peopleStats';

export const FONT_SCALE_VALUES: Record<FontScale, number> = {
  default: 1,
  large: 1.15,
  xl: 1.3,
};

export const TAP_MIN_PX = {
  default: 44,
  large: 48,
} as const;
