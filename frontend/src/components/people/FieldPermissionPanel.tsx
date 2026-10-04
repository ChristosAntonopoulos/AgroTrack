import React, { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { FieldAccessLevel, FieldModule } from '../../services/fieldPeopleService';
import {
  AccessChoice,
  levelForChoice,
  modulesForChoice,
} from '../../people/aggregatePeople';
import {
  PICKABLE_MODULES,
  PreviewLine,
  buildAccessPreview,
} from '../Partners/accessPreview';

type Props = {
  choice: AccessChoice | null;
  modules: FieldModule[];
  /** Stored role for capability preview. */
  role?: 'Family' | 'Partner';
  /** When the seat is still legacy help and the owner has not picked a new preset. */
  legacyHelp?: boolean;
  previewMode?: 'edit' | 'invite';
  onPickChoice: (choice: AccessChoice) => void;
  onChangeModules: (modules: FieldModule[]) => void;
};

const CHOICES: AccessChoice[] = ['view', 'record', 'work'];

const moduleEffectKey = (module: FieldModule, choice: AccessChoice | null): string => {
  if (!choice) return `partners:peoplePage.moduleEffect.${module}.off`;
  if (choice === 'view') return `partners:peoplePage.moduleEffect.${module}.view`;
  if (choice === 'record') return `partners:peoplePage.moduleEffect.${module}.record`;
  return `partners:peoplePage.moduleEffect.${module}.work`;
};

/**
 * Grove permission editor: action depth + every product area + live can/cannot summary.
 */
const FieldPermissionPanel: React.FC<Props> = ({
  choice,
  modules,
  role = 'Family',
  legacyHelp = false,
  previewMode = 'edit',
  onPickChoice,
  onChangeModules,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const uid = useId();
  const actionId = `${uid}-action`;
  const areasId = `${uid}-areas`;
  const previewId = `${uid}-preview`;

  const accessLevel: FieldAccessLevel = legacyHelp ? 'help' : levelForChoice(choice || 'view');
  const preview = useMemo(
    () => buildAccessPreview(role, modules, accessLevel),
    [accessLevel, modules, role]
  );
  const canLines = preview.filter((line) => line.kind === 'can');
  const cannotLines = preview.filter(
    (line) =>
      line.kind === 'cannot' &&
      line.key !== 'family.preview.cannotSeeModuleData' &&
      line.key !== 'family.preview.cannotOpen' &&
      line.key !== 'family.preview.cannotDeleteOthers' &&
      line.key !== 'family.preview.cannotManageAccess'
  );
  const closed = preview.filter(
    (line) =>
      (line.key === 'family.preview.cannotSeeModuleData' ||
        line.key === 'family.preview.cannotOpen') &&
      line.module
  );

  const applyPreset = (next: AccessChoice) => {
    const seeded = modulesForChoice(next);
    const keepMoney = modules.includes('money') ? (['money'] as FieldModule[]) : [];
    onPickChoice(next);
    onChangeModules([...seeded, ...keepMoney.filter((module) => !seeded.includes(module))]);
  };

  const toggleModule = (module: FieldModule) => {
    onChangeModules(
      modules.includes(module) ? modules.filter((item) => item !== module) : [...modules, module]
    );
  };

  const lineLabel = (line: PreviewLine) =>
    t(line.key, line.module ? { module: t(`partners:peoplePage.modules.${line.module}`) } : undefined);

  return (
    <div className="perm-panel">
      {legacyHelp ? <p className="people-note">{t('partners:peoplePage.legacyHelp')}</p> : null}

      <section className="perm-section" aria-labelledby={actionId}>
        <h3 className="perm-label" id={actionId}>
          {t('partners:peoplePage.actionTitle')}
        </h3>
        <p className="perm-hint">{t('partners:peoplePage.actionHint')}</p>
        <div className="perm-choice-list" role="radiogroup" aria-labelledby={actionId}>
          {CHOICES.map((option) => {
            const selected = choice === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`perm-choice${selected ? ' is-on' : ''}`}
                onClick={() => applyPreset(option)}
              >
                <span className="perm-choice-copy">
                  <strong>{t(`partners:peoplePage.preset.${option}`)}</strong>
                  <span>{t(`partners:peoplePage.presetHint.${option}`)}</span>
                </span>
                {selected ? <Check size={18} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="perm-section" aria-labelledby={areasId}>
        <h3 className="perm-label" id={areasId}>
          {t('partners:peoplePage.areasTitle')}
        </h3>
        <p className="perm-hint">{t('partners:peoplePage.areasHint')}</p>
        <ul className="perm-module-list">
          {PICKABLE_MODULES.map((module) => {
            const on = modules.includes(module);
            return (
              <li key={module}>
                <button
                  type="button"
                  className={`perm-module${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleModule(module)}
                >
                  <span className={`perm-check${on ? ' is-on' : ''}`} aria-hidden>
                    {on ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <span className="perm-module-copy">
                    <strong>{t(`partners:peoplePage.modules.${module}`)}</strong>
                    <span>
                      {on
                        ? t(moduleEffectKey(module, choice || 'view'))
                        : t('partners:peoplePage.moduleClosed')}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="perm-footnote">{t('partners:peoplePage.oilNote')}</p>
      </section>

      <section className="perm-preview" aria-labelledby={previewId} aria-live="polite">
        <h3 className="perm-label" id={previewId}>
          {t(
            previewMode === 'invite'
              ? 'partners:family.preview.title'
              : 'partners:family.preview.titleEdit'
          )}
        </h3>
        {canLines.length > 0 ? (
          <ul className="perm-preview-can">
            {canLines.map((line) => (
              <li key={line.id}>
                <Check size={13} strokeWidth={3} aria-hidden />
                <span>{lineLabel(line)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="perm-empty">{t('partners:family.preview.nothingSelected')}</p>
        )}
        {closed.length > 0 ? (
          <p className="perm-closed">
            {t('partners:family.preview.closedModules', {
              list: closed.map((line) => t(`partners:peoplePage.modules.${line.module}`)).join(' · '),
            })}
          </p>
        ) : null}
        {cannotLines.length > 0 ? (
          <p className="perm-limits">
            {t('partners:family.preview.extraLimits', {
              list: cannotLines.map((line) => lineLabel(line)).join(' · '),
            })}
          </p>
        ) : null}
        <p className="perm-footnote">{t('partners:family.preview.baselineLimits')}</p>
      </section>
    </div>
  );
};

export default FieldPermissionPanel;
