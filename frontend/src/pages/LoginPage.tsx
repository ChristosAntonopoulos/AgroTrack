import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleProvider';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { demoAccounts } from '../services/demoAccounts';
import { showDemoLogin } from '../config/apiConfig';
import { roleHomePath, AppRole } from '../navigation/navConfig';
import { settingsService } from '../services/settingsService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { SUPPORTED_LOCALES, SupportedLocale } from '../i18n/config';
import LoginHero from '../components/Auth/LoginHero';
import BrandLogo from '../components/Common/BrandLogo';
import Button from '../components/Common/Button';
import {
  Shield,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import './LoginPage.css';

const SUPPORT_EMAIL = 'hello@oleachron.app';

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors', 'settings']);
  const { locale, setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const navigateAfterLogin = (role: string) => {
    const prefs = settingsService.getPreferences();
    navigate(roleHomePath(role as AppRole, prefs.experienceModeChosen ? prefs.experienceMode : undefined));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth:login.missingFields'));
      return;
    }
    setLoading(true);

    try {
      await login(email, password);
      const stored = authService.getStoredUser();
      navigateAfterLogin(stored?.role || 'FieldOwner');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoUser: (typeof demoAccounts)[0]) => {
    setError(null);
    setLoading(true);
    setEmail(demoUser.email);
    setPassword(demoUser.password);

    try {
      await login(demoUser.email, demoUser.password);
      const stored = authService.getStoredUser();
      navigateAfterLogin(stored?.role || demoUser.role);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const showQuickLogin = showDemoLogin();
  const bilingualLocales = SUPPORTED_LOCALES.filter((l) => l.code === 'en' || l.code === 'el');

  const handleThemeToggle = () => {
    setTheme(isDarkTheme ? 'light' : 'dark');
  };

  return (
    <div className={`login-page${isDarkTheme ? ' login-page--dark' : ' login-page--light'}`}>
      <div className="login-page-bg" aria-hidden="true" />

      <div className="login-page-chrome" aria-label={t('common:language', { defaultValue: 'Language' })}>
        <button
          type="button"
          className="login-theme-toggle"
          onClick={handleThemeToggle}
          aria-label={
            isDarkTheme
              ? t('settings:preferences.themes.light')
              : t('settings:preferences.themes.dark')
          }
          title={
            isDarkTheme
              ? t('settings:preferences.themes.light')
              : t('settings:preferences.themes.dark')
          }
        >
          {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
          <span>
            {isDarkTheme
              ? t('settings:preferences.themes.light')
              : t('settings:preferences.themes.dark')}
          </span>
        </button>

        <div className="login-lang-switch" role="group" aria-label={t('common:language', { defaultValue: 'Language' })}>
          <Globe size={14} aria-hidden />
          {bilingualLocales.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={locale === lang.code ? 'active' : ''}
              onClick={() => setLocale(lang.code as SupportedLocale)}
              aria-pressed={locale === lang.code}
            >
              {lang.nativeLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="login-page-layout">
        <section className="login-page-hero" aria-label={t('auth:login.platformTagline')}>
          <LoginHero />
        </section>

        <section className="login-page-panel">
          <div className="login-card">
            <div className="login-card-brand">
              <div className="login-card-lockup">
                <BrandLogo
                  variant="mark"
                  tone={isDarkTheme ? 'on-dark' : 'on-light'}
                  size="xl"
                  alt=""
                />
                <span className="login-card-wordmark">{t('auth:login.appName')}</span>
              </div>
              <p className="login-card-motto">{t('auth:login.platformTagline')}</p>
              <h1>{t('auth:login.title')}</h1>
              <p className="login-card-subtitle">{t('auth:login.subtitle')}</p>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            {showQuickLogin && (
              <div className="login-demo">
                <h2>{t('auth:login.demoTitle')}</h2>
                <p>{t('auth:login.demoHint')}</p>
                <div className="login-demo-buttons">
                  {demoAccounts.map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      className="login-demo-btn"
                      onClick={() => handleQuickLogin(user)}
                      disabled={loading}
                    >
                      <span className="login-demo-icon"><User size={16} /></span>
                      <span className="login-demo-text">
                        <strong>{t(`auth:${user.nameKey}`)}</strong>
                        <small>{t(`auth:${user.subtitleKey}`)}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="login-divider">
                  <span>{t('common:or')}</span>
                </div>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="email">{t('common:email')}</label>
                <div className="login-input-wrap">
                  <Mail size={18} className="login-input-icon" aria-hidden />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth:login.emailPlaceholder')}
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-field-row">
                  <label htmlFor="password">{t('auth:login.passwordLabel')}</label>
                  <a
                    className="login-forgot"
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('auth:login.forgotPassword'))}`}
                  >
                    {t('auth:login.forgotPassword')}
                  </a>
                </div>
                <div className="login-input-wrap">
                  <Lock size={18} className="login-input-icon" aria-hidden />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth:login.passwordPlaceholder')}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} loading={loading} fullWidth className="login-submit">
                {t('auth:login.button')}
              </Button>
            </form>

            <p className="login-register">
              {t('auth:login.noAccount')}{' '}
              <Link to="/register">{t('auth:login.registerLink')}</Link>
            </p>
          </div>

          <p className="login-security">
            <Shield size={14} aria-hidden />
            {t('auth:login.securityNote')}
          </p>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
