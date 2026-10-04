import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { demoAccounts, demoAccountIcons, DemoAccount } from '../../services/demoAccounts';
import './LoginDemoPicker.css';

type Props = {
  loading?: boolean;
  onSelect: (account: DemoAccount) => void;
};

const LoginDemoPicker: React.FC<Props> = ({ loading = false, onSelect }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="login-demo" ref={rootRef}>
      <div className="login-divider">
        <span>{t('common:or')}</span>
      </div>

      <button
        type="button"
        className="login-demo-cta"
        onClick={() => setOpen((value) => !value)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {t('auth:login.demoCta')}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="login-demo-backdrop"
            aria-label={t('common:close')}
            onClick={() => setOpen(false)}
          />
          <div
            className="login-demo-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <p id={titleId} className="login-demo-choose">
              {t('auth:login.demoChoose')}
            </p>
            <div className="login-demo-options">
              {demoAccounts.map((user) => {
                const Icon = demoAccountIcons[user.id];
                return (
                  <button
                    key={user.email}
                    type="button"
                    className="login-demo-option"
                    onClick={() => onSelect(user)}
                    disabled={loading}
                  >
                    <span className="login-demo-icon" aria-hidden>
                      <Icon size={18} />
                    </span>
                    <span className="login-demo-text">
                      <strong>{t(`auth:${user.nameKey}`)}</strong>
                      <small>{t(`auth:${user.subtitleKey}`)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LoginDemoPicker;
