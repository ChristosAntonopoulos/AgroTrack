import React from 'react';
import { useTranslation } from 'react-i18next';
import { FieldAreaValidationResponse } from '../../services/fieldService';
import { normalizeLocale } from '../../i18n/config';
import { formatAreaFromSqm } from '../../utils/area';

interface Props {
  validation?: FieldAreaValidationResponse | null;
  measuredAreaSqm?: number;
}

const AreaComparisonCard: React.FC<Props> = ({ validation, measuredAreaSqm }) => {
  const { t, i18n } = useTranslation('fields');
  const locale = normalizeLocale(i18n.language);
  const measured = validation?.appMeasuredAreaSqm ?? measuredAreaSqm;
  const hasMeasured = measured != null && measured > 0;

  if (!hasMeasured) return null;

  return (
    <section className="area-comparison-card">
      <header className="area-comparison-head">
        <h3>{t('addField.measuredArea')}</h3>
      </header>
      <div className="area-comparison-metrics">
        <div className="area-comparison-metric">
          <p className="area-comparison-value">{formatAreaFromSqm(measured, { locale })}</p>
          <p className="area-comparison-sub">{formatAreaFromSqm(measured, { locale, style: 'sqm' })}</p>
        </div>
      </div>
    </section>
  );
};

export default AreaComparisonCard;
