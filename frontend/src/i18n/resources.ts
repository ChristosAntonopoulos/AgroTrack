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
import enLanding from '../locales/en/landing.json';
import enAdmin from '../locales/en/admin.json';
import enPartners from '../locales/en/partners.json';
import enChronologio from '../locales/en/chronologio.json';
import enCapture from '../locales/en/capture.json';
import enMoney from '../locales/en/money.json';

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
import elLanding from '../locales/el/landing.json';
import elAdmin from '../locales/el/admin.json';
import elPartners from '../locales/el/partners.json';
import elChronologio from '../locales/el/chronologio.json';
import elCapture from '../locales/el/capture.json';
import elMoney from '../locales/el/money.json';

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
import itPartners from '../locales/it/partners.json';
import itChronologio from '../locales/it/chronologio.json';
import itCapture from '../locales/it/capture.json';
import itMoney from '../locales/it/money.json';

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
  landing: object,
  admin: object,
  partners: object,
  chronologio: object,
  capture: object
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
  landing,
  admin,
  partners,
  chronologio,
  capture,
});

export const resources: Record<
  SupportedLocale,
  Record<string, object>
> = {
  en: {
    ...bundle(
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
      enLanding,
      enAdmin,
      enPartners,
      enChronologio,
      enCapture
    ),
    money: enMoney,
  },
  el: {
    ...bundle(
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
      elLanding,
      elAdmin,
      elPartners,
      elChronologio,
      elCapture
    ),
    money: elMoney,
  },
  it: {
    ...bundle(
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
      enLanding,
      enAdmin,
      itPartners,
      itChronologio,
      itCapture
    ),
    money: itMoney,
  },
};
