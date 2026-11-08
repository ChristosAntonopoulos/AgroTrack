import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { readInviteIntent } from '../../utils/inviteIntent';
import { getApiErrorMessage } from '../../utils/translateApiError';
import type { AuthResponse } from '../../services/authService';
import './AuthSocialButtons.css';

type Props = {
  onBeforeContinue?: () => void;
  onAuthenticated?: (response: AuthResponse) => void | Promise<void>;
};

const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

const AuthSocialButtons: React.FC<Props> = ({ onBeforeContinue, onAuthenticated }) => {
  const { t } = useTranslation(['auth', 'errors']);
  const { loginWithGoogle } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const completeGoogle = async (credential?: string) => {
    if (!credential) {
      setNotice(t('auth:register.googleFailed'));
      return;
    }

    onBeforeContinue?.();
    setBusy(true);
    setNotice(null);
    try {
      const inviteCode = readInviteIntent()?.code?.trim() || undefined;
      const response = await loginWithGoogle(credential, inviteCode);
      await onAuthenticated?.(response);
    } catch (err: unknown) {
      setNotice(getApiErrorMessage(err, t) || t('auth:register.googleFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleCredential = (credentialResponse: CredentialResponse) => {
    void completeGoogle(credentialResponse.credential);
  };

  if (!googleClientId) {
    return (
      <div className="auth-social">
        <button
          type="button"
          className="auth-social-btn"
          onClick={() => setNotice(t('auth:register.googleNotConfigured'))}
        >
          <GoogleMark />
          {t('auth:register.continueGoogle')}
        </button>
        {notice ? (
          <p className="auth-social-note" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`auth-social${busy ? ' auth-social--busy' : ''}`}>
      <div className="auth-social-google">
        <GoogleLogin
          onSuccess={handleCredential}
          onError={() => setNotice(t('auth:register.googleFailed'))}
          useOneTap={false}
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          logo_alignment="left"
        />
      </div>
      {notice ? (
        <p className="auth-social-note" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
};

const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default AuthSocialButtons;
