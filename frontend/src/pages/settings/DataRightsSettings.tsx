import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accountService, downloadAccountExport, supportMailto } from '../../services/accountService';
import { LANDING_SUPPORT_EMAIL } from '../../config/landingConfig';
import { getApiErrorMessage } from '../../utils/translateApiError';
import Button from '../../components/Common/Button';

const DataRightsSettings: React.FC = () => {
  const { t } = useTranslation(['settings', 'errors']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const download = async () => {
    setExportError(null);
    setExportStatus(null);
    setExporting(true);
    try {
      const data = await accountService.exportData(user);
      downloadAccountExport(data);
      setExportStatus(t('privacy.exportDone'));
    } catch (err) {
      setExportError(getApiErrorMessage(err, t));
    } finally {
      setExporting(false);
    }
  };

  const closeAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteError(null);
    if (typedEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      setDeleteError(t('danger.emailMismatch'));
      return;
    }
    setDeleting(true);
    try {
      await accountService.deleteAccount(user, password);
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, t));
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="settings-block" aria-labelledby="settings-privacy">
        <h2 id="settings-privacy" className="settings-block-title">
          {t('sections.privacy')}
        </h2>
        <p className="settings-help">{t('privacy.exportHelp')}</p>
        <div className="settings-form-actions">
          <Button type="button" variant="outline" size="md" loading={exporting} onClick={download}>
            {exporting ? t('privacy.exportWorking') : t('privacy.exportButton')}
          </Button>
        </div>
        {exportError ? (
          <p className="settings-form-error" role="alert">
            {exportError}
          </p>
        ) : null}
        {exportStatus ? <p className="settings-form-ok">{exportStatus}</p> : null}

        <div className="settings-support-card">
          <h3 className="settings-subtitle">{t('privacy.supportTitle')}</h3>
          <p className="settings-help">{t('privacy.supportBody')}</p>
          <a className="settings-text-link" href={supportMailto(user)}>
            {t('privacy.supportAction')} ({LANDING_SUPPORT_EMAIL})
          </a>
        </div>
      </section>

      <section className="settings-block settings-danger" aria-labelledby="settings-danger">
        <h2 id="settings-danger" className="settings-block-title">
          {t('sections.danger')}
        </h2>
        <p className="settings-help">{t('danger.deleteHelp')}</p>
        <p className="settings-help">
          <a className="settings-text-link" href="/delete-account/">
            theolivelot.com/delete-account
          </a>
        </p>
        {confirming ? (
          <form className="settings-form" onSubmit={closeAccount}>
            <h3 className="settings-subtitle">{t('danger.confirmTitle')}</h3>
            <p className="settings-help">{t('danger.confirmBody')}</p>
            <label className="settings-label" htmlFor="settings-delete-password">
              {t('danger.deletePassword')}
            </label>
            <input
              id="settings-delete-password"
              className="settings-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <label className="settings-label" htmlFor="settings-delete-email">
              {t('danger.confirmEmail')}
            </label>
            <input
              id="settings-delete-email"
              className="settings-input"
              type="email"
              autoComplete="off"
              value={typedEmail}
              onChange={(event) => setTypedEmail(event.target.value)}
            />
            {deleteError ? (
              <p className="settings-form-error" role="alert">
                {deleteError}
              </p>
            ) : null}
            <div className="settings-form-actions">
              <Button type="submit" variant="error" size="md" loading={deleting}>
                {t('danger.deleteAction')}
              </Button>
              <Button type="button" variant="outline" size="md" onClick={() => setConfirming(false)}>
                {t('danger.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="error" size="md" onClick={() => setConfirming(true)}>
            {t('danger.deleteButton')}
          </Button>
        )}
      </section>
    </>
  );
};

export default DataRightsSettings;
