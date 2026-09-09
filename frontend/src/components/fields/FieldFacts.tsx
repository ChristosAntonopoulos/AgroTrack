import React from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import './FieldOverviewBlocks.css';

type Props = {
  field: Field;
};

const FieldFacts: React.FC<Props> = ({ field }) => {
  const { t } = useTranslation('fields');
  const variety = field.variety || field.oliveVariety;
  const place = getFieldShortLocation(field);

  return (
    <dl className="fd-facts-list">
      <div>
        <dt>{t('overview.area')}</dt>
        <dd>{formatFieldArea(field)}</dd>
      </div>
      {variety ? (
        <div>
          <dt>{t('overview.variety')}</dt>
          <dd>{variety}</dd>
        </div>
      ) : null}
      {place ? (
        <div>
          <dt>{t('locationLabel')}</dt>
          <dd>{place}</dd>
        </div>
      ) : null}
      <div>
        <dt>{t('overview.status')}</dt>
        <dd>{getFieldStatusLabel(field.status, t)}</dd>
      </div>
    </dl>
  );
};

export default FieldFacts;
