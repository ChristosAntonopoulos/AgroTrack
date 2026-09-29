import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import PartnersSheet from '../Partners/PartnersSheet';
import {
  FieldAccessLevel,
  FieldModule,
  FieldPersonRole,
  fieldPeopleService,
} from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import {
  AccessChoice,
  choiceFromAccess,
  levelForChoice,
  modulesForChoice,
  VISIBLE_MODULES,
} from '../../people/aggregatePeople';

export type EditableMembership = {
  fieldId: string;
  fieldName: string;
  relationship: FieldPersonRole;
  accessLevel: FieldAccessLevel;
  modules: FieldModule[];
};

type Props = {
  open?: boolean;
  personName: string;
  userId: string;
  memberships: EditableMembership[];
  activeFieldId: string;
  onClose: () => void;
  onSaved: () => void;
};

const EditAccessSheet: React.FC<Props> = ({
  open = true,
  personName,
  userId,
  memberships,
  activeFieldId,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const initial = memberships.find((row) => row.fieldId === activeFieldId) || memberships[0];
  const [fieldId, setFieldId] = useState(initial.fieldId);
  const current = memberships.find((row) => row.fieldId === fieldId) || initial;
  const [role, setRole] = useState<'Family' | 'Collaborator'>(
    current.relationship === 'Partner' ? 'Collaborator' : 'Family'
  );
  const [choice, setChoice] = useState<AccessChoice | null>(
    choiceFromAccess(current.accessLevel, current.modules)
  );
  const [pickedPreset, setPickedPreset] = useState(choiceFromAccess(current.accessLevel, current.modules) != null);
  const [selected, setSelected] = useState<FieldModule[]>(current.modules);
  const [customize, setCustomize] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadField = (nextId: string) => {
    const next = memberships.find((row) => row.fieldId === nextId);
    if (!next) return;
    setFieldId(next.fieldId);
    setRole(next.relationship === 'Partner' ? 'Collaborator' : 'Family');
    const nextChoice = choiceFromAccess(next.accessLevel, next.modules);
    setChoice(nextChoice);
    setPickedPreset(nextChoice != null);
    setSelected(next.modules);
    setCustomize(false);
    setError('');
  };

  const pickChoice = (next: AccessChoice) => {
    setPickedPreset(true);
    setChoice(next);
    setSelected(modulesForChoice(next));
  };

  const toggleModule = (module: FieldModule) => {
    setSelected((rows) => (rows.includes(module) ? rows.filter((item) => item !== module) : [...rows, module]));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    const keepLegacy = current.accessLevel === 'help' && !pickedPreset;
    const accessLevel = keepLegacy ? 'help' : levelForChoice(choice || 'view');
    const modules = keepLegacy ? current.modules : selected;
    try {
      await fieldPeopleService.updatePerson(fieldId, userId, {
        role,
        accessLevel,
        modules,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnersSheet
      open={open}
      kicker={current.fieldName}
      title={t('partners:peoplePage.editTitle', { name: personName })}
      subtitle={t('partners:peoplePage.editHint')}
      onClose={onClose}
      footer={
        <div className="people-sheet-actions">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common:cancel')}
          </Button>
          <Button variant="primary" onClick={() => void save()} loading={saving} disabled={!userId}>
            {t('partners:saveAccess')}
          </Button>
        </div>
      }
    >
      {error ? <p className="people-error">{error}</p> : null}
      {memberships.length > 1 ? (
        <label className="people-label">
          {t('partners:peoplePage.thisGrove')}
          <select className="people-select" value={fieldId} onChange={(event) => loadField(event.target.value)}>
            {memberships.map((row) => (
              <option key={row.fieldId} value={row.fieldId}>
                {row.fieldName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="people-choice-list">
        {(['Family', 'Collaborator'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`people-choice${role === option ? ' is-on' : ''}`}
            onClick={() => setRole(option)}
          >
            <strong>{t(`partners:peoplePage.relationship.${option}`)}</strong>
          </button>
        ))}
      </div>
      {current.accessLevel === 'help' && !pickedPreset ? (
        <p className="people-note">{t('partners:peoplePage.legacyHelp')}</p>
      ) : null}
      <div className="people-choice-list">
        {(['view', 'record', 'work'] as AccessChoice[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`people-choice${choice === option ? ' is-on' : ''}`}
            onClick={() => pickChoice(option)}
          >
            <strong>{t(`partners:peoplePage.preset.${option}`)}</strong>
            <span>{t(`partners:peoplePage.presetHint.${option}`)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="people-text-button" onClick={() => setCustomize((value) => !value)}>
        {t('partners:peoplePage.customize')}
      </button>
      {customize ? (
        <ul className="people-check-list">
          {VISIBLE_MODULES.map((module) => (
            <li key={module}>
              <label className="people-check">
                <input type="checkbox" checked={selected.includes(module)} onChange={() => toggleModule(module)} />
                <span>{t(`partners:peoplePage.modules.${module}`)}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </PartnersSheet>
  );
};

export default EditAccessSheet;
