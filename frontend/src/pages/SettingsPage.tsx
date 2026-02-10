import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { settingsService, UserPreferences, Theme } from '../services/settingsService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import { Save, User, Bell, Droplet, Globe, Sun, Moon, Circle } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(settingsService.getPreferences());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = settingsService.getPreferences();
    setPreferences(prefs);
    // Sync theme context with preferences
    if (prefs.theme !== theme) {
      setTheme(prefs.theme as Theme);
    }
  }, []);

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    
    // Apply theme immediately if changed
    if (key === 'theme') {
      setTheme(value as Theme);
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

  return (
    <PageContainer>
      <div className="settings-page">
        <Breadcrumbs />
        
        <div className="settings-header">
          <h1>Settings</h1>
        </div>

        <div className="settings-content">
          <Card className="settings-section">
          <div className="section-header">
            <User />
            <h2>Profile</h2>
          </div>
          <div className="section-content">
            <div className="profile-info">
              <div className="info-item">
                <label>Email</label>
                <span>{user?.email}</span>
              </div>
              <div className="info-item">
                <label>Role</label>
                <span>{user?.role}</span>
              </div>
              <div className="info-item">
                <label>User ID</label>
                <span>{user?.userId}</span>
              </div>
            </div>
          </div>
          </Card>

          <Card className="settings-section">
            <div className="section-header">
              <Droplet />
              <h2>Preferences</h2>
            </div>
            <div className="section-content">
            <div className="preference-item">
              <label>Theme</label>
              <div className="theme-selector">
                {(['light', 'dark', 'white'] as Theme[]).map((themeOption) => (
                  <button
                    key={themeOption}
                    type="button"
                    className={`theme-option ${preferences.theme === themeOption ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('theme', themeOption)}
                    title={themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                  >
                    {getThemeIcon(themeOption)}
                    <span>{themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="preference-item">
              <label>Date Format</label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
              >
                <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                <option value="yyyy-MM-dd">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="preference-item">
              <label>Default View</label>
              <select
                value={preferences.defaultView}
                onChange={(e) => handlePreferenceChange('defaultView', e.target.value)}
              >
                <option value="dashboard">Dashboard</option>
                <option value="fields">Fields</option>
                <option value="tasks">Tasks</option>
                <option value="calendar">Calendar</option>
              </select>
            </div>

            <div className="preference-item">
              <label>Language</label>
              <select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
          </Card>

          <Card className="settings-section">
            <div className="section-header">
              <Bell />
              <h2>Notifications</h2>
            </div>
            <div className="section-content">
            <div className="notification-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                />
                <span>Email Notifications</span>
              </label>
            </div>

            <div className="notification-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.taskAssignmentNotifications}
                  onChange={(e) => handlePreferenceChange('taskAssignmentNotifications', e.target.checked)}
                />
                <span>Task Assignment Notifications</span>
              </label>
            </div>

            <div className="notification-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.deadlineReminders}
                  onChange={(e) => handlePreferenceChange('deadlineReminders', e.target.checked)}
                />
                <span>Deadline Reminders</span>
              </label>
            </div>

            <div className="notification-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.lifecycleAlerts}
                  onChange={(e) => handlePreferenceChange('lifecycleAlerts', e.target.checked)}
                />
                <span>Lifecycle Progression Alerts</span>
              </label>
            </div>

            <div className="notification-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.reportNotifications}
                  onChange={(e) => handlePreferenceChange('reportNotifications', e.target.checked)}
                />
                <span>Report Generation Notifications</span>
              </label>
            </div>
          </div>
          </Card>

          <div className="settings-actions">
            <Button
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              icon={<Save />}
            >
              Save Preferences
            </Button>
            {saved && <span className="saved-message">Preferences saved!</span>}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
