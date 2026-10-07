import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enAuth from '../locales/en/auth.json';
import enCommon from '../locales/en/common.json';
import enNav from '../locales/en/nav.json';
import enDashboard from '../locales/en/dashboard.json';
import enFields from '../locales/en/fields.json';
import enTasks from '../locales/en/tasks.json';
import enSettings from '../locales/en/settings.json';
import enErrors from '../locales/en/errors.json';
import enCalendar from '../locales/en/calendar.json';
import enToday from '../locales/en/today.json';
import enTutorial from '../locales/en/tutorial.json';
import enPartners from '../locales/en/partners.json';
import enChronologio from '../locales/en/chronologio.json';
import enCapture from '../locales/en/capture.json';
import enMoney from '../locales/en/money.json';
import enMyOil from '../locales/en/myOil.json';
import enPhotos from '../locales/en/photos.json';
import enFeedback from '../locales/en/feedback.json';
import enHelp from '../locales/en/help.json';
import enLegal from '../locales/en/legal.json';
import enOnboarding from '../locales/en/onboarding.json';
import enSubscription from '../locales/en/subscription.json';

import elAuth from '../locales/el/auth.json';
import elCommon from '../locales/el/common.json';
import elNav from '../locales/el/nav.json';
import elDashboard from '../locales/el/dashboard.json';
import elFields from '../locales/el/fields.json';
import elTasks from '../locales/el/tasks.json';
import elSettings from '../locales/el/settings.json';
import elErrors from '../locales/el/errors.json';
import elCalendar from '../locales/el/calendar.json';
import elToday from '../locales/el/today.json';
import elTutorial from '../locales/el/tutorial.json';
import elPartners from '../locales/el/partners.json';
import elChronologio from '../locales/el/chronologio.json';
import elCapture from '../locales/el/capture.json';
import elMoney from '../locales/el/money.json';
import elMyOil from '../locales/el/myOil.json';
import elPhotos from '../locales/el/photos.json';
import elFeedback from '../locales/el/feedback.json';
import elHelp from '../locales/el/help.json';
import elLegal from '../locales/el/legal.json';
import elOnboarding from '../locales/el/onboarding.json';
import elSubscription from '../locales/el/subscription.json';

import itFields from '../locales/it/fields.json';
import itSubscription from '../locales/it/subscription.json';
import itOnboarding from '../locales/it/onboarding.json';
import itPhotos from '../locales/it/photos.json';
import itMyOil from '../locales/it/myOil.json';
import itCapture from '../locales/it/capture.json';
import itLegal from '../locales/it/legal.json';

/** Greek is the product default for Oleachron. */
const defaultLng = 'el';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: {
      auth: enAuth,
      common: enCommon,
      nav: enNav,
      dashboard: enDashboard,
      fields: enFields,
      tasks: enTasks,
      settings: enSettings,
      errors: enErrors,
      calendar: enCalendar,
      today: enToday,
      tutorial: enTutorial,
      partners: enPartners,
      chronologio: enChronologio,
      capture: enCapture,
      money: enMoney,
      myOil: enMyOil,
      photos: enPhotos,
      feedback: enFeedback,
      help: enHelp,
      legal: enLegal,
      onboarding: enOnboarding,
      subscription: enSubscription,
    },
    el: {
      auth: elAuth,
      common: elCommon,
      nav: elNav,
      dashboard: elDashboard,
      fields: elFields,
      tasks: elTasks,
      settings: elSettings,
      errors: elErrors,
      calendar: elCalendar,
      today: elToday,
      tutorial: elTutorial,
      partners: elPartners,
      chronologio: elChronologio,
      capture: elCapture,
      money: elMoney,
      myOil: elMyOil,
      photos: elPhotos,
      feedback: elFeedback,
      help: elHelp,
      legal: elLegal,
      onboarding: elOnboarding,
      subscription: elSubscription,
    },
    it: {
      // Harvest campaign Italian from FE; other namespaces fall back to English/Greek.
      fields: itFields,
      onboarding: itOnboarding,
      subscription: itSubscription,
      photos: itPhotos,
      myOil: itMyOil,
      capture: itCapture,
      legal: itLegal,
    },
  },
  lng: defaultLng,
  fallbackLng: {
    it: ['en', 'el'],
    default: ['el'],
  },
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;

export const changeAppLanguage = async (lang: 'en' | 'el' | 'it') => {
  await i18n.changeLanguage(lang);
};
