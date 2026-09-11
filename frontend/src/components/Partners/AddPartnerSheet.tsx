import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import FamilyAccessFields from './FamilyAccessFields';
import {
  CreateOwnerPartnerInvitePayload,
  DEFAULT_PARTNER_MODULES,
  OwnerPartnerInviteShare,
  ownerPartnerService,
} from '../../services/ownerPartnerService';
import { FamilyAccessLevel, FamilyModule } from '../../services/familyService';
import { getApiErrorMessage } from '../../utils/translateApiError';

type Props = {
  open?: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const AddPartnerSheet: React.FC<Props> = ({ open = true, onClose, onCreated }) => {
  const { t } = useTranslation(['partners', 'common']);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [modules, setModules] = useState<FamilyModule[]>([...DEFAULT_PARTNER_MODULES]);
  const [accessLevel, setAccessLevel] = useState<FamilyAccessLevel>('work');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<OwnerPartnerInviteShare | null>(null);

  const toggleModule = (module: FamilyModule) => {
    setModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const canSubmit = Boolean(name.trim() && (phone.trim() || email.trim()) && modules.length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const payload: CreateOwnerPartnerInvitePayload = {
      displayName: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      modules,
      accessLevel,
    };
    try {
      setSaving(true);
      setError(null);
      const created = await ownerPartnerService.createInvite(payload);
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
        <FamilySharePanel
          invite={{
            ...invite,
            memberId: invite.linkId,
          }}
          copyNs="ownerPartner"
          onDone={onClose}
        />
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
            <p className="family-form-hint">{t('partners:ownerPartner.contactHint')}</p>
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

export default AddPartnerSheet;
