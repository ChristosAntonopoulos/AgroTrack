import React from 'react';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../Common/BrandLogo';
import './ReportDocument.css';

interface ReportDocumentShellProps {
  title: string;
  subtitle?: string;
  season?: string;
  periodLabel?: string;
  children: React.ReactNode;
  id?: string;
}

const ReportDocumentShell: React.FC<ReportDocumentShellProps> = ({
  title,
  subtitle,
  season,
  periodLabel,
  children,
  id,
}) => {
  const { t, i18n } = useTranslation('reports');
  const generated = new Date().toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="report-document" id={id}>
      <div className="report-document-inner">
        <header className="report-doc-header">
          <div className="report-doc-brand">
            <BrandLogo variant="horizontal" size="sm" className="report-doc-logo" />
            <div className="report-doc-brand-text">
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="report-doc-meta">
            <strong>Oleachron</strong>
            {periodLabel ? <span>{periodLabel}</span> : season ? <span>{t('seasonLabel', { season })}</span> : null}
            <span>{t('generated')} {generated}</span>
          </div>
        </header>
        {children}
        <footer className="report-doc-footer">
          <span>{t('brandLine')}</span>
          <span>{t('confidential')}</span>
        </footer>
      </div>
    </div>
  );
};

export default ReportDocumentShell;
