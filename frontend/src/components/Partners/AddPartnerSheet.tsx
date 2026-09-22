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
  initialName?: string;
  initialEmail?: string;
  onClose: () => void;
  onCreated?: (invite: FieldInvite) => void;
};

const AddPartnerSheet: React.FC<Props> = ({
  open = true,
  fieldId,
  initialName = '',
  initialEmail = '',
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [modules, setModules] = useState<FieldModule[]>([...DEFAULT_FIELD_MODULES]);
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>('work');
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
        role: 'Partner',
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
      title={t('partners:ownerPartner.addPartner')}
      subtitle={invite ? t('partners:ownerPartner.inviteReady') : t('partners:ownerPartner.addHint')}
      onClose={onClose}
      footer={
        invite ? undefined : (
          <div className="partners-sheet-actions">
            <Button type="submit" form="add-partner-form" loading={saving} disabled={!canSubmit}>
              {t('partners:ownerPartner.sendInvite')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common:cancel')}
            </Button>
          </div>
        )
      }
    >
      {invite ? (
        <FamilySharePanel invite={invite} copyNs="ownerPartner" onDone={onClose} />
      ) : (
        <form id="add-partner-form" className="partners-form family-invite-form" onSubmit={submit}>
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
                aria-describedby={error ? 'add-partner-error' : undefined}
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
                aria-describedby={error ? 'add-partner-error' : undefined}
              />
            </label>
            <p className="family-form-hint">{t('partners:ownerPartner.contactHint')}</p>
          </div>

          <FamilyAccessFields
            modules={modules}
            accessLevel={accessLevel}
            role="Partner"
            radioName="partner-access-level"
            onToggleModule={toggleModule}
            onSetLevel={setAccessLevel}
          />

          {error ? (
            <div id="add-partner-error" className="error-message" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      )}
    </PartnersSheet>
  );
};

export default AddPartnerSheet;
