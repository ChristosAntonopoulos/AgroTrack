import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldModule } from '../../services/fieldPeopleService';
import {
  modulesForRelationship,
  modulesMatchRelationship,
  SUMMARY_MODULES} from '../../people/aggregatePeople';
import { PICKABLE_MODULES } from '../Partners/accessPreview';

type Relationship = 'Family' | 'Collaborator';

type Props = {
  relationship: Relationship;
  modules: FieldModule[];
  /** When the seat is still legacy help and the owner has not picked a new preset. */
  legacyHelp?: boolean;
  onChangeModules: (modules: FieldModule[]) => void;
  /** Optional: applying a relationship preset (invite/edit). */
  onApplyRelationshipPreset?: (relationship: Relationship) => void;
};

const moduleEffectKey = (module: FieldModule, relationship: Relationship): string => {
  if (relationship === 'Family') return `partners:peoplePage.moduleEffect.${module}.view`;
  if (module === 'tasks') return `partners:peoplePage.moduleEffect.${module}.work`;
  return `partners:peoplePage.moduleEffect.${module}.record`;
};

/**
 * Relationship preset summary + optional area exceptions.
 * Live summary is built from the checked modules, not from static preset copy.
 */
const FieldPermissionPanel: React.FC<Props> = ({
  relationship,
  modules,
  legacyHelp = false,
  onChangeModules,
  onApplyRelationshipPreset}) => {
  const { t } = useTranslation(['partners', 'common']);
  const uid = useId();
  const summaryId = `${uid}-summary`;
  const areasId = `${uid}-areas`;
  const customized = !modulesMatchRelationship(relationship, modules);
  const [customizeOpen, setCustomizeOpen] = useState(customized || legacyHelp);

  const summaryLabels = useMemo(() => {
    const labels = SUMMARY_MODULES.filter((module) => modules.includes(module)).map((module) =>
      t(`partners:peoplePage.modules.${module}`)
    );
    if (modules.includes('harvest')) {
      labels.push(t('partners:peoplePage.modules.oilStore'));
    }
    return labels;
  }, [modules, t]);

  const applyPreset = () => {
    onChangeModules(modulesForRelationship(relationship));
    onApplyRelationshipPreset?.(relationship);
    setCustomizeOpen(false);
  };

  const toggleModule = (module: FieldModule) => {
    const next = modules.includes(module)
      ? modules.filter((item) => item !== module)
      : [...modules, module];
    // Grove shell stays available so the person can open the field.
    if (!next.includes('fields')) next.unshift('fields');
    onChangeModules(next);
  };

  return (
    <div className="perm-panel">
      {legacyHelp ? <p className="people-note">{t('partners:peoplePage.legacyHelp')}</p> : null}

      <section className="perm-preview" aria-labelledby={summaryId} aria-live="polite">
        <h3 className="perm-label" id={summaryId}>
          {t('partners:peoplePage.accessSummary')}
        </h3>
        {customized ? (
          <p className="perm-limits">{t('partners:peoplePage.customizedHint')}</p>
        ) : (
          <p className="perm-hint">
            {t(`partners:peoplePage.relationshipPresetHint.${relationship}`)}
          </p>
        )}
        <ul className="perm-preview-can">
          {summaryLabels.length > 0 ? (
            summaryLabels.map((label) => (
              <li key={label}>
                <span className="perm-summary-bullet" aria-hidden />
                <span>{label}</span>
              </li>
            ))
          ) : (
            <li>
              <span className="perm-summary-bullet" aria-hidden />
              <span>{t('partners:peoplePage.noModulesSelected')}</span>
            </li>
          )}
        </ul>
        <p className="perm-footnote">{t('partners:peoplePage.baselineLimitsShort')}</p>
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
                  <button type="button" className="people-text-button" onClick={applyPreset}>
                    {t('partners:peoplePage.resetPreset')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="people-text-button"
                  onClick={() => setCustomizeOpen(false)}
                >
                  {t('common:done')}
                </button>
              </div>
            </div>
            <p className="perm-hint">{t('partners:peoplePage.areasHint')}</p>
            <ul className="perm-module-list">
              {PICKABLE_MODULES.filter((module) => module !== 'fields').map((module) => {
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
                            ? t(moduleEffectKey(module, relationship))
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

export const modulesMatchPreset = modulesMatchRelationship;

export default FieldPermissionPanel;
