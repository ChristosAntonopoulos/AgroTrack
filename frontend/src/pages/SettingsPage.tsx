import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Sun, Moon, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleProvider';
import { useExperienceMode } from '../context/ExperienceModeContext';
import {
  settingsService,
  UserPreferences,
  Theme,
  DefaultView,
  NotificationDevicePreferences,
} from '../services/settingsService';
import { isMockMode } from '../services/serviceFactory';
import { accountService } from '../services/accountService';
import AccountSettings from './settings/AccountSettings';
import DataRightsSettings from './settings/DataRightsSettings';
import { demoStore } from '../services/demo/demoStore';
import { SUPPORTED_LOCALES, SupportedLocale } from '../i18n/config';
import type { FontScale } from '../experience/types';
import { formatDate } from '../utils/localeFormatters';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Button from '../components/Common/Button';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import './SettingsPage.css';

type SaveStatus = 'idle' | 'saved' | 'error';

const DATE_FORMAT_VALUES = ['dd/MM/yyyy', 'yyyy-MM-dd', 'medium'] as const;
const START_VIEWS: DefaultView[] = ['chronologio', 'fields'];
const THEME_OPTIONS: Theme[] = ['system', 'light', 'dark'];
const SAMPLE_DATE = new Date(2026, 8, 9);

const NOTIFICATION_PREF_KEYS: Array<keyof NotificationDevicePreferences> = [
  'taskAssignment',
  'approval',
  'harvest',
  'financial',
  'satelliteWeather',
  'marketingSystem',
];

