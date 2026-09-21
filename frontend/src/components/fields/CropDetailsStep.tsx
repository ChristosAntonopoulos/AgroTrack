import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';

const VARIETY_OPTIONS = ['Koroneiki', 'Kalamon', 'Megaritiki', 'Manaki', 'Unknown', 'Other'];

interface Props {
  formData: CreateFieldDto;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const CropDetailsStep: React.FC<Props> = ({ formData, onChange }) => {
  const { t } = useTranslation('fields');

  return (
    <div className="field-form-panel">
      <h2>{t('addField.steps.crop')}</h2>
      <p className="field-form-panel-desc">{t('addField.cropDesc')}</p>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="treeCount">{t('addField.treeCount')}</label>
          <input
            type="number"
            id="treeCount"
            name="treeCount"
            min="0"
            value={formData.treeCount ?? ''}
            onChange={onChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="variety">{t('addField.oliveVariety')}</label>
          <select id="variety" name="variety" value={formData.variety || ''} onChange={onChange}>
            <option value="">{t('addField.selectOption', { defaultValue: 'Select…' })}</option>
            {VARIETY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {t(`addField.varietyOptions.${v}`, { defaultValue: v })}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CropDetailsStep;
