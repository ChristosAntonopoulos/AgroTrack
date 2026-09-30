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
  /** Letterhead, mark, and document-control block for a formal dossier. */
  formal?: {
    code: string;
    audience: string;
    classification: string;
  };
}

const ReportDocumentShell: React.FC<ReportDocumentShellProps> = ({
  title,
  subtitle,
  season,
  periodLabel,
  children,
  id,
  formal,
}) => {
  const { t, i18n } = useTranslation('reports');
  const generatedOn = new Date();
  const generated = generatedOn.toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: formal ? 'long' : 'short',
    year: 'numeric',
  });

  return (
    <div className={`report-document${formal ? ' report-document--formal' : ''}`} id={id}>
      <div className="report-document-inner">
        {formal ? (
          <header className="report-doc-header report-doc-header--formal">
            <div className="report-formal-top">
              <div className="report-formal-brand">
                <BrandLogo variant="mark" size="md" className="report-doc-logo" />
                <div>
                  <p className="report-formal-house">Oleachron</p>
                  <p className="report-formal-tag">{t('brandLine')}</p>
                </div>
              </div>
              <dl className="report-formal-meta">
              <div>
                <dt>{t('dossier.reference')}</dt>
                <dd>{formal.code}</dd>
              </div>
              <div>
                <dt>{t('dossier.audience')}</dt>
                <dd>{formal.audience}</dd>
              </div>
              <div>
                <dt>{t('dossier.period')}</dt>
                <dd>{periodLabel ?? (season ? t('seasonLabel', { season }) : '—')}</dd>
              </div>
              <div>
                <dt>{t('generated')}</dt>
                <dd>{generated}</dd>
              </div>
              <div>
                <dt>{t('dossier.status')}</dt>
                <dd>{t('confidential')}</dd>
              </div>
              </dl>
            </div>
            <div className="report-formal-titleblock">
              <p className="report-formal-class">{formal.classification}</p>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </header>
        ) : (
          <header className="report-doc-header">
            <div className="report-doc-brand">
              <BrandLogo variant="mark" size="sm" className="report-doc-logo" />
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
        )}
        {children}
        <footer className="report-doc-footer">
          <span>{formal ? `${formal.code} · ${t('brandLine')}` : t('brandLine')}</span>
          <span>{t('confidential')}</span>
        </footer>
      </div>
    </div>
  );
};

export default ReportDocumentShell;
