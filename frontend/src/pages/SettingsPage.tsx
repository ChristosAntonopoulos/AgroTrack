import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleProvider';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { settingsService, UserPreferences, Theme } from '../services/settingsService';
import { isMockMode } from '../services/serviceFactory';
import { demoStore } from '../services/demo/demoStore';
import { SUPPORTED_LOCALES, SupportedLocale } from '../i18n/config';
import type { FontScale } from '../experience/types';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import ExperienceModeToggle from '../components/Experience/ExperienceModeToggle';
import { Save, User, Bell, Droplet, Globe, Sun, Moon, Circle, Type } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setLocale } = useLocale();
  const { fontScale, setFontScale, largeControls, setLargeControls } = useExperienceMode();
  const [preferences, setPreferences] = useState<UserPreferences>(settingsService.getPreferences());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = settingsService.getPreferences();
    setPreferences(prefs);
    if (prefs.theme !== theme) {
      setTheme(prefs.theme as Theme);
    }
  }, []);

  const handlePreferenceChange = (key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setSaved(false);

    if (key === 'theme') {
      setTheme(value as Theme);
    }

    if (key === 'language') {
      setLocale(value as SupportedLocale);
    }
  };

  const handleSave = () => {
    setSaving(true);
    settingsService.savePreferences(preferences);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getThemeIcon = (themeValue: Theme) => {
    switch (themeValue) {
      case 'light':
        return <Sun size={18} />;
      case 'dark':
        return <Moon size={18} />;
      case 'white':
        return <Circle size={18} />;
      default:
        return <Sun size={18} />;
    }
  };

  const handleResetDemo = () => {
    const ok = window.confirm(t('demo.resetConfirm'));
    if (!ok) return;
    demoStore.reset();
    window.location.reload();
  };

  return (
    <PageContainer>
      <div className="settings-page">
        <Breadcrumbs />

        <div className="settings-header">
          <h1>{t('title')}</h1>
        </div>

        <div className="settings-content">
          <Card className="settings-section">
            <div className="section-header">
              <User />
              <h2>{t('profile.title')}</h2>
            </div>
            <div className="section-content">
              <div className="profile-info">
                <div className="info-item">
                  <label>{t('profile.email')}</label>
                  <span>{user?.email}</span>
                </div>
                <div className="info-item">
                  <label>{t('profile.role')}</label>
                  <span>{user?.role}</span>
                </div>
                <div className="info-item">
                  <label>{t('profile.userId')}</label>
                  <span>{user?.userId}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="settings-section">
            <div className="section-header">
              <Droplet />
              <h2>{t('preferences.title')}</h2>
            </div>
            <div className="section-content">
              <div className="preference-item">
                <label>{t('preferences.theme')}</label>
                <div className="theme-selector">
                  {(['light', 'dark', 'white'] as Theme[]).map((themeOption) => (
                    <button
                      key={themeOption}
                      type="button"
                      className={`theme-option ${preferences.theme === themeOption ? 'active' : ''}`}
                      onClick={() => handlePreferenceChange('theme', themeOption)}
                      title={t(`preferences.themes.${themeOption}`)}
                    >
                      {getThemeIcon(themeOption)}
                      <span>{t(`preferences.themes.${themeOption}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="preference-item">
                <label>{t('preferences.dateFormat')}</label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                >
                  <option value="MM/dd/yyyy">{t('preferences.dateFormats.MM/dd/yyyy')}</option>
                  <option value="dd/MM/yyyy">{t('preferences.dateFormats.dd/MM/yyyy')}</option>
                  <option value="yyyy-MM-dd">{t('preferences.dateFormats.yyyy-MM-dd')}</option>
                </select>
              </div>

              <div className="preference-item">
                <label>{t('preferences.defaultView')}</label>
                <select
                  value={preferences.defaultView}
                  onChange={(e) => handlePreferenceChange('defaultView', e.target.value)}
                >
                  <option value="dashboard">{t('preferences.defaultViews.dashboard')}</option>
                  <option value="fields">{t('preferences.defaultViews.fields')}</option>
                  <option value="tasks">{t('preferences.defaultViews.tasks')}</option>
                  <option value="calendar">{t('preferences.defaultViews.calendar')}</option>
                </select>
              </div>

              <div className="preference-item">
                <label>{t('preferences.language')}</label>
                <select
                  value={preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                >
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.nativeLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="preference-item">
                <label>{t('experience.label')}</label>
                <ExperienceModeToggle />
              </div>

              <div className="preference-item">
                <label htmlFor="settings-font-scale">
                  <Type size={16} aria-hidden /> {t('preferences.fontScale')}
                </label>
                <select
                  id="settings-font-scale"
                  value={fontScale}
                  onChange={(e) => setFontScale(e.target.value as FontScale)}
                >
                  <option value="default">{t('preferences.fontScales.default')}</option>
                  <option value="large">{t('preferences.fontScales.large')}</option>
                  <option value="xl">{t('preferences.fontScales.xl')}</option>
                </select>
              </div>

              <div className="preference-item">
                <label>
                  <input
                    type="checkbox"
                    checked={largeControls}
                    onChange={(e) => setLargeControls(e.target.checked)}
                  />
                  <span>{t('preferences.largeControls')}</span>
                </label>
              </div>
            </div>
          </Card>

          <Card className="settings-section">
            <div className="section-header">
              <Bell />
              <h2>{t('notifications.title')}</h2>
            </div>
            <div className="section-content">
              <div className="notification-item">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  />
                  <span>{t('notifications.email')}</span>
                </label>
              </div>

              <div className="notification-item">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.taskAssignmentNotifications}
                    onChange={(e) =>
                      handlePreferenceChange('taskAssignmentNotifications', e.target.checked)
                    }
                  />
                  <span>{t('notifications.taskAssignment')}</span>
                </label>
              </div>

              <div className="notification-item">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.deadlineReminders}
                    onChange={(e) => handlePreferenceChange('deadlineReminders', e.target.checked)}
                  />
                  <span>{t('notifications.deadline')}</span>
                </label>
              </div>

              <div className="notification-item">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.lifecycleAlerts}
                    onChange={(e) => handlePreferenceChange('lifecycleAlerts', e.target.checked)}
                  />
                  <span>{t('notifications.lifecycle')}</span>
                </label>
              </div>

              <div className="notification-item">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.reportNotifications}
                    onChange={(e) => handlePreferenceChange('reportNotifications', e.target.checked)}
                  />
                  <span>{t('notifications.report')}</span>
                </label>
              </div>
            </div>
          </Card>

          {isMockMode() ? (
            <Card className="settings-section">
              <div className="section-header">
                <Globe />
                <h2>{t('demo.title')}</h2>
              </div>
              <div className="section-content">
                <p style={{ marginTop: 0, color: 'var(--color-text-secondary)' }}>
                  {t('demo.description')}
                </p>
                <Button variant="warning" onClick={handleResetDemo}>
                  {t('demo.resetButton')}
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="settings-actions">
            <Button onClick={handleSave} disabled={saving} loading={saving} icon={<Save />}>
              {t('saveButton')}
            </Button>
            {saved && <span className="saved-message">{t('saved')}</span>}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
