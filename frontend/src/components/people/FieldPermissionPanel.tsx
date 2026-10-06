import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldModule } from '../../services/fieldPeopleService';
import {
  AccessChoice,
  modulesForChoice,
} from '../../people/aggregatePeople';
import { PICKABLE_MODULES } from '../Partners/accessPreview';

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

const sortedKey = (modules: FieldModule[]) =>
  [...modules].filter((module) => PICKABLE_MODULES.includes(module)).sort().join(',');

export const modulesMatchPreset = (choice: AccessChoice, modules: FieldModule[]) =>
  sortedKey(modules) === sortedKey(modulesForChoice(choice));

const moduleEffectKey = (module: FieldModule, choice: AccessChoice | null): string => {
  if (!choice) return `partners:peoplePage.moduleEffect.${module}.off`;
  if (choice === 'view') return `partners:peoplePage.moduleEffect.${module}.view`;
  if (choice === 'record') return `partners:peoplePage.moduleEffect.${module}.record`;
  return `partners:peoplePage.moduleEffect.${module}.work`;
};

/**
 * Simple access picker: one preset, a clear summary, optional area exceptions.
 */
const FieldPermissionPanel: React.FC<Props> = ({
  choice,
  modules,
  legacyHelp = false,
  onPickChoice,
  onChangeModules,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const uid = useId();
  const actionId = `${uid}-action`;
  const summaryId = `${uid}-summary`;
  const areasId = `${uid}-areas`;
  const activeChoice = choice || 'view';
  const customized = Boolean(choice) && !modulesMatchPreset(activeChoice, modules);
  const [customizeOpen, setCustomizeOpen] = useState(customized || legacyHelp);

  const summaryLines = useMemo(() => {
    const key = activeChoice;
    return [
      t(`partners:peoplePage.capability.${key}`),
      t(`partners:peoplePage.presetSummary.${key}.areas`),
      t(`partners:peoplePage.presetSummary.${key}.limits`),
    ];
  }, [activeChoice, t]);

  const applyPreset = (next: AccessChoice) => {
    onPickChoice(next);
    onChangeModules(modulesForChoice(next));
    setCustomizeOpen(false);
  };

  const toggleModule = (module: FieldModule) => {
    onChangeModules(
      modules.includes(module) ? modules.filter((item) => item !== module) : [...modules, module]
    );
  };

  const resetPreset = () => {
    if (!choice) return;
    onChangeModules(modulesForChoice(choice));
    setCustomizeOpen(false);
  };

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
                <span className={`perm-radio-dot${selected ? ' is-on' : ''}`} aria-hidden />
                <span className="perm-choice-copy">
                  <strong>{t(`partners:peoplePage.preset.${option}`)}</strong>
                  <span>{t(`partners:peoplePage.presetHint.${option}`)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="perm-preview" aria-labelledby={summaryId} aria-live="polite">
        <h3 className="perm-label" id={summaryId}>
          {t('partners:peoplePage.accessSummary')}
        </h3>
        <ul className="perm-preview-can">
          {summaryLines.map((line) => (
            <li key={line}>
              <span className="perm-summary-bullet" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        {customized ? (
          <p className="perm-limits">{t('partners:peoplePage.customizedHint')}</p>
        ) : (
          <p className="perm-footnote">{t('partners:peoplePage.baselineLimitsShort')}</p>
        )}
      </section>

      <div className="perm-customize">
        {!customizeOpen ? (
          <button
            type="button"
            className="people-text-button"
            onClick={() => setCustomizeOpen(true)}
          >
            {t('partners:peoplePage.customize')}
          </button>
        ) : (
          <section className="perm-section" aria-labelledby={areasId}>
            <div className="perm-customize-head">
              <h3 className="perm-label" id={areasId}>
                {t('partners:peoplePage.customize')}
              </h3>
              <div className="perm-customize-actions">
                {customized ? (
                  <button type="button" className="people-text-button" onClick={resetPreset}>
                    {t('partners:peoplePage.resetPreset')}
                  </button>
                ) : null}
                <button type="button" className="people-text-button" onClick={() => setCustomizeOpen(false)}>
                  {t('common:done', { defaultValue: 'Done' })}
                </button>
              </div>
            </div>
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
                        {on ? '✓' : null}
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
        )}
      </div>
    </div>
  );
};

export default FieldPermissionPanel;
