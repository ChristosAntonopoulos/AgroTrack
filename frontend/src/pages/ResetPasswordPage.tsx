import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { authService } from '../services/authService';
import { mockAuthService } from '../services/mock/mockAuthService';
import { isMockDataEnabled } from '../config/apiConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import Button from '../components/Common/Button';

const MIN_PASSWORD_LENGTH = 8;

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : t('auth:reset.missingToken'));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t('auth:reset.missingToken'));
      return;
    }
    if (!password || !confirmPassword) {
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
      const service = isMockDataEnabled() ? mockAuthService : authService;
      await service.resetPassword({ token, password });
      navigate('/login?reset=1', { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:reset.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-card-heading">
        <h1>{t('auth:reset.title')}</h1>
        <p className="login-card-subtitle">{t('auth:reset.subtitle')}</p>
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="password">{t('auth:reset.passwordLabel')}</label>
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
              disabled={loading || !token}
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
          <p className="login-hint">{t('auth:register.passwordHint')}</p>
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
              disabled={loading || !token}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !token}
          loading={loading}
          fullWidth
          className="login-submit"
        >
          {t('auth:reset.button')}
        </Button>
      </form>

      <p className="login-register">
        <Link to="/forgot-password">{t('auth:reset.requestNewLink')}</Link>
        {' · '}
        <Link to="/login">{t('auth:forgot.backToLogin')}</Link>
      </p>
    </>
  );
};

export default ResetPasswordPage;
