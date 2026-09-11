import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import FieldScopeSelector from '../Chronologio/FieldScopeSelector';
import { UNASSIGNED_FIELD_QUERY } from '../../finance/buildYearSummary';
import { unassignedFieldLabel } from '../../finance/display';
import type { Field } from '../../services/fieldService';
import '../Chronologio/Chronologio.css';
import './Money.css';

type Props = {
  fields: Field[];
  fieldId: string;
  onFieldChange: (fieldId: string) => void;
  onCapture?: () => void;
};

const MoneyPageHeader: React.FC<Props> = ({ fields, fieldId, onFieldChange, onCapture }) => {
  const { t, i18n } = useTranslation(['money', 'chronologio']);
  return (
    <header className="money-page-header">
      <div className="money-header-copy">
        <h1>{t('money:title')}</h1>
        <p className="money-tagline">{t('money:subtitle')}</p>
      </div>
      <div className="money-header-actions">
        <FieldScopeSelector
          fields={fields}
          value={fieldId}
          onChange={onFieldChange}
          id="money-field-select"
          extras={[
            { value: UNASSIGNED_FIELD_QUERY, label: unassignedFieldLabel(i18n.language) },
          ]}
        />
        {onCapture ? (
          <button type="button" className="money-capture-cta" onClick={onCapture}>
            <Plus size={18} aria-hidden />
            {t('chronologio:captureNew')}
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default MoneyPageHeader;
