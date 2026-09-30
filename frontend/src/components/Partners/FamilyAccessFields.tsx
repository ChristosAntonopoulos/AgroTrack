import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { FieldAccessLevel, FieldModule } from '../../services/fieldPeopleService';
import {
  PICKABLE_MODULES,
  PreviewLine,
  buildAccessPreview,
  resolvedAccessLevel,
  tasksModuleEnabled,
} from './accessPreview';

type Props = {
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  /** Role used when deriving capability preview (defaults to Family). */
  role?: 'Family' | 'Partner';
  radioName?: string;
  previewMode?: 'edit' | 'invite';
  onToggleModule: (module: FieldModule) => void;
  onSetLevel: (level: FieldAccessLevel) => void;
};

const LEVELS: FieldAccessLevel[] = ['view', 'help', 'work'];
const CLOSED_KEY = 'family.preview.cannotSeeModuleData';
const BASELINE_KEYS = new Set([
  'family.preview.cannotDeleteOthers',
  'family.preview.cannotManageAccess',
]);

const FamilyAccessFields: React.FC<Props> = ({
  modules,
  accessLevel,
  role = 'Family',
  radioName = 'family-access-level',
  previewMode = 'invite',
  onToggleModule,
  onSetLevel,
}) => {
  const { t } = useTranslation('partners');
  const uid = React.useId();
  const modulesLabelId = `${uid}-modules`;
  const levelLabelId = `${uid}-level`;
  const tasksOn = tasksModuleEnabled(modules);
  const effectiveLevel = resolvedAccessLevel(modules, accessLevel);

  const preview = useMemo(
    () => buildAccessPreview(role, modules, effectiveLevel),
    [effectiveLevel, modules, role]
  );

  const canLines = preview.filter((line) => line.kind === 'can');
  const closedModules = preview.filter((line) => line.key === CLOSED_KEY && line.module);
  const extraLimits = preview.filter((line) => {
    if (line.kind !== 'cannot' || line.key === CLOSED_KEY || BASELINE_KEYS.has(line.key)) return false;
    if (effectiveLevel === 'view') return line.key === 'family.preview.cannotChangeData';
    return line.key !== 'family.preview.cannotChangeData';
  });

  const toggleModule = (module: FieldModule) => {
    const nextOn = !modules.includes(module);
    if (module === 'tasks' && !nextOn && accessLevel === 'help') {
      onSetLevel('view');
    }
    onToggleModule(module);
  };

  const setLevel = (level: FieldAccessLevel) => {
    if (level === 'help' && !tasksOn) return;
    onSetLevel(level);
  };

  const lineLabel = (line: PreviewLine) =>
    t(line.key, line.module ? { module: t(`family.modules.${line.module}`) } : undefined);

  return (
    <div className="family-access-fields">
      <section className="family-form-section" aria-labelledby={modulesLabelId}>
        <p className="family-form-label" id={modulesLabelId}>
          {t('family.partsTitle')}
        </p>
        <div className="family-module-grid" role="group" aria-labelledby={modulesLabelId}>
          {PICKABLE_MODULES.map((module) => {
            const on = modules.includes(module);
            return (
              <label key={module} className={`family-module-chip${on ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  className="family-input-hidden"
                  checked={on}
                  onChange={() => toggleModule(module)}
                />
                <span className="family-check" aria-hidden>
                  {on ? <Check size={14} strokeWidth={3} /> : null}
                </span>
                <span>{t(`family.modules.${module}`)}</span>
              </label>
            );
          })}
        </div>
        {modules.includes('photos') ? (
          <p className="family-form-hint">{t('family.modulesHint')}</p>
        ) : null}
      </section>

      <section className="family-form-section" aria-labelledby={levelLabelId}>
        <p className="family-form-label" id={levelLabelId}>
          {t('family.levelTitle')}
        </p>
        <div className="family-level-grid" role="radiogroup" aria-labelledby={levelLabelId}>
          {LEVELS.map((level) => {
            const on = effectiveLevel === level;
            const disabled = level === 'help' && !tasksOn;
            return (
              <label
                key={level}
                className={`family-level-card${on ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
              >
                <input
                  type="radio"
                  className="family-input-hidden"
                  name={radioName}
                  checked={on}
                  disabled={disabled}
                  onChange={() => setLevel(level)}
                />
                <span className="family-level-card-top">
                  <span className={`family-radio${on ? ' is-on' : ''}`} aria-hidden />
                  <strong>{t(`family.levels.${level}`)}</strong>
                </span>
                {on ? (
                  <span className="family-level-hint">{t(`family.levelHints.${level}`)}</span>
                ) : null}
                {disabled ? <span className="family-level-disabled">{t('family.helpNeedsTasks')}</span> : null}
              </label>
            );
          })}
        </div>
      </section>

      <section className="family-preview" aria-live="polite">
        <p className="family-form-label">
          {t(previewMode === 'edit' ? 'family.preview.titleEdit' : 'family.preview.title')}
        </p>
        {canLines.length > 0 ? (
          <ul className="family-preview-can">
            {canLines.map((line) => (
              <li key={line.id}>
                <Check size={13} strokeWidth={3} aria-hidden />
                {lineLabel(line)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="family-preview-empty">{t('family.preview.nothingSelected')}</p>
        )}
        {closedModules.length > 0 ? (
          <p className="family-preview-closed">
            {t('family.preview.closedModules', {
              list: closedModules.map((line) => t(`family.modules.${line.module}`)).join(' · '),
            })}
          </p>
        ) : null}
        {extraLimits.length > 0 ? (
          <p className="family-preview-limits">
            {t('family.preview.extraLimits', {
              list: extraLimits.map((line) => lineLabel(line)).join(' · '),
            })}
          </p>
        ) : null}
        <p className="family-preview-footnote">{t('family.preview.baselineLimits')}</p>
      </section>
    </div>
  );
};

export default FamilyAccessFields;
