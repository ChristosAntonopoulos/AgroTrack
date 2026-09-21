import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { AppRole } from '../navigation/navConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolvePostAuthPath } from '../utils/firstGroveDestination';
import AuthSocialButtons from '../components/Auth/AuthSocialButtons';
import Button from '../components/Common/Button';
import { Mail, Lock, User, Eye, EyeOff, Ticket } from 'lucide-react';
import './RegisterPage.css';

const MIN_PASSWORD_LENGTH = 8;

type FieldKey = 'displayName' | 'email' | 'password' | 'confirmPassword' | 'inviteCode';

const safeNextPath = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : null;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const RegisterPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const inviteFromQuery = searchParams.get('code') || '';
  const redirectTo = safeNextPath(searchParams.get('redirect'));
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteFromQuery);
  const [showInvite, setShowInvite] = useState(Boolean(inviteFromQuery));
  const [showEmailForm, setShowEmailForm] = useState(Boolean(inviteFromQuery || redirectTo));
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const inviteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inviteFromQuery) setInviteCode(inviteFromQuery);
  }, [inviteFromQuery]);

  const focusFirst = (errors: Partial<Record<FieldKey, string>>) => {
    const order: FieldKey[] = ['displayName', 'email', 'password', 'confirmPassword', 'inviteCode'];
    const first = order.find((key) => errors[key]);
    const map: Record<FieldKey, React.RefObject<HTMLInputElement | null>> = {
      displayName: nameRef,
      email: emailRef,
      password: passwordRef,
      confirmPassword: confirmRef,
      inviteCode: inviteRef,
    };
    if (first) map[first].current?.focus();
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!displayName.trim()) next.displayName = t('auth:register.nameRequired');
    if (!email.trim()) next.email = t('auth:register.emailRequired');
    else if (!isValidEmail(email)) next.email = t('auth:register.emailInvalid');
    if (!password) next.password = t('auth:register.passwordRequired');
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = t('auth:register.passwordTooShort');
    if (!confirmPassword) next.confirmPassword = t('auth:register.passwordRequired');
    else if (password !== confirmPassword) next.confirmPassword = t('auth:register.passwordMismatch');
    return next;
  };

  const navigateAfterRegister = async (userRole: string, joinedInvite: boolean) => {
    if (joinedInvite) {
      const next = await resolvePostAuthPath((userRole || 'FieldOwner') as AppRole);
      navigate(next);
      return;
    }
    if (redirectTo) {
      navigate(redirectTo);
      return;
    }
    const next = await resolvePostAuthPath((userRole || 'FieldOwner') as AppRole);
    navigate(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirst(errors);
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName.trim(), '', inviteCode.trim() || undefined);
      const stored = authService.getStoredUser();
      await navigateAfterRegister(stored?.role || 'FieldOwner', Boolean(inviteCode.trim()));
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, t) || t('auth:register.failed');
      const lower = message.toLowerCase();
      const next: Partial<Record<FieldKey, string>> = {};
      if (lower.includes('already') || lower.includes('exists') || lower.includes('υπάρχει')) {
        next.email = t('auth:register.emailTaken');
      } else if (lower.includes('invite') || lower.includes('πρόσκλη')) {
        next.inviteCode = t('auth:register.inviteInvalid');
        setShowInvite(true);
      } else if (lower.includes('network') || lower.includes('failed to fetch')) {
        setFormError(t('auth:register.networkFailed'));
      } else {
        setFormError(message);
      }
      setFieldErrors(next);
      focusFirst(next.email || next.inviteCode ? next : { email: message });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (key: FieldKey) => `login-field${fieldErrors[key] ? ' has-error' : ''}`;

  return (
    <>
      <div className="login-card-heading">
        <h1>{t('auth:register.title')}</h1>
        <p className="login-card-subtitle">{t('auth:register.subtitle')}</p>
        <p className="login-card-motto">{t('auth:login.motto')}</p>
      </div>

      {formError ? (
        <div className="login-error" role="alert">
          {formError}
        </div>
      ) : null}

      <AuthSocialButtons />

      {!showEmailForm ? (
        <button
          type="button"
          className="register-email-continue"
          onClick={() => setShowEmailForm(true)}
        >
          <Mail size={18} aria-hidden />
          {t('auth:register.continueWithEmail')}
        </button>
      ) : (
        <>
          <div className="login-divider">
            <span>{t('auth:register.orEmail')}</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className={fieldClass('displayName')}>
              <label htmlFor="displayName">{t('auth:register.firstName')}</label>
              <div className="login-input-wrap">
                <User size={18} className="login-input-icon" aria-hidden />
                <input
                  ref={nameRef}
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('auth:register.firstNamePlaceholder')}
                  autoComplete="name"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
                />
              </div>
              {fieldErrors.displayName ? (
                <p id="displayName-error" className="login-field-error" role="alert">
                  {fieldErrors.displayName}
                </p>
              ) : null}
            </div>

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
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
              </div>
              {fieldErrors.email ? (
                <p id="email-error" className="login-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className={fieldClass('password')}>
              <label htmlFor="password">{t('common:password')}</label>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" aria-hidden />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder={t('auth:register.passwordPlaceholder')}
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
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
              <p id="password-hint" className="register-hint">{t('auth:register.passwordHint')}</p>
              {capsLock ? <p className="register-hint">{t('auth:register.capsLock')}</p> : null}
              {fieldErrors.password ? (
                <p id="password-error" className="login-field-error" role="alert">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className={fieldClass('confirmPassword')}>
              <label htmlFor="confirmPassword">{t('auth:register.confirmPassword')}</label>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" aria-hidden />
                <input
                  ref={confirmRef}
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth:register.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
                />
              </div>
              {fieldErrors.confirmPassword ? (
                <p id="confirm-error" className="login-field-error" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            {showInvite ? (
              <div className={fieldClass('inviteCode')}>
                <label htmlFor="inviteCode">{t('auth:register.inviteCode')}</label>
                <div className="login-input-wrap">
                  <Ticket size={18} className="login-input-icon" aria-hidden />
                  <input
                    ref={inviteRef}
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder={t('auth:register.inviteCodePlaceholder')}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={loading}
                    aria-invalid={Boolean(fieldErrors.inviteCode)}
                    aria-describedby={fieldErrors.inviteCode ? 'invite-error' : undefined}
                  />
                </div>
                <p className="register-hint">{t('auth:register.inviteCodeHint')}</p>
                {fieldErrors.inviteCode ? (
                  <p id="invite-error" className="login-field-error" role="alert">
                    {fieldErrors.inviteCode}
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="register-invite-toggle"
                onClick={() => setShowInvite(true)}
              >
                {t('auth:register.inviteToggle')}
              </button>
            )}

            <p className="register-legal">
              {t('auth:register.legalPrefix')}{' '}
              <Link to="/terms">{t('auth:login.terms')}</Link>
              {' '}{t('auth:register.legalAnd')}{' '}
              <Link to="/privacy">{t('auth:login.privacy')}</Link>.
            </p>

            <Button type="submit" disabled={loading} loading={loading} fullWidth className="login-submit">
              {t('auth:register.button')}
            </Button>
          </form>
        </>
      )}

      <p className="login-register">
        {t('auth:register.hasAccount')}{' '}
        <Link to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}>
          {t('auth:register.loginLink')}
        </Link>
      </p>
    </>
  );
};

export default RegisterPage;
