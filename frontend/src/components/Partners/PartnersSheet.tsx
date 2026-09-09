import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Shared modal/sheet shell for partner forms — above sidebar, ESC + backdrop close. */
const PartnersSheet: React.FC<Props> = ({ title, subtitle, onClose, children, footer }) => {
  const { t } = useTranslation('common');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="partners-sheet" role="dialog" aria-modal="true" aria-labelledby="partners-sheet-title">
      <button type="button" className="partners-sheet-backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="partners-sheet-card">
        <header className="partners-sheet-header">
          <div className="partners-sheet-heading">
            <h2 id="partners-sheet-title">{title}</h2>
            {subtitle ? <p className="partners-sheet-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="partners-sheet-close" onClick={onClose} aria-label={t('close')}>
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="partners-sheet-body">{children}</div>
        {footer ? <footer className="partners-sheet-footer">{footer}</footer> : null}
      </div>
    </div>
  );
};

export default PartnersSheet;
