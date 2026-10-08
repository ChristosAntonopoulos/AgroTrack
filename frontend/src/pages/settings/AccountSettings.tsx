import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { accountService } from '../../services/accountService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { getPasswordIssue } from '../../utils/passwordValidation';
import PasswordStrength from '../../components/Auth/PasswordStrength';
import Button from '../../components/Common/Button';

const AccountSettings: React.FC = () => {
  const { t } = useTranslation(['settings', 'errors']);
  const { user, updateSession } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [nameStatus, setNameStatus] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | undefined>();
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
  }, [user?.userId, user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    void accountService.refreshPendingEmail(user.userId).then((pending) => {
      if (!cancelled && pending) setPendingEmail(pending);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  if (!user) return null;

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || '—';

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setNameError(null);
    setNameStatus(null);
    if (!firstName.trim()) {
      setNameError(t('account.nameRequired'));
      return;
    }
    setNameBusy(true);
    try {
      const next = await accountService.updateProfile(user, firstName, lastName);
      updateSession({ firstName: next.firstName, lastName: next.lastName });
      setNameStatus(t('account.nameSaved'));
    } catch (err) {
      setNameError(getApiErrorMessage(err, t));
    } finally {
      setNameBusy(false);
    }
  };

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setEmailStatus(null);
    setEmailBusy(true);
    try {
      const result = await accountService.requestEmailChange(user, newEmail, emailPassword);
      setPendingEmail(result.pendingEmail);
      setDevCode(result.devCode || null);
      setEmailPassword('');
      setEmailStatus(t('account.codeSent', { email: result.pendingEmail }));
    } catch (err) {
      setEmailError(getApiErrorMessage(err, t));
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setEmailStatus(null);
    setEmailBusy(true);
    try {
      const next = await accountService.confirmEmailChange(user, code);
      updateSession({ email: next.email });
      setPendingEmail(undefined);
      setDevCode(null);
      setCode('');
      setNewEmail('');
      setEmailStatus(t('account.emailUpdated'));
    } catch (err) {
      setEmailError(getApiErrorMessage(err, t));
    } finally {
      setEmailBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);
    const issue = getPasswordIssue(nextPassword);
    if (issue === 'tooShort') {
      setPasswordError(t('account.passwordTooShort'));
      return;
    }
    if (issue === 'complexity') {
      setPasswordError(t('account.passwordComplexity'));
      return;
    }
    if (nextPassword !== confirmPassword) {
      setPasswordError(t('account.passwordMismatch'));
      return;
    }
    setPasswordBusy(true);
    try {
      await accountService.changePassword(user, currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setPasswordStatus(t('account.passwordUpdated'));
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, t));
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <section className="settings-block" aria-labelledby="settings-account">
      <h2 id="settings-account" className="settings-block-title">
        {t('sections.account')}
      </h2>
      <div className="settings-account-card">
        <p className="settings-account-name">{displayName}</p>
        <p className="settings-account-email">
          {user.email}
          <span className="settings-verified">{t('account.verified')}</span>
        </p>
      </div>

      <form className="settings-subblock" onSubmit={saveName}>
        <h3 className="settings-subtitle">{t('account.profileTitle')}</h3>
        <p className="settings-help">{t('account.profileHelp')}</p>
        <div className="settings-form">
          <label className="settings-label" htmlFor="settings-first-name">
            {t('account.firstName')}
          </label>
          <input
            id="settings-first-name"
            className="settings-input"
            value={firstName}
            autoComplete="given-name"
            onChange={(event) => setFirstName(event.target.value)}
            aria-invalid={Boolean(nameError)}
          />
          <label className="settings-label" htmlFor="settings-last-name">
            {t('account.lastName')}
          </label>
          <input
            id="settings-last-name"
            className="settings-input"
            value={lastName}
            autoComplete="family-name"
            onChange={(event) => setLastName(event.target.value)}
          />
          {nameError ? (
            <p className="settings-form-error" role="alert">
              {nameError}
            </p>
          ) : null}
          {nameStatus ? <p className="settings-form-ok">{nameStatus}</p> : null}
          <div className="settings-form-actions">
            <Button type="submit" variant="primary" size="md" loading={nameBusy}>
              {t('account.saveName')}
            </Button>
          </div>
        </div>
      </form>

      <div className="settings-subblock">
        <h3 className="settings-subtitle">{t('account.emailTitle')}</h3>
        <p className="settings-help">{t('account.emailHelp')}</p>
        <form className="settings-form" onSubmit={pendingEmail ? confirmEmail : sendCode}>
          {pendingEmail ? (
            <>
              <p className="settings-help">{t('account.codeSent', { email: pendingEmail })}</p>
              {devCode ? <p className="settings-dev-code">{t('account.devCode', { code: devCode })}</p> : null}
              <label className="settings-label" htmlFor="settings-email-code">
                {t('account.codeLabel')}
              </label>
              <input
                id="settings-email-code"
                className="settings-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </>
          ) : (
            <>
              <label className="settings-label" htmlFor="settings-new-email">
                {t('account.newEmail')}
              </label>
              <input
                id="settings-new-email"
                className="settings-input"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
              <label className="settings-label" htmlFor="settings-email-password">
                {t('account.currentPassword')}
              </label>
              <input
                id="settings-email-password"
                className="settings-input"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
              />
            </>
          )}
          {emailError ? (
            <p className="settings-form-error" role="alert">
              {emailError}
            </p>
          ) : null}
          {emailStatus && !pendingEmail ? <p className="settings-form-ok">{emailStatus}</p> : null}
          <div className="settings-form-actions">
            <Button type="submit" variant="primary" size="md" loading={emailBusy}>
              {pendingEmail ? t('account.confirmEmail') : t('account.sendCode')}
            </Button>
          </div>
        </form>
      </div>

      <form className="settings-subblock" onSubmit={changePassword}>
        <h3 className="settings-subtitle">{t('account.passwordTitle')}</h3>
        <p className="settings-help">{t('account.passwordHelp')}</p>
        <div className="settings-form">
          <label className="settings-label" htmlFor="settings-current-password">
            {t('account.currentPassword')}
          </label>
          <input
            id="settings-current-password"
            className="settings-input"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <label className="settings-label" htmlFor="settings-new-password">
            {t('account.newPassword')}
          </label>
          <input
            id="settings-new-password"
            className="settings-input"
            type="password"
            autoComplete="new-password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
          />
          <PasswordStrength password={nextPassword} />
          <label className="settings-label" htmlFor="settings-confirm-password">
            {t('account.confirmPassword')}
          </label>
          <input
            id="settings-confirm-password"
            className="settings-input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {passwordError ? (
            <p className="settings-form-error" role="alert">
              {passwordError}
            </p>
          ) : null}
          {passwordStatus ? <p className="settings-form-ok">{passwordStatus}</p> : null}
          <div className="settings-form-actions">
            <Button type="submit" variant="primary" size="md" loading={passwordBusy}>
              {t('account.changePassword')}
            </Button>
          </div>
          <Link className="settings-text-link" to="/forgot-password">
            {t('account.passwordResetLink')}
          </Link>
        </div>
      </form>
    </section>
  );
};

export default AccountSettings;
