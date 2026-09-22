import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FAMILY_MODULES,
  FieldAccessLevel,
  FieldModule,
  capabilitiesForAccess,
} from '../../services/fieldPeopleService';

type Props = {
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  /** Role used when deriving capability preview (defaults to Family). */
  role?: 'Family' | 'Partner';
  radioName?: string;
  onToggleModule: (module: FieldModule) => void;
  onSetLevel: (level: FieldAccessLevel) => void;
};

const LEVELS: FieldAccessLevel[] = ['view', 'help', 'work'];

/** Documents stay stored by the API but are not offered in the picker this cycle. */
const PICKABLE_MODULES: FieldModule[] = FAMILY_MODULES.filter((m) => m !== 'documents');

const FamilyAccessFields: React.FC<Props> = ({
  modules,
  accessLevel,
  role = 'Family',
  radioName = 'family-access-level',
  onToggleModule,
  onSetLevel,
}) => {
  const { t } = useTranslation('partners');
  const uid = React.useId();
  const modulesLabelId = `${uid}-modules`;
  const levelLabelId = `${uid}-level`;

  const preview = useMemo(() => {
    const caps = capabilitiesForAccess(role, modules, accessLevel);
    const can: string[] = [];
    const cannot: string[] = [];

    for (const module of PICKABLE_MODULES) {
      const label = t(`family.modules.${module}`);
      const on = modules.includes(module);
      if (!on) {
        cannot.push(t('family.preview.cannotOpen', { module: label }));
        continue;
      }
      switch (module) {
        case 'fields':
          can.push(t('family.preview.canOpen', { module: label }));
          break;
        case 'tasks':
          if (caps.canManageTasks) can.push(t('family.preview.canManageTasks'));
          else if (caps.canViewTasks) can.push(t('family.preview.canViewTasks'));
          break;
        case 'photos':
          if (caps.canUploadPhotos) can.push(t('family.preview.canUploadPhotos'));
          else if (caps.canViewPhotos) can.push(t('family.preview.canViewPhotos'));
          break;
        case 'money':
          can.push(caps.canViewMoney ? t('family.preview.canViewMoney') : t('family.preview.canOpen', { module: label }));
          break;
        case 'chronologio':
          can.push(
            caps.canViewChronologio
              ? t('family.preview.canViewChronologio')
              : t('family.preview.canOpen', { module: label })
          );
          break;
        case 'harvest':
          can.push(
            caps.canViewHarvest ? t('family.preview.canViewHarvest') : t('family.preview.canOpen', { module: label })
          );
          break;
        default:
          can.push(t('family.preview.canOpen', { module: label }));
      }
    }

    if (caps.canCreateRecords) {
      can.push(t('family.preview.canCreateRecords'));
    } else {
      cannot.push(t('family.preview.cannotCreateRecords'));
    }

    if (accessLevel === 'view') {
      cannot.push(t('family.preview.cannotChangeData'));
    } else if (accessLevel === 'help') {
      cannot.push(t('family.preview.cannotCreateTasks'));
    }

    if (!caps.canManageAccess) {
      cannot.push(t('family.preview.cannotManageAccess'));
    }

    return { can, cannot };
  }, [accessLevel, modules, role, t]);

  return (
    <>
      <div className="family-form-section">
        <p className="family-form-label" id={modulesLabelId}>
          {t('family.partsTitle')}
        </p>
        <p className="family-form-hint">{t('family.modulesHint')}</p>
        <div className="family-module-grid" role="group" aria-labelledby={modulesLabelId}>
          {PICKABLE_MODULES.map((module) => {
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

      <div className="family-form-section family-calculated-access" aria-live="polite">
        <p className="family-form-label">{t('family.preview.title')}</p>
        <p className="family-preview-heading">{t('family.preview.willBeAble')}</p>
        <ul className="family-calculated-modules">
          {preview.can.length > 0 ? (
            preview.can.map((line) => <li key={line}>{line}</li>)
          ) : (
            <li>{t('family.preview.nothingSelected')}</li>
          )}
        </ul>
        <p className="family-preview-heading">{t('family.preview.willNotBeAble')}</p>
        <ul className="family-calculated-modules family-calculated-modules-cannot">
          {preview.cannot.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default FamilyAccessFields;
