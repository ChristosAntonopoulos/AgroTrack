import React from 'react';
import { useTranslation } from 'react-i18next';
import { Reading } from './dossierMath';

export const DossierSection: React.FC<{
  index: string;
  title: string;
  children: React.ReactNode;
}> = ({ index, title, children }) => (
  <section className="report-section report-dossier-section">
    <h4 className="report-section-title">
      <span className="report-section-index">{index}</span>
      {title}
    </h4>
    {children}
  </section>
);

export const ReadingMark: React.FC<{ reading: Reading }> = ({ reading }) => {
  const { t } = useTranslation('reports');
  return (
    <span className={`report-reading report-reading--${reading}`}>
      {t(`dossier.bands.${reading}`)}
    </span>
  );
};

export const ShareBar: React.FC<{
  label: string;
  amount: string;
  share: number;
}> = ({ label, amount, share }) => (
  <div className="report-share">
    <div className="report-share-top">
      <span>{label}</span>
      <span>{amount}</span>
    </div>
    <div className="report-share-track" aria-hidden="true">
      <div
        className="report-share-fill"
        style={{ width: `${share <= 0 ? 0 : Math.max(2, Math.min(100, share))}%` }}
      />
    </div>
  </div>
);

export function ledgerLabel(t: (key: string, options?: { defaultValue?: string }) => string, key: string): string {
  const fallback = key.replace(/_/g, ' ');
  return t(`dossier.cats.${key}`, { defaultValue: fallback });
}
