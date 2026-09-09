import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleProvider';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { roleHomePath, AppRole } from '../navigation/navConfig';
import { settingsService } from '../services/settingsService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { SUPPORTED_LOCALES, SupportedLocale } from '../i18n/config';
import RegisterHero from '../components/Auth/RegisterHero';
import BrandLogo from '../components/Common/BrandLogo';
import Button from '../components/Common/Button';
import {
  Shield,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import './LoginPage.css';
import './RegisterPage.css';

const MIN_PASSWORD_LENGTH = 8;

const RegisterPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors', 'settings']);
  const { locale, setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const bilingualLocales = SUPPORTED_LOCALES.filter((l) => l.code === 'en' || l.code === 'el');

  const handleThemeToggle = () => {
    setTheme(isDarkTheme ? 'light' : 'dark');
  };

  const navigateAfterRegister = (userRole: string) => {
    const prefs = settingsService.getPreferences();
    navigate(roleHomePath(userRole as AppRole, prefs.experienceModeChosen ? prefs.experienceMode : undefined));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError(t('auth:register.missingFields'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth:register.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth:register.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      const stored = authService.getStoredUser();
      navigateAfterRegister(stored?.role || 'FieldOwner');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:register.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page register-page${isDarkTheme ? ' login-page--dark' : ' login-page--light'}`}>
      <div className="login-page-bg register-page-bg" aria-hidden="true" />

      <div className="login-page-layout register-page-layout">
        <section className="login-page-panel">
          <div className="login-panel-top">
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

          <div className="login-card">
            <div className="login-card-brand">
              <BrandLogo
                className="login-card-lockup"
                variant="stacked"
                tone={isDarkTheme ? 'on-dark' : 'on-light'}
                size="md"
                alt={t('auth:login.appName')}
              />
              <h1>{t('auth:register.title')}</h1>
              <p className="login-card-subtitle">{t('auth:register.subtitle')}</p>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="register-name-row">
                <div className="login-field">
                  <label htmlFor="firstName">{t('auth:register.firstName')}</label>
                  <div className="login-input-wrap">
                    <User size={18} className="login-input-icon" aria-hidden />
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('auth:register.firstNamePlaceholder')}
                      autoComplete="given-name"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="lastName">{t('auth:register.lastName')}</label>
                  <div className="login-input-wrap">
                    <User size={18} className="login-input-icon" aria-hidden />
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('auth:register.lastNamePlaceholder')}
                      autoComplete="family-name"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

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
                <label htmlFor="password">{t('common:password')}</label>
                <div className="login-input-wrap">
                  <Lock size={18} className="login-input-icon" aria-hidden />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth:register.passwordPlaceholder')}
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
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
                <p className="register-hint">{t('auth:register.passwordHint')}</p>
              </div>

              <div className="login-field">
                <label htmlFor="confirmPassword">{t('auth:register.confirmPassword')}</label>
                <div className="login-input-wrap">
                  <Lock size={18} className="login-input-icon" aria-hidden />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth:register.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} loading={loading} fullWidth className="login-submit">
                {t('auth:register.button')}
              </Button>
            </form>

            <p className="login-register">
              {t('auth:register.hasAccount')}{' '}
              <Link to="/login">{t('auth:register.loginLink')}</Link>
            </p>
          </div>

          <p className="login-security">
            <Shield size={14} aria-hidden />
            {t('auth:login.securityNote')}
          </p>
        </section>

        <section className="login-page-hero" aria-label={t('auth:register.heroTitle')}>
          <RegisterHero />
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
