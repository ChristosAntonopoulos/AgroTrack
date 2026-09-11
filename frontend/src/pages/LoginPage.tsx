import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { demoAccounts } from '../services/demoAccounts';
import { showDemoLogin } from '../config/apiConfig';
import { roleHomePath, AppRole } from '../navigation/navConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import LoginDemoPicker from '../components/Auth/LoginDemoPicker';
import Button from '../components/Common/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const safeNextPath = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : null;

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const redirectTo = safeNextPath(searchParams.get('redirect'));
  const passwordReset = searchParams.get('reset') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const navigateAfterLogin = (role: string) => {
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }
    navigate(roleHomePath(role as AppRole));
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

  return (
    <>
      <div className="login-card-heading">
        <h1>{t('auth:login.title')}</h1>
        <p className="login-card-subtitle">{t('auth:login.subtitle')}</p>
        <p className="login-card-motto">{t('auth:login.motto')}</p>
      </div>

      {passwordReset && !error && (
        <div className="login-success" role="status">
          {t('auth:login.resetSuccess')}
        </div>
      )}

      {error && (
        <div className="login-error" role="alert">
          {error}
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
            <Link
              className="login-forgot"
              to="/forgot-password"
            >
              {t('auth:login.forgotPassword')}
            </Link>
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
        <Link
          to={
            redirectTo
              ? `/register?redirect=${encodeURIComponent(redirectTo)}`
              : '/register'
          }
        >
          {t('auth:login.registerLink')}
        </Link>
      </p>

      {showQuickLogin && (
        <LoginDemoPicker loading={loading} onSelect={handleQuickLogin} />
      )}
    </>
  );
};

export default LoginPage;
