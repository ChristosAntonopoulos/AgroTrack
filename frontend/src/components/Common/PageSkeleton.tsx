import React from 'react';
import { useTranslation } from 'react-i18next';
import './PageSkeleton.css';

type Props = {
  /** Number of card placeholders under the heading bar. */
  rows?: number;
};

/** QA-016: layout-shaped placeholder shown while a page loads (replaces a lone spinner). */
const PageSkeleton: React.FC<Props> = ({ rows = 3 }) => {
  const { t } = useTranslation('common');
  return (
    <div className="page-skeleton" role="status" aria-busy="true" aria-live="polite">
      <span className="page-skeleton__sr">{t('loading', { defaultValue: 'Loading…' })}</span>
      <div className="page-skeleton__bar" aria-hidden />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="page-skeleton__card" aria-hidden />
      ))}
    </div>
  );
};

export default PageSkeleton;
