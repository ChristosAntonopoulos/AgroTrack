import React from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel, getLifecycleStageLabel } from '../../utils/fieldDisplay';
import './FieldIdentity.css';

type Props = {
  field: Field;
  size?: 'card' | 'page';
  showMeta?: boolean;
};

const FieldIdentity: React.FC<Props> = ({ field, size = 'card', showMeta = true }) => {
  const { t } = useTranslation(['fields', 'common']);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const stage = getLifecycleStageLabel(field.currentLifecycleStage, t);
  const variety = field.variety || field.oliveVariety;
  const area = formatFieldArea(field);

  const meta = [status, variety, area, size === 'page' ? stage : null].filter(Boolean);

  return (
    <div className={`field-identity field-identity--${size}`}>
      {size === 'page' ? (
        <h1 className="field-identity-name">{field.name}</h1>
      ) : (
        <h2 className="field-identity-name">{field.name}</h2>
      )}
      {shortLocation ? <p className="field-identity-place">{shortLocation}</p> : null}
      {showMeta && meta.length > 0 ? (
        <p className="field-identity-meta">
          {meta.map((part, index) => (
            <React.Fragment key={`${part}-${index}`}>
              {index > 0 ? <span className="field-identity-dot" aria-hidden> · </span> : null}
              <span>{part}</span>
            </React.Fragment>
          ))}
        </p>
      ) : null}
    </div>
  );
};

export default FieldIdentity;
