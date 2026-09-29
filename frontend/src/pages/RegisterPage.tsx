import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { invalidateAccessContext } from '../hooks/useAccessContext';
import { AppRole, roleHomePath } from '../navigation/navConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolvePostAuthPath } from '../utils/firstGroveDestination';
import {
  authPathWithIntent,
  intentFromSearch,
  mergeInviteIntent,
  readInviteIntent,
  rememberInviteIntent,
} from '../utils/inviteIntent';
import AuthSocialButtons from '../components/Auth/AuthSocialButtons';
import Button from '../components/Common/Button';
import { Mail, Lock, User, Eye, EyeOff, Ticket } from 'lucide-react';
import './RegisterPage.css';

const MIN_PASSWORD_LENGTH = 8;

type FieldKey = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'inviteCode';

const FIELD_ORDER: FieldKey[] = [
  'firstName',
  'lastName',
  'email',
  'password',
  'confirmPassword',
  'inviteCode',
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const splitDisplayName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
};

const RegisterPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const storedIntent = mergeInviteIntent(readInviteIntent(), intentFromSearch(searchParams));
  const inviteFromQuery = storedIntent.code || searchParams.get('code') || '';
  const hasInviteIntent = Boolean(storedIntent.token || storedIntent.code || storedIntent.redirect?.startsWith('/invite/'));
  const invitedName = splitDisplayName(storedIntent.name || '');

  const [firstName, setFirstName] = useState(invitedName.first);
  const [lastName, setLastName] = useState(invitedName.last);
  const [email, setEmail] = useState(storedIntent.email || '');
  const [emailLocked, setEmailLocked] = useState(Boolean(storedIntent.email));
  const [nameFromInvite, setNameFromInvite] = useState(Boolean(storedIntent.name));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteFromQuery);
  const [showInvite, setShowInvite] = useState(hasInviteIntent);
  const [showEmailForm, setShowEmailForm] = useState(hasInviteIntent);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const summaryRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const inviteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = rememberInviteIntent(intentFromSearch(searchParams));
    if (next.code) setInviteCode((current) => current || next.code || '');
    if (next.email) {
      setEmail((current) => current || next.email || '');
      setEmailLocked(true);
    }
    if (next.name) {
      const parts = splitDisplayName(next.name);
      setFirstName((current) => current || parts.first);
      setLastName((current) => current || parts.last);
      setNameFromInvite(true);
    }
    if (next.token || next.code || next.redirect?.startsWith('/invite/')) {
      setShowInvite(true);
      setShowEmailForm(true);
    }

    const lookup = next.token || next.code;
    if (!lookup) return undefined;
    let cancelled = false;
    void fieldPeopleService
      .getInvite(lookup)
      .then((invite) => {
        if (cancelled || !invite) return;
        if (invite.email) {
          setEmail((current) => current || invite.email || '');
          setEmailLocked(true);
        }
        if (invite.displayName) {
          const parts = splitDisplayName(invite.displayName);
          setFirstName((current) => current || parts.first);
          setLastName((current) => current || parts.last);
          setNameFromInvite(true);
        }
        if (invite.code) setInviteCode((current) => current || invite.code || '');
        rememberInviteIntent({
          token: invite.token || next.token,
          code: invite.code,
          email: invite.email,
          name: invite.displayName,
          redirect: `/invite/${invite.token || next.token || lookup}`,
        });
      })
      .catch(() => {
        /* The invitation page still carries the code if this lookup fails. */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const fieldRefs: Record<FieldKey, React.RefObject<HTMLInputElement | null>> = {
    firstName: firstNameRef,
    lastName: lastNameRef,
    email: emailRef,
    password: passwordRef,
    confirmPassword: confirmRef,
    inviteCode: inviteRef,
  };

  const loginHref = authPathWithIntent(
    '/login',
    mergeInviteIntent(storedIntent, { code: inviteCode.trim() || undefined })
  );

  const persistInvite = () => {
    rememberInviteIntent(intentFromSearch(searchParams), {
      code: inviteCode.trim() || undefined,
    });
  };

  const focusErrors = (errors: Partial<Record<FieldKey, string>>) => {
    void errors;
    requestAnimationFrame(() => {
      summaryRef.current?.focus();
    });
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!firstName.trim()) next.firstName = t('auth:register.firstNameRequired');
    if (!email.trim()) next.email = t('auth:register.emailRequired');
    else if (!isValidEmail(email)) next.email = t('auth:register.emailInvalid');
    if (!password) next.password = t('auth:register.passwordRequired');
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = t('auth:register.passwordTooShort');
    if (!confirmPassword) next.confirmPassword = t('auth:register.passwordRequired');
    else if (password !== confirmPassword) next.confirmPassword = t('auth:register.passwordMismatch');
    return next;
  };

  /** Invite joiners return to the invitation; new owners start grove setup. */
  const navigateAfterRegister = async (userRole: string, joinedInvite: boolean, code: string) => {
    invalidateAccessContext();
    const intent = rememberInviteIntent(intentFromSearch(searchParams), { code: code || undefined });

    if (joinedInvite || intent.token || intent.redirect?.startsWith('/invite/')) {
      if (intent.token) {
        navigate(`/invite/${intent.token}`);
        return;
      }
      if (intent.redirect) {
        navigate(intent.redirect);
        return;
      }
      if (code) {
        try {
          const invite = await fieldPeopleService.getInvite(code);
          if (invite?.token) {
            navigate(`/invite/${invite.token}`);
            return;
          }
          if (invite?.fieldId) {
            navigate(`/chronologio?fieldId=${encodeURIComponent(invite.fieldId)}`);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      navigate('/chronologio');
      return;
    }

    const role = (userRole || 'FieldOwner') as AppRole;
    if (role === 'FieldOwner' || role === '') {
      navigate(roleHomePath(role));
      return;
    }
    const next = await resolvePostAuthPath(role);
    navigate(next);
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
    const code = inviteCode.trim();
    persistInvite();
    try {
      await register(email, password, firstName.trim(), lastName.trim() || undefined, code || undefined);
      const stored = authService.getStoredUser();
      await navigateAfterRegister(stored?.role || 'FieldOwner', Boolean(code), code);
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
      if (Object.keys(next).length > 0) focusErrors(next);
      else requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (key: FieldKey) => `login-field${fieldErrors[key] ? ' has-error' : ''}`;
  const errorEntries = FIELD_ORDER.filter((key) => fieldErrors[key]).map((key) => ({
    key,
    message: fieldErrors[key] as string,
  }));
  const summaryMessage =
    formError ||
    (errorEntries.length > 1
      ? t('auth:register.errorSummary', { count: errorEntries.length })
      : errorEntries[0]?.message || null);

  const legalLinks = (
    <p className="register-legal">
      {t('auth:register.legalPrefix')}{' '}
      <Link to="/terms">{t('auth:login.terms')}</Link> {t('auth:register.legalAnd')}{' '}
      <Link to="/privacy">{t('auth:login.privacy')}</Link>.
    </p>
  );

  return (
    <>
      <div className="login-card-heading">
        <h1>{t(hasInviteIntent ? 'auth:register.inviteTitle' : 'auth:register.title')}</h1>
        <p className="login-card-subtitle">
          {t(hasInviteIntent ? 'auth:register.inviteSubtitle' : 'auth:register.subtitle')}
        </p>
      </div>

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
                      onClick={() => fieldRefs[key].current?.focus()}
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

      {fieldErrors.email === t('auth:register.emailTaken') ? (
        <p className="register-existing-account">
          <Link to={loginHref}>{t('auth:register.loginLink')}</Link>
        </p>
      ) : null}

      <AuthSocialButtons onBeforeContinue={persistInvite} />
      {legalLinks}

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
            <div className="register-name-row">
              <div className={fieldClass('firstName')}>
                <label htmlFor="firstName">
                  {t('auth:register.firstName')}
                  <span className="register-required" aria-hidden>
                    *
                  </span>
                  <span className="sr-only">{t('auth:register.required')}</span>
                </label>
                <div className="login-input-wrap">
                  <User size={18} className="login-input-icon" aria-hidden />
                  <input
                    ref={firstNameRef}
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('auth:register.firstNamePlaceholder')}
                    autoComplete="given-name"
                    required
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                  />
                </div>
                {nameFromInvite ? (
                  <p className="register-hint">{t('auth:register.inviteNameFilled')}</p>
                ) : null}
                {fieldErrors.firstName ? (
                  <p id="firstName-error" className="login-field-error" role="alert">
                    {fieldErrors.firstName}
                  </p>
                ) : null}
              </div>

              <div className={fieldClass('lastName')}>
                <label htmlFor="lastName">
                  {t('auth:register.lastName')}
                  <span className="register-optional">{t('auth:register.optional')}</span>
                </label>
                <div className="login-input-wrap">
                  <User size={18} className="login-input-icon" aria-hidden />
                  <input
                    ref={lastNameRef}
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('auth:register.lastNamePlaceholder')}
                    autoComplete="family-name"
                    disabled={loading}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                  />
                </div>
                {fieldErrors.lastName ? (
                  <p id="lastName-error" className="login-field-error" role="alert">
                    {fieldErrors.lastName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={fieldClass('email')}>
              <label htmlFor="email">
                {t('common:email')}
                <span className="register-required" aria-hidden>
                  *
                </span>
              </label>
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
                  readOnly={emailLocked}
                  disabled={loading}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'email-error' : emailLocked ? 'email-invite-hint' : undefined
                  }
                />
              </div>
              {emailLocked ? (
                <p id="email-invite-hint" className="register-hint">
                  {t('auth:register.inviteEmailLocked')}
                </p>
              ) : null}
              {fieldErrors.email ? (
                <p id="email-error" className="login-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className={fieldClass('password')}>
              <label htmlFor="password">
                {t('common:password')}
                <span className="register-required" aria-hidden>
                  *
                </span>
              </label>
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
                  required
                  disabled={loading}
                  aria-required="true"
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
              <p id="password-hint" className="register-hint">
                {t('auth:register.passwordHint')}
              </p>
              {capsLock ? <p className="register-hint">{t('auth:register.capsLock')}</p> : null}
              {fieldErrors.password ? (
                <p id="password-error" className="login-field-error" role="alert">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className={fieldClass('confirmPassword')}>
              <label htmlFor="confirmPassword">
                {t('auth:register.confirmPassword')}
                <span className="register-required" aria-hidden>
                  *
                </span>
              </label>
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
                  required
                  disabled={loading}
                  aria-required="true"
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
                <label htmlFor="inviteCode">
                  {t('auth:register.inviteCode')}
                  <span className="register-optional">{t('auth:register.optional')}</span>
                </label>
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
                    aria-describedby={fieldErrors.inviteCode ? 'invite-error' : 'invite-hint'}
                  />
                </div>
                <p id="invite-hint" className="register-hint">
                  {t('auth:register.inviteCodeHint')}
                </p>
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

            <Button type="submit" disabled={loading} loading={loading} fullWidth className="login-submit">
              {t(hasInviteIntent ? 'auth:register.inviteButton' : 'auth:register.button')}
            </Button>
          </form>
        </>
      )}

      <p className="login-register">
        {t('auth:register.hasAccount')} <Link to={loginHref}>{t('auth:register.loginLink')}</Link>
      </p>
    </>
  );
};

export default RegisterPage;
