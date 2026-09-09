import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FAMILY_MODULES,
  FamilyAccessLevel,
  FamilyModule,
} from '../../services/familyService';

type Props = {
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
  radioName?: string;
  onToggleModule: (module: FamilyModule) => void;
  onSetLevel: (level: FamilyAccessLevel) => void;
};

const LEVELS: FamilyAccessLevel[] = ['view', 'help', 'work'];

const FamilyAccessFields: React.FC<Props> = ({
  modules,
  accessLevel,
  radioName = 'family-access-level',
  onToggleModule,
  onSetLevel,
}) => {
  const { t } = useTranslation('partners');
  const uid = React.useId();
  const modulesLabelId = `${uid}-modules`;
  const levelLabelId = `${uid}-level`;

  return (
    <>
      <div className="family-form-section">
        <p className="family-form-label" id={modulesLabelId}>
          {t('family.partsTitle')}
        </p>
        <div className="family-module-grid" role="group" aria-labelledby={modulesLabelId}>
          {FAMILY_MODULES.map((module) => {
            const on = modules.includes(module);
            return (
              <label key={module} className={`family-module-chip${on ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  className="family-input-hidden"
                  checked={on}
                  onChange={() => onToggleModule(module)}
                />
                {t(`family.modules.${module}`)}
              </label>
            );
          })}
        </div>
      </div>

      <div className="family-form-section">
        <p className="family-form-label" id={levelLabelId}>
          {t('family.levelTitle')}
        </p>
        <div className="family-level-grid" role="radiogroup" aria-labelledby={levelLabelId}>
          {LEVELS.map((level) => {
            const on = accessLevel === level;
            return (
              <label key={level} className={`family-level-card${on ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  className="family-input-hidden"
                  name={radioName}
                  checked={on}
                  onChange={() => onSetLevel(level)}
                />
                <strong>{t(`family.levels.${level}`)}</strong>
                <span>{t(`family.levelHints.${level}`)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default FamilyAccessFields;
