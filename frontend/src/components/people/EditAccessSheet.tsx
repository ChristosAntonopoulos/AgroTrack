import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  levelForModules,
  modulesForRelationship,
  modulesMatchRelationship,
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
  const [selected, setSelected] = useState<FieldModule[]>(
    current.modules.length > 0
      ? current.modules
      : modulesForRelationship(current.relationship === 'Partner' ? 'Collaborator' : 'Family')
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadField = (nextId: string) => {
    const next = memberships.find((row) => row.fieldId === nextId);
    if (!next) return;
    setFieldId(next.fieldId);
    const nextRole = next.relationship === 'Partner' ? 'Collaborator' : 'Family';
    setRole(nextRole);
    setSelected(
      next.modules.length > 0 ? next.modules : modulesForRelationship(nextRole)
    );
    setError('');
  };

  const pickRole = (next: 'Family' | 'Collaborator') => {
    setRole(next);
    setSelected(modulesForRelationship(next));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    const modules =
      selected.length > 0 ? selected : modulesForRelationship(role);
    const accessLevel = levelForModules(modules, role);
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
          <ul className="invite-option-list" role="radiogroup" aria-label={t('partners:peoplePage.grovesWithAccess')}>
            {memberships.map((row) => {
              const on = row.fieldId === fieldId;
              const rowRole = row.relationship === 'Partner' ? 'Collaborator' : 'Family';
              return (
                <li key={row.fieldId}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`invite-option${on ? ' is-on' : ''}`}
                    onClick={() => loadField(row.fieldId)}
                  >
                    <span className={`perm-radio-dot${on ? ' is-on' : ''}`} aria-hidden />
                    <span className="invite-option-copy">
                      <strong>{row.fieldName}</strong>
                      <span>
                        {t(`partners:peoplePage.relationship.${rowRole}`)}
                        {!modulesMatchRelationship(rowRole, row.modules)
                          ? ` · ${t('partners:peoplePage.customizedShort')}`
                          : ''}
                      </span>
                    </span>
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
        <h3 className="perm-label" id="edit-relationship-label">
          {t('partners:peoplePage.relationshipTitle')}
        </h3>
        <p className="perm-hint">{t('partners:peoplePage.relationshipPickHint')}</p>
        <div
          className="perm-choice-list"
          role="radiogroup"
          aria-labelledby="edit-relationship-label"
        >
          {(['Collaborator', 'Family'] as const).map((option) => {
            const selectedRole = role === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selectedRole}
                className={`perm-choice${selectedRole ? ' is-on' : ''}`}
                onClick={() => pickRole(option)}
              >
                <span className={`perm-radio-dot${selectedRole ? ' is-on' : ''}`} aria-hidden />
                <span className="perm-choice-copy">
                  <strong>{t(`partners:peoplePage.relationship.${option}`)}</strong>
                  <span>{t(`partners:peoplePage.relationshipHint.${option}`)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <FieldPermissionPanel
        key={`${fieldId}-${role}`}
        relationship={role}
        modules={selected}
        legacyHelp={current.accessLevel === 'help'}
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
