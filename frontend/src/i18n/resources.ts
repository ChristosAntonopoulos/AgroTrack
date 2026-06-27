import type { SupportedLocale } from './config';

import enCommon from '../locales/en/common.json';
import enNav from '../locales/en/nav.json';
import enAuth from '../locales/en/auth.json';
import enSettings from '../locales/en/settings.json';
import enErrors from '../locales/en/errors.json';
import enDashboard from '../locales/en/dashboard.json';
import enFields from '../locales/en/fields.json';
import enTasks from '../locales/en/tasks.json';
import enCalendar from '../locales/en/calendar.json';
import enAnalytics from '../locales/en/analytics.json';
import enReports from '../locales/en/reports.json';
import enMinistry from '../locales/en/ministry.json';
import enToday from '../locales/en/today.json';
import enTaskTemplates from '../locales/en/taskTemplates.json';
import enLanding from '../locales/en/landing.json';

import elCommon from '../locales/el/common.json';
import elNav from '../locales/el/nav.json';
import elAuth from '../locales/el/auth.json';
import elSettings from '../locales/el/settings.json';
import elErrors from '../locales/el/errors.json';
import elDashboard from '../locales/el/dashboard.json';
import elFields from '../locales/el/fields.json';
import elTasks from '../locales/el/tasks.json';
import elCalendar from '../locales/el/calendar.json';
import elAnalytics from '../locales/el/analytics.json';
import elReports from '../locales/el/reports.json';
import elMinistry from '../locales/el/ministry.json';
import elToday from '../locales/el/today.json';
import elTaskTemplates from '../locales/el/taskTemplates.json';
import elTaskTemplateEntries from '../locales/el/taskTemplateEntries.json';
import elLanding from '../locales/el/landing.json';

import itCommon from '../locales/it/common.json';
import itNav from '../locales/it/nav.json';
import itAuth from '../locales/it/auth.json';
import itSettings from '../locales/it/settings.json';
import itErrors from '../locales/it/errors.json';
import itDashboard from '../locales/it/dashboard.json';
import itFields from '../locales/it/fields.json';
import itTasks from '../locales/it/tasks.json';
import itCalendar from '../locales/it/calendar.json';
import itAnalytics from '../locales/it/analytics.json';
import itReports from '../locales/it/reports.json';
import itMinistry from '../locales/it/ministry.json';
import itToday from '../locales/it/today.json';

const bundle = (
  common: object,
  nav: object,
  auth: object,
  settings: object,
  errors: object,
  dashboard: object,
  fields: object,
  tasks: object,
  calendar: object,
  analytics: object,
  reports: object,
  ministry: object,
  today: object,
  taskTemplates: object,
  landing: object
) => ({
  common,
  nav,
  auth,
  settings,
  errors,
  dashboard,
  fields,
  tasks,
  calendar,
  analytics,
  reports,
  ministry,
  today,
  taskTemplates,
  landing,
});

export const resources: Record<
  SupportedLocale,
  Record<string, object>
> = {
  en: bundle(
    enCommon,
    enNav,
    enAuth,
    enSettings,
    enErrors,
    enDashboard,
    enFields,
    enTasks,
    enCalendar,
    enAnalytics,
    enReports,
    enMinistry,
    enToday,
    enTaskTemplates,
    enLanding
  ),
  el: bundle(
    elCommon,
    elNav,
    elAuth,
    elSettings,
    elErrors,
    elDashboard,
    elFields,
    elTasks,
    elCalendar,
    elAnalytics,
    elReports,
    elMinistry,
    elToday,
    { ...elTaskTemplates, templates: elTaskTemplateEntries },
    elLanding
  ),
  it: bundle(
    itCommon,
    itNav,
    itAuth,
    itSettings,
    itErrors,
    itDashboard,
    itFields,
    itTasks,
    itCalendar,
    itAnalytics,
    itReports,
    itMinistry,
    itToday,
    enTaskTemplates,
    enLanding
  ),
};