const APP_VERSION = '0.1.0';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'nav', 'common', 'onboarding']);
  const { user, logout } = useAuth();
  const activation = useOwnerActivationOptional();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const {
    fontScale,
    setFontScale,
    largeControls,
    setLargeControls,
    applyEasyUsePreset,
    resetComfortDefaults,
  } = useExperienceMode();
  const [preferences, setPreferences] = useState<UserPreferences>(settingsService.getPreferences());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [techOpen, setTechOpen] = useState(false);
  const [lastFailed, setLastFailed] = useState<(() => void) | null>(null);
  const saveTimer = useRef<number | null>(null);

  const languageOptions = SUPPORTED_LOCALES.filter((l) => l.code === 'el' || l.code === 'en');

  useEffect(() => {
    const prefs = settingsService.getPreferences();
    setPreferences(prefs);
    if (prefs.theme !== theme) {
      setTheme(prefs.theme);
    }
  }, []);

  useEffect(() => {
    const sync = () => setPreferences(settingsService.getPreferences());
    window.addEventListener('oleachron-preferences', sync);
    return () => window.removeEventListener('oleachron-preferences', sync);
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    void accountService.loadNotificationPrefs(user.userId).then((loaded) => {
      if (cancelled || !loaded) return;
      settingsService.savePreferences({ notificationPrefs: loaded });
    });
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const flashSaved = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveStatus('idle'), 2200);
  }, []);

  const persist = useCallback(
    (patch: Partial<UserPreferences>, apply?: () => void, retryFn?: () => void) => {
      apply?.();
      const ok = settingsService.savePreferences(patch);
      if (!ok) {
        setSaveStatus('error');
        setLastFailed(() => retryFn ?? (() => persist(patch, apply, retryFn)));
        return;
      }
      setPreferences((prev) => ({
        ...prev,
        ...patch,
        notificationPrefs: patch.notificationPrefs
          ? { ...prev.notificationPrefs, ...patch.notificationPrefs }
          : prev.notificationPrefs,
      }));
      setLastFailed(null);
      flashSaved();
    },
    [flashSaved]
  );

  const onTheme = (next: Theme) => {
    persist({ theme: next }, () => setTheme(next), () => onTheme(next));
  };

  const onLanguage = (code: SupportedLocale) => {
    persist({ language: code }, () => setLocale(code), () => onLanguage(code));
  };

  const onDateFormat = (value: string) => {
    persist({ dateFormat: value }, undefined, () => onDateFormat(value));
  };

  const onDefaultView = (value: DefaultView) => {
    persist({ defaultView: value }, undefined, () => onDefaultView(value));
  };

  const onNotificationPref = (key: keyof NotificationDevicePreferences, enabled: boolean) => {
    const previous = preferences.notificationPrefs;
    const next = { ...previous, [key]: enabled };
    const ok = settingsService.savePreferences({ notificationPrefs: next });
    if (!ok || !user?.userId) {
      setSaveStatus('error');
      setLastFailed(() => () => onNotificationPref(key, enabled));
      return;
    }
    setPreferences((prev) => ({ ...prev, notificationPrefs: next }));
    void accountService.saveNotificationPrefs(user.userId, next).then((synced) => {
      if (!synced) {
        settingsService.savePreferences({ notificationPrefs: previous });
        setPreferences((prev) => ({ ...prev, notificationPrefs: previous }));
        setSaveStatus('error');
        setLastFailed(() => () => onNotificationPref(key, enabled));
        return;
      }
      setLastFailed(null);
      flashSaved();
    });
  };

  const onFontScale = (scale: FontScale) => {
    try {
      setFontScale(scale);
      setLastFailed(null);
      flashSaved();
    } catch {
      setSaveStatus('error');
      setLastFailed(() => () => onFontScale(scale));
    }
  };

  const onLargeControls = (enabled: boolean) => {
    try {
      setLargeControls(enabled);
      setLastFailed(null);
      flashSaved();
    } catch {
      setSaveStatus('error');
      setLastFailed(() => () => onLargeControls(enabled));
    }
  };

  const onEasyUsePreset = () => {
    try {
      applyEasyUsePreset();
      setLastFailed(null);
      flashSaved();
    } catch {
      setSaveStatus('error');
      setLastFailed(() => onEasyUsePreset);
    }
  };

  const onResetComfort = () => {
    try {
      resetComfortDefaults();
      setLastFailed(null);
      flashSaved();
    } catch {
      setSaveStatus('error');
      setLastFailed(() => onResetComfort);
    }
  };

  const themeIcon = (value: Theme) => {
    switch (value) {
      case 'system':
        return <Monitor size={18} aria-hidden />;
      case 'dark':
        return <Moon size={18} aria-hidden />;
      default:
        return <Sun size={18} aria-hidden />;
    }
  };

  const dateFormatLabel = (value: string) => {
    if (value === 'medium') {
      return formatDate(SAMPLE_DATE, { locale, dateFormat: 'medium' });
    }
    return formatDate(SAMPLE_DATE, { locale, dateFormat: value });
  };

  const handleResetDemo = () => {
    const ok = window.confirm(t('demo.resetConfirm'));
    if (!ok) return;
    demoStore.reset();
    window.location.reload();
  };

  const startView = (START_VIEWS.includes(preferences.defaultView as DefaultView)
    ? preferences.defaultView
    : 'chronologio') as DefaultView;

  const fieldsLabel = t('nav:items.fields');

  return (
    <PageContainer>
      <div className="settings-page">
        <Breadcrumbs />

        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <div
          className={`settings-status ${saveStatus !== 'idle' ? 'settings-status-visible' : ''}`}
          role="status"
          aria-live="polite"
        >
          {saveStatus === 'saved' ? (
            <span className="settings-status-saved">
              <Check size={16} aria-hidden /> {t('saved')}
            </span>
          ) : null}
          {saveStatus === 'error' ? (
            <span className="settings-status-error">
              {t('saveError')}{' '}
              {lastFailed ? (
                <button type="button" className="settings-retry" onClick={() => lastFailed()}>
                  {t('retry')}
                </button>
              ) : null}
            </span>
          ) : null}
        </div>

        <div className="settings-column">
          <AccountSettings />

          <section className="settings-block" aria-labelledby="settings-notifications">
            <h2 id="settings-notifications" className="settings-block-title">
              {t('sections.notifications')}
            </h2>
            <p className="settings-help settings-help--block">
              {t(isMockMode() ? 'notifications.accountHintDemo' : 'notifications.accountHint')}
            </p>
            {NOTIFICATION_PREF_KEYS.map((key) => (
              <div key={key} className="settings-row settings-row-toggle">
                <div className="settings-row-text">
                  <label className="settings-label" htmlFor={`settings-notif-${key}`}>
                    {t(`notifications.prefs.${key}`)}
                  </label>
                  <p className="settings-help">{t(`notifications.prefsHints.${key}`)}</p>
                </div>
                <button
                  id={`settings-notif-${key}`}
                  type="button"
                  role="switch"
                  aria-checked={preferences.notificationPrefs[key]}
                  className={`settings-switch ${preferences.notificationPrefs[key] ? 'is-on' : ''}`}
                  onClick={() => onNotificationPref(key, !preferences.notificationPrefs[key])}
                >
                  <span className="settings-switch-knob" />
                </button>
              </div>
            ))}
          </section>

          <section className="settings-block" aria-labelledby="settings-appearance">
            <h2 id="settings-appearance" className="settings-block-title">
              {t('sections.appearance')}
            </h2>

            <div className="settings-row">
              <div className="settings-row-text">
                <label className="settings-label">{t('appearance.theme')}</label>
                <p className="settings-help">{t(`appearance.themeHints.${theme}`)}</p>
              </div>
              <div className="settings-segment" role="group" aria-label={t('appearance.theme')}>
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`settings-segment-btn ${theme === option ? 'is-active' : ''}`}
                    onClick={() => onTheme(option)}
                    aria-pressed={theme === option}
                  >
                    {themeIcon(option)}
                    <span>{t(`appearance.themes.${option}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <label className="settings-label" htmlFor="settings-font-scale">
                  {t('appearance.fontScale')}
                </label>
              </div>
              <select
                id="settings-font-scale"
                className="settings-select"
                value={fontScale}
                onChange={(e) => onFontScale(e.target.value as FontScale)}
              >
                <option value="default">{t('appearance.fontScales.default')}</option>
                <option value="large">{t('appearance.fontScales.large')}</option>
                <option value="xl">{t('appearance.fontScales.xl')}</option>
              </select>
            </div>

            <div className="settings-row settings-row-toggle">
              <div className="settings-row-text">
                <label className="settings-label" htmlFor="settings-large-controls">
                  {t('appearance.largeControls')}
                </label>
                <p className="settings-help">{t('appearance.largeControlsDesc')}</p>
              </div>
              <button
                id="settings-large-controls"
                type="button"
                role="switch"
                aria-checked={largeControls}
                className={`settings-switch ${largeControls ? 'is-on' : ''}`}
                onClick={() => onLargeControls(!largeControls)}
              >
                <span className="settings-switch-knob" />
              </button>
            </div>

            <div className="settings-comfort-presets">
              <div className="settings-row-text">
                <p className="settings-label">{t('appearance.easyUsePreset')}</p>
                <p className="settings-help">{t('appearance.easyUsePresetDesc')}</p>
                <p className="settings-help settings-help--preview">{t('appearance.livePreviewNote')}</p>
              </div>
              <div className="settings-preset-actions">
                <Button type="button" variant="primary" size="md" onClick={onEasyUsePreset}>
                  {t('appearance.easyUseApply')}
                </Button>
                <Button type="button" variant="outline" size="md" onClick={onResetComfort}>
                  {t('appearance.resetDefaults')}
                </Button>
              </div>
            </div>
          </section>

          <section className="settings-block" aria-labelledby="settings-locale">
            <h2 id="settings-locale" className="settings-block-title">
              {t('sections.locale')}
            </h2>

            <div className="settings-row">
              <div className="settings-row-text">
                <label className="settings-label">{t('locale.language')}</label>
              </div>
              <div className="settings-segment" role="group" aria-label={t('locale.language')}>
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`settings-segment-btn ${locale === lang.code ? 'is-active' : ''}`}
                    onClick={() => onLanguage(lang.code)}
                    aria-pressed={locale === lang.code}
                  >
                    <span>{lang.nativeLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <label className="settings-label" htmlFor="settings-date-format">
                  {t('locale.dateFormat')}
                </label>
              </div>
              <select
                id="settings-date-format"
                className="settings-select"
                value={
                  DATE_FORMAT_VALUES.includes(preferences.dateFormat as (typeof DATE_FORMAT_VALUES)[number])
                    ? preferences.dateFormat
                    : 'dd/MM/yyyy'
                }
                onChange={(e) => onDateFormat(e.target.value)}
              >
                {DATE_FORMAT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {dateFormatLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="settings-block" aria-labelledby="settings-startup">
            <h2 id="settings-startup" className="settings-block-title">
              {t('sections.startup')}
            </h2>
            <div className="settings-row">
              <div className="settings-row-text">
                <label className="settings-label" htmlFor="settings-start-page">
                  {t('startup.label')}
                </label>
              </div>
              <select
                id="settings-start-page"
                className="settings-select"
                value={startView}
                onChange={(e) => onDefaultView(e.target.value as DefaultView)}
              >
                {START_VIEWS.map((view) => (
                  <option key={view} value={view}>
                    {view === 'fields' ? fieldsLabel : t(`startup.options.${view}`)}
                  </option>
                ))}
              </select>
            </div>
            <p className="settings-autosave-hint">{t('autosaveHint')}</p>
            {user?.role === 'FieldOwner' || !user?.role ? (
              <div className="settings-row" style={{ marginTop: 12 }}>
                <div className="settings-row-text">
                  <p className="settings-label">{t('onboarding:settings.showTips')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => activation?.reopen()}
                >
                  {t('onboarding:settings.showTips')}
                </Button>
              </div>
            ) : null}
          </section>

          <DataRightsSettings />

          <section className="settings-block" aria-labelledby="settings-sessions">
            <h2 id="settings-sessions" className="settings-block-title">
              {t('sections.sessions')}
            </h2>
            <div className="settings-session-card">
              <div>
                <p className="settings-label">{t('sessions.thisDevice')}</p>
                <p className="settings-help">{t('sessions.thisDeviceHint')}</p>
              </div>
              <Button type="button" variant="outline" size="md" onClick={logout}>
                {t('common:logout')}
              </Button>
            </div>
          </section>

          {isMockMode() ? (
            <section className="settings-block" aria-labelledby="settings-demo">
              <h2 id="settings-demo" className="settings-block-title">
                {t('sections.demo')}
              </h2>
              <p className="settings-help">{t('demo.description')}</p>
              <Button variant="warning" onClick={handleResetDemo}>
                {t('demo.resetButton')}
              </Button>
            </section>
          ) : null}

          <section className="settings-block settings-tech">
            <button
              type="button"
              className="settings-tech-toggle"
              aria-expanded={techOpen}
              onClick={() => setTechOpen((v) => !v)}
            >
              <span>{t('sections.technical')}</span>
              <ChevronDown size={18} className={techOpen ? 'is-open' : ''} aria-hidden />
            </button>
            {techOpen ? (
              <div className="settings-tech-body">
                <p className="settings-help">{t('technical.purpose')}</p>
                <div className="settings-tech-row">
                  <span>{t('account.appVersion')}</span>
                  <code>{APP_VERSION}</code>
                </div>
                <p className="settings-help">{t('technical.supportHint')}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
