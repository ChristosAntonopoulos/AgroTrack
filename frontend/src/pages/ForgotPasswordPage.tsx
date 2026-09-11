import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { authService } from '../services/authService';
import { mockAuthService } from '../services/mock/mockAuthService';
import { isMockDataEnabled } from '../config/apiConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import Button from '../components/Common/Button';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t('auth:forgot.missingEmail'));
      return;
    }

    setLoading(true);
    try {
      const service = isMockDataEnabled() ? mockAuthService : authService;
      const response = await service.forgotPassword({ email: email.trim() });
      setSent(true);
      setDevResetToken(response.devResetToken || null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:forgot.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-card-heading">
        <h1>{t('auth:forgot.title')}</h1>
        <p className="login-card-subtitle">{t('auth:forgot.subtitle')}</p>
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      {sent ? (
        <>
          <div className="login-success" role="status">
            {t('auth:forgot.sent')}
          </div>
          {devResetToken && (
            <p className="login-dev-hint">
              {t('auth:forgot.localLinkHint')}
              <Link className="login-dev-link" to={`/reset-password?token=${encodeURIComponent(devResetToken)}`}>
                {t('auth:forgot.localLink')}
              </Link>
            </p>
          )}
        </>
      ) : (
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

          <Button type="submit" disabled={loading} loading={loading} fullWidth className="login-submit">
            {t('auth:forgot.button')}
          </Button>
        </form>
      )}

      <p className="login-register">
        <Link to="/login">{t('auth:forgot.backToLogin')}</Link>
      </p>
    </>
  );
};

export default ForgotPasswordPage;
