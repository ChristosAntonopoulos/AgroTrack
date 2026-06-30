import React from 'react';
import { useTranslation } from 'react-i18next';
import { FieldAreaValidationResponse } from '../../services/fieldService';

interface Props {
  validation?: FieldAreaValidationResponse | null;
  officialAreaSqm?: number;
  measuredAreaSqm?: number;
}

const AreaComparisonCard: React.FC<Props> = ({ validation, officialAreaSqm, measuredAreaSqm }) => {
  const { t } = useTranslation('fields');
  const severity = validation?.severity || 'Ok';
  const official = validation?.officialAreaSqm ?? officialAreaSqm;
  const measured = validation?.appMeasuredAreaSqm ?? measuredAreaSqm;

  return (
    <div className={`area-comparison-card severity-${severity.toLowerCase()}`}>
      <h3>{t('addField.areaComparison')}</h3>
      <dl className="area-comparison-list">
        <div>
          <dt>{t('addField.measuredArea')}</dt>
          <dd>{measured != null ? `${measured.toFixed(0)} m²` : t('addField.notDrawn')}</dd>
        </div>
        <div>
          <dt>{t('addField.officialArea')}</dt>
          <dd>{official != null ? `${official.toFixed(0)} m²` : '—'}</dd>
        </div>
        {validation?.differencePercent != null && (
          <div>
            <dt>{t('addField.difference')}</dt>
            <dd>{validation.differencePercent.toFixed(1)}%</dd>
          </div>
        )}
      </dl>
      {validation?.message && <p className="area-comparison-message">{validation.message}</p>}
      {validation?.warnings?.map((w) => (
        <p key={w} className="area-comparison-warning">
          {w}
        </p>
      ))}
    </div>
  );
};

export default AreaComparisonCard;
