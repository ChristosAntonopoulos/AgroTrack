export type ExperienceMode = 'everyday' | 'full';

export type FontScale = 'default' | 'large' | 'xl';

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
  | 'todayAction'
  | 'weatherAdvice'
  | 'nextTasks'
  | 'peopleStrip'
  | 'alertsPlain'
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
