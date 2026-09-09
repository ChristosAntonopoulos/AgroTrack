import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import {
  CreateFamilyInvitePayload,
  DEFAULT_FAMILY_MODULES,
  FAMILY_MODULES,
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim()) || modules.length === 0) return;
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
    >
      {invite ? (
        <FamilySharePanel invite={invite} onDone={onClose} />
      ) : (
        <form className="partners-form" onSubmit={submit}>
          <label>
            <span>{t('partners:inviteName')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>

          <fieldset className="family-fieldset">
            <legend>{t('partners:family.partsTitle')}</legend>
            <p className="partners-inline-hint">{t('partners:family.partsHint')}</p>
            <div className="partners-toggle-list" role="group">
              {FAMILY_MODULES.map((module) => {
                const on = modules.includes(module);
                return (
                  <label key={module} className={`partner-toggle ${on ? 'is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleModule(module)}
                    />
                    <span>{t(`partners:family.modules.${module}`)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="family-fieldset">
            <legend>{t('partners:family.levelTitle')}</legend>
            <div className="partners-toggle-list" role="radiogroup">
              {(['view', 'help', 'work'] as FamilyAccessLevel[]).map((level) => (
                <label key={level} className={`partner-toggle ${accessLevel === level ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="family-level"
                    checked={accessLevel === level}
                    onChange={() => setAccessLevel(level)}
                  />
                  <span>{t(`partners:family.levels.${level}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <div className="error-message">{error}</div> : null}
          <div className="partners-sheet-actions">
            <Button
              type="submit"
              loading={saving}
              disabled={!name.trim() || (!phone.trim() && !email.trim()) || modules.length === 0}
            >
              {t('partners:createInvite')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common:cancel')}
            </Button>
          </div>
        </form>
      )}
    </PartnersSheet>
  );
};

export default AddFamilySheet;
