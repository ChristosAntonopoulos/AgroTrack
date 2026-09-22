import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { demoAccounts } from '../services/demoAccounts';
import { showDemoLogin } from '../config/apiConfig';
import { AppRole } from '../navigation/navConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolvePostAuthPath } from '../utils/firstGroveDestination';
import LoginDemoPicker from '../components/Auth/LoginDemoPicker';
import Button from '../components/Common/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

type FieldKey = 'email' | 'password';

const safeNextPath = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : null;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const redirectTo = safeNextPath(searchParams.get('redirect'));
  const passwordReset = searchParams.get('reset') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const summaryRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const navigateAfterLogin = async (role: string) => {
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }
    const next = await resolvePostAuthPath((role || 'FieldOwner') as AppRole);
    navigate(next);
  };

  const focusErrors = (errors: Partial<Record<FieldKey, string>>) => {
    void errors;
    requestAnimationFrame(() => {
      summaryRef.current?.focus();
    });
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!email.trim()) next.email = t('auth:login.emailRequired');
    else if (!isValidEmail(email)) next.email = t('auth:login.emailInvalid');
    if (!password) next.password = t('auth:login.passwordRequired');
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusErrors(errors);
      return;
    }
    setLoading(true);

    try {
      await login(email, password);
      const stored = authService.getStoredUser();
      await navigateAfterLogin(stored?.role || 'FieldOwner');
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, t) || t('auth:login.failed'));
      setFieldErrors({});
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoUser: (typeof demoAccounts)[0]) => {
    setFormError(null);
    setFieldErrors({});
    setLoading(true);
    setEmail(demoUser.email);
    setPassword(demoUser.password);

    try {
      await login(demoUser.email, demoUser.password);
      const stored = authService.getStoredUser();
      await navigateAfterLogin(stored?.role || demoUser.role);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, t) || t('auth:login.failed'));
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  const showQuickLogin = showDemoLogin();
  const errorEntries = (['email', 'password'] as FieldKey[])
    .filter((key) => fieldErrors[key])
    .map((key) => ({ key, message: fieldErrors[key] as string }));
  const summaryMessage =
    formError ||
    (errorEntries.length > 1
      ? t('auth:login.errorSummary', { count: errorEntries.length })
      : errorEntries[0]?.message || null);

  const fieldClass = (key: FieldKey) => `login-field${fieldErrors[key] ? ' has-error' : ''}`;

  return (
    <>
      <div className="login-card-heading">
        <h1>{t('auth:login.title')}</h1>
        <p className="login-card-subtitle">{t('auth:login.subtitle')}</p>
        <p className="login-card-motto">{t('auth:login.motto')}</p>
      </div>

      {passwordReset && !summaryMessage && (
        <div className="login-success" role="status">
          {t('auth:login.resetSuccess')}
        </div>
      )}

      {summaryMessage ? (
        <div
          ref={summaryRef}
          className="login-error"
          role="alert"
          tabIndex={-1}
          aria-live="assertive"
        >
          {formError ? (
            formError
          ) : errorEntries.length > 1 ? (
            <>
              <p className="login-error-summary-title">{summaryMessage}</p>
              <ul className="login-error-summary-list">
                {errorEntries.map(({ key, message }) => (
                  <li key={key}>
                    <button
                      type="button"
                      className="login-error-summary-link"
                      onClick={() =>
                        (key === 'email' ? emailRef : passwordRef).current?.focus()
                      }
                    >
                      {message}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            summaryMessage
          )}
        </div>
      ) : null}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className={fieldClass('email')}>
          <label htmlFor="email">{t('common:email')}</label>
          <div className="login-input-wrap">
            <Mail size={18} className="login-input-icon" aria-hidden />
            <input
              ref={emailRef}
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth:login.emailPlaceholder')}
              autoComplete="email"
              required
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
          </div>
          {fieldErrors.email ? (
            <p id="login-email-error" className="login-field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className={fieldClass('password')}>
          <div className="login-field-row">
            <label htmlFor="password">{t('auth:login.passwordLabel')}</label>
            <Link className="login-forgot" to="/forgot-password">
              {t('auth:login.forgotPassword')}
            </Link>
          </div>
          <div className="login-input-wrap">
            <Lock size={18} className="login-input-icon" aria-hidden />
            <input
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth:login.passwordPlaceholder')}
              autoComplete="current-password"
              required
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
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
          {fieldErrors.password ? (
            <p id="login-password-error" className="login-field-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
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
        <>
          <LoginDemoPicker loading={loading} onSelect={handleQuickLogin} />
          <p className="login-demo-note">{t('auth:login.demoDataNote')}</p>
        </>
      )}

      <p className="login-legal">
        <Link to="/privacy">{t('auth:login.privacy')}</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/terms">{t('auth:login.terms')}</Link>
      </p>
    </>
  );
};

export default LoginPage;
