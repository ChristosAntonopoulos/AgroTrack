import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import FamilyAccessFields from './FamilyAccessFields';
import {
  DEFAULT_FIELD_MODULES,
  FieldAccessLevel,
  FieldInvite,
  FieldModule,
  fieldPeopleService,
} from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../utils/translateApiError';

type Props = {
  open?: boolean;
  fieldId: string;
  fieldName?: string;
  initialName?: string;
  initialEmail?: string;
  onClose: () => void;
  onCreated?: (invite: FieldInvite) => void;
};

const AddFamilySheet: React.FC<Props> = ({
  open = true,
  fieldId,
  fieldName,
  initialName = '',
  initialEmail = '',
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [modules, setModules] = useState<FieldModule[]>([...DEFAULT_FIELD_MODULES]);
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>('view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FieldInvite | null>(null);

  const toggleModule = (module: FieldModule) => {
    setModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const canSubmit = Boolean(fieldId && name.trim() && email.trim() && modules.length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      setSaving(true);
      setError(null);
      const created = await fieldPeopleService.createInvite(fieldId, {
        role: 'Family',
        displayName: name.trim(),
        email: email.trim(),
        modules,
        accessLevel,
      });
      setInvite(created);
      onCreated?.(created);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnersSheet
      open={open}
      title={t('partners:family.addMember')}
      subtitle={
        invite
          ? t('partners:family.inviteReady')
          : fieldName
            ? t('partners:fieldContext', { field: fieldName })
            : t('partners:family.addHint')
      }
      onClose={onClose}
      footer={
        invite ? undefined : (
          <div className="partners-sheet-actions">
            <Button type="submit" form="add-family-form" loading={saving} disabled={!canSubmit || saving}>
              {saving ? t('partners:inviteSending') : t('partners:family.sendInvite')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common:cancel')}
            </Button>
          </div>
        )
      }
    >
      {invite ? (
        <FamilySharePanel invite={invite} onDone={onClose} />
      ) : (
          <form id="add-family-form" className="partners-form family-invite-form" onSubmit={submit}>
          <div className="family-form-section">
            <label>
              <span>{t('partners:inviteName')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'add-family-error' : undefined}
              />
            </label>
            <label>
              <span>{t('partners:inviteEmail')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'add-family-error' : undefined}
              />
            </label>
            <p className="family-form-hint">{t('partners:family.contactHint')}</p>
          </div>

          <FamilyAccessFields
            modules={modules}
            accessLevel={accessLevel}
            role="Family"
            onToggleModule={toggleModule}
            onSetLevel={setAccessLevel}
          />

          {error ? (
            <div id="add-family-error" className="error-message" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      )}
    </PartnersSheet>
  );
};

export default AddFamilySheet;
