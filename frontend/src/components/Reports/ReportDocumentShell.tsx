import React from 'react';
import { format } from 'date-fns';
import BrandLogo from '../Common/BrandLogo';
import './ReportDocument.css';

interface ReportDocumentShellProps {
  title: string;
  subtitle?: string;
  season?: string;
  children: React.ReactNode;
  id?: string;
}

const ReportDocumentShell: React.FC<ReportDocumentShellProps> = ({
  title,
  subtitle,
  season,
  children,
  id,
}) => (
  <div className="report-document" id={id}>
    <div className="report-document-inner">
      <header className="report-doc-header">
        <div className="report-doc-brand">
          <BrandLogo size="sm" className="report-doc-logo" rounded />
          <div className="report-doc-brand-text">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <div className="report-doc-meta">
          <strong>AgroTrack</strong>
          {season && <span>Season {season}</span>}
          <span>Generated {format(new Date(), 'dd MMM yyyy')}</span>
        </div>
      </header>
      {children}
      <footer className="report-doc-footer">
        <span>AgroTrack — Olive Farm Management</span>
        <span>Confidential</span>
      </footer>
    </div>
  </div>
);

export default ReportDocumentShell;
