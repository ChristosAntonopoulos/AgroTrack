import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookUser, UserPlus } from 'lucide-react';
import Button from '../Common/Button';
import { Field } from '../../services/fieldService';
import { ServiceCategory } from '../../services/partnerService';
import { fieldPeopleService, FieldCapacity, FieldInvite } from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import SavedContactSheet from './SavedContactSheet';
import PartnersSheet from './PartnersSheet';

type Step = 'choose' | 'save' | 'invite';

type Props = {
  fieldId?: string;
  fields: Field[];
  categories?: ServiceCategory[];
  canInvite?: boolean;
  onClose: () => void;
  onInvited?: () => void;
  onSaved?: () => void;
};

const AddPersonSheet: React.FC<Props> = ({
  fieldId,
  fields,
  categories,
  canInvite = false,
  onClose,
  onInvited,
  onSaved,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const [step, setStep] = useState<Step>('choose');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [worksHere, setWorksHere] = useState(true);
  const [canSee, setCanSee] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FieldInvite | null>(null);

  if (step === 'save') {
    return (
      <SavedContactSheet
        fieldId={fieldId}
        fields={fields}
        categories={categories}
        onClose={onClose}
        onSaved={() => onSaved?.()}
      />
    );
  }

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fieldId) return;
    const capacities: FieldCapacity[] = [];
    if (worksHere) capacities.push('work');
    if (canSee && !worksHere) capacities.push('view');
    if (capacities.length === 0) capacities.push('work');
    try {
      setSaving(true);
      setError(null);
      const created = await fieldPeopleService.createInvite(fieldId, {
        capacities,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        displayName: name.trim() || undefined,
      });
      setInvite(created);
      onInvited?.();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  if (step === 'choose') {
    return (
      <PartnersSheet
        title={t('partners:addPerson')}
        subtitle={t('partners:addPersonChoicesHint')}
        onClose={onClose}
      >
        <div className="partners-choice-grid">
          <button type="button" className="partners-choice-card" onClick={() => setStep('save')}>
            <span className="partners-choice-icon" aria-hidden>
              <BookUser size={22} />
            </span>
            <span className="partners-choice-title">{t('partners:saveContact')}</span>
            <span className="partners-choice-desc">{t('partners:saveContactHint')}</span>
          </button>
          {canInvite && fieldId ? (
            <button type="button" className="partners-choice-card" onClick={() => setStep('invite')}>
              <span className="partners-choice-icon" aria-hidden>
                <UserPlus size={22} />
              </span>
              <span className="partners-choice-title">{t('partners:inviteToOleachron')}</span>
              <span className="partners-choice-desc">{t('partners:addPersonHint')}</span>
            </button>
          ) : null}
        </div>
      </PartnersSheet>
    );
  }

  return (
    <PartnersSheet
      title={t('partners:inviteToOleachron')}
      subtitle={invite ? t('partners:inviteReady') : t('partners:addPersonHint')}
      onClose={onClose}
      footer={
        invite ? (
          <div className="partners-sheet-actions">
            <a className="btn btn-primary btn-md" href={invite.whatsAppUrl} target="_blank" rel="noreferrer">
              {t('partners:shareWhatsApp')}
            </a>
            <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(invite.shareUrl)}>
              {t('partners:copyLink')}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t('common:close')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {invite ? (
        <a className="partner-invite-link" href={invite.shareUrl} target="_blank" rel="noreferrer">
          {invite.shareUrl}
        </a>
      ) : (
        <form className="partners-form" onSubmit={submitInvite}>
          <label>
            <span>{t('partners:inviteName')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="…" />
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
          <div className="partners-toggle-list" role="group" aria-label={t('partners:addPerson')}>
            <label className={`partner-toggle ${worksHere ? 'is-on' : ''}`}>
              <input type="checkbox" checked={worksHere} onChange={(e) => setWorksHere(e.target.checked)} />
              <span>{t('partners:connection.works')}</span>
            </label>
            <label className={`partner-toggle ${canSee ? 'is-on' : ''}`}>
              <input type="checkbox" checked={canSee} onChange={(e) => setCanSee(e.target.checked)} />
              <span>{t('partners:connection.sees')}</span>
            </label>
          </div>
          {error ? <div className="error-message">{error}</div> : null}
          <div className="partners-sheet-actions">
            <Button type="submit" loading={saving} disabled={!name.trim() && !phone.trim() && !email.trim()}>
              {t('partners:createInvite')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('choose')}>
              {t('common:back')}
            </Button>
          </div>
        </form>
      )}
    </PartnersSheet>
  );
};

export default AddPersonSheet;
