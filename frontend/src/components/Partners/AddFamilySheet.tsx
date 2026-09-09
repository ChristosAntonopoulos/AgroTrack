import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import FamilyAccessFields from './FamilyAccessFields';
import {
  CreateFamilyInvitePayload,
  DEFAULT_FAMILY_MODULES,
  FamilyAccessLevel,
  FamilyInviteShare,
  FamilyModule,
  familyService,
} from '../../services/familyService';
import { getApiErrorMessage } from '../../utils/translateApiError';

type Props = {
  onClose: () => void;
  onCreated?: () => void;
};

const AddFamilySheet: React.FC<Props> = ({ onClose, onCreated }) => {
  const { t } = useTranslation(['partners', 'common']);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [modules, setModules] = useState<FamilyModule[]>([...DEFAULT_FAMILY_MODULES]);
  const [accessLevel, setAccessLevel] = useState<FamilyAccessLevel>('view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FamilyInviteShare | null>(null);

  const toggleModule = (module: FamilyModule) => {
    setModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const canSubmit = Boolean(name.trim() && (phone.trim() || email.trim()) && modules.length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const payload: CreateFamilyInvitePayload = {
      displayName: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      modules,
      accessLevel,
    };
    try {
      setSaving(true);
      setError(null);
      const created = await familyService.createInvite(payload);
      setInvite(created);
      onCreated?.();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnersSheet
      title={t('partners:family.addMember')}
      subtitle={invite ? t('partners:family.inviteReady') : t('partners:family.addHint')}
      onClose={onClose}
      footer={
        invite ? undefined : (
          <div className="partners-sheet-actions">
            <Button type="submit" form="add-family-form" loading={saving} disabled={!canSubmit}>
              {t('partners:family.sendInvite')}
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
              />
            </label>
            <div className="partners-form-row">
              <label>
                <span>{t('partners:invitePhone')}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
              <label>
                <span>{t('partners:inviteEmail')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
            </div>
            <p className="family-form-hint">{t('partners:family.contactHint')}</p>
          </div>

          <FamilyAccessFields
            modules={modules}
            accessLevel={accessLevel}
            onToggleModule={toggleModule}
            onSetLevel={setAccessLevel}
          />

          {error ? <div className="error-message">{error}</div> : null}
        </form>
      )}
    </PartnersSheet>
  );
};

export default AddFamilySheet;
