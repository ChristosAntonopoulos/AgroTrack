import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';
import VarietySelect from './VarietySelect';

const VARIETY_OPTIONS = ['Koroneiki', 'Kalamon', 'Megaritiki', 'Manaki', 'Unknown', 'Other'];

interface Props {
  formData: CreateFieldDto;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  /** When true, omit the outer panel heading (nested in edit form). */
  nested?: boolean;
}

const CropDetailsStep: React.FC<Props> = ({ formData, onChange, nested = false }) => {
  const { t } = useTranslation('fields');

  const varietyOptions = VARIETY_OPTIONS.map((v) => ({
    value: v,
    label: t(`addField.varietyOptions.${v}`, { defaultValue: v }),
  }));

  const body = (
    <>
      {!nested ? (
        <>
          <h2>{t('createGrove.levels.details')}</h2>
          <p className="field-form-panel-desc">{t('createGrove.details.subtitle')}</p>
        </>
      ) : null}

      <div className="crop-details-row">
        <div className="form-group crop-details-field">
          <label htmlFor="variety">{t('addField.oliveVariety')}</label>
          <VarietySelect
            id="variety"
            name="variety"
            value={formData.variety || ''}
            options={varietyOptions}
            placeholder={t('addField.selectOption', { defaultValue: 'Select…' })}
            onChange={(e) =>
              onChange({
                target: { name: e.target.name, value: e.target.value },
              } as React.ChangeEvent<HTMLSelectElement>)
            }
          />
        </div>
        <div className="form-group crop-details-field">
          <label htmlFor="treeCount">{t('createGrove.details.treeCountLabel')}</label>
          <input
            type="number"
            id="treeCount"
            name="treeCount"
            min="0"
            inputMode="numeric"
            value={formData.treeCount ?? ''}
            onChange={onChange}
          />
        </div>
      </div>
    </>
  );

  if (nested) return <div className="crop-details-nested">{body}</div>;
  return <div className="field-form-panel">{body}</div>;
};

export default CropDetailsStep;
