import React from 'react';
import { useTranslation } from 'react-i18next';
import { FieldAreaValidationResponse } from '../../services/fieldService';
import { normalizeLocale } from '../../i18n/config';
import { formatAreaFromSqm } from '../../utils/area';

interface Props {
  validation?: FieldAreaValidationResponse | null;
  officialAreaSqm?: number;
  measuredAreaSqm?: number;
}

const AreaComparisonCard: React.FC<Props> = ({ validation, officialAreaSqm, measuredAreaSqm }) => {
  const { t, i18n } = useTranslation('fields');
  const locale = normalizeLocale(i18n.language);
  const severity = validation?.severity || 'Ok';
  const official = validation?.officialAreaSqm ?? officialAreaSqm;
  const measured = validation?.appMeasuredAreaSqm ?? measuredAreaSqm;
  const hasOfficial = official != null && official > 0;
  const hasMeasured = measured != null && measured > 0;

  const message = !hasOfficial
    ? t('addField.areaNoOfficial')
    : severity === 'Warning'
      ? t('addField.areaWarning')
      : severity === 'Critical'
        ? t('addField.areaCritical')
        : t('addField.areaClose');

  return (
    <section className={`area-comparison-card severity-${severity.toLowerCase()}`}>
      <header className="area-comparison-head">
        <h3>{t('addField.areaComparison')}</h3>
        {hasOfficial && validation?.differencePercent != null ? (
          <span className="area-comparison-diff">
            {t('addField.difference')}: {validation.differencePercent.toFixed(1)}%
          </span>
        ) : null}
      </header>

      <div className="area-comparison-metrics">
        <div className="area-comparison-metric">
          <p className="area-comparison-label">{t('addField.measuredArea')}</p>
          <p className="area-comparison-value">
            {hasMeasured ? formatAreaFromSqm(measured, { locale }) : t('addField.notDrawn')}
          </p>
          {hasMeasured ? (
            <p className="area-comparison-sub">{formatAreaFromSqm(measured, { locale, style: 'sqm' })}</p>
          ) : null}
        </div>
        <div className={`area-comparison-metric${hasOfficial ? '' : ' is-empty'}`}>
          <p className="area-comparison-label">{t('addField.officialArea')}</p>
          <p className="area-comparison-value">
            {hasOfficial ? formatAreaFromSqm(official, { locale }) : t('addField.officialUnavailable')}
          </p>
          {hasOfficial ? (
            <p className="area-comparison-sub">{formatAreaFromSqm(official, { locale, style: 'sqm' })}</p>
          ) : null}
        </div>
      </div>

      <p className="area-comparison-message">{message}</p>
      {validation?.warnings?.map((w) => (
        <p key={w} className="area-comparison-warning">
          {w}
        </p>
      ))}
    </section>
  );
};

export default AreaComparisonCard;
