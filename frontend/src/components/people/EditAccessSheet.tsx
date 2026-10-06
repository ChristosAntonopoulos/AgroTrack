import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import Button from '../Common/Button';
import PartnersSheet from '../Partners/PartnersSheet';
import FieldPermissionPanel from './FieldPermissionPanel';
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
  onRemove?: (fieldId: string) => void;
};

const EditAccessSheet: React.FC<Props> = ({
  open = true,
  personName,
  userId,
  memberships,
  activeFieldId,
  onClose,
  onSaved,
  onRemove,
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
  const [pickedPreset, setPickedPreset] = useState(
    choiceFromAccess(current.accessLevel, current.modules) != null
  );
  const [selected, setSelected] = useState<FieldModule[]>(
    current.modules.length > 0 ? current.modules : modulesForChoice('view')
  );
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
    setSelected(next.modules.length > 0 ? next.modules : modulesForChoice(nextChoice || 'view'));
    setError('');
  };

  const pickChoice = (next: AccessChoice) => {
    setPickedPreset(true);
    setChoice(next);
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    const keepLegacy = current.accessLevel === 'help' && !pickedPreset;
    const accessLevel = keepLegacy ? 'help' : levelForChoice(choice || 'view');
    const modules = keepLegacy
      ? current.modules
      : selected.length > 0
        ? selected
        : modulesForChoice(choice || 'view');
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
      size="lg"
      kicker={current.fieldName}
      title={t('partners:peoplePage.editTitle', { name: personName })}
      subtitle={t('partners:peoplePage.editHint')}
      onClose={onClose}
      footer={
        <div className="invite-footer">
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

      <section className="perm-section">
        <h3 className="perm-label">{t('partners:peoplePage.grovesWithAccess')}</h3>
        {memberships.length > 1 ? (
          <ul className="invite-option-list">
            {memberships.map((row) => {
              const on = row.fieldId === fieldId;
              return (
                <li key={row.fieldId}>
                  <button
                    type="button"
                    className={`invite-option${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => loadField(row.fieldId)}
                  >
                    <span className="invite-option-copy">
                      <strong>{row.fieldName}</strong>
                      <span>
                        {t(`partners:peoplePage.capability.${choiceFromAccess(row.accessLevel, row.modules) || 'help'}`)}
                      </span>
                    </span>
                    {on ? <Check size={18} aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="people-note">{current.fieldName}</p>
        )}
      </section>

      <section className="perm-section">
        <h3 className="perm-label">{t('partners:peoplePage.relationshipTitle')}</h3>
        <div className="perm-choice-list">
          {(['Family', 'Collaborator'] as const).map((option) => {
            const selectedRole = role === option;
            return (
              <button
                key={option}
                type="button"
                className={`perm-choice${selectedRole ? ' is-on' : ''}`}
                aria-pressed={selectedRole}
                onClick={() => setRole(option)}
              >
                <span className="perm-choice-copy">
                  <strong>{t(`partners:peoplePage.relationship.${option}`)}</strong>
                  <span>{t(`partners:peoplePage.relationshipHint.${option}`)}</span>
                </span>
                {selectedRole ? <Check size={18} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <FieldPermissionPanel
        choice={choice}
        modules={selected}
        role={role === 'Collaborator' ? 'Partner' : 'Family'}
        legacyHelp={current.accessLevel === 'help' && !pickedPreset}
        previewMode="edit"
        onPickChoice={pickChoice}
        onChangeModules={setSelected}
      />

      {onRemove ? (
        <div className="people-remove-block">
          <button
            type="button"
            className="people-text-button is-danger"
            disabled={saving}
            onClick={() => onRemove(fieldId)}
          >
            {t('partners:peoplePage.removeAccess')}
          </button>
        </div>
      ) : null}
    </PartnersSheet>
  );
};

export default EditAccessSheet;
