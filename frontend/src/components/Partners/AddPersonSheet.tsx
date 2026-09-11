import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookUser, Handshake, Smartphone, Users } from 'lucide-react';
import Button from '../Common/Button';
import { Field } from '../../services/fieldService';
import { ServiceCategory } from '../../services/partnerService';
import SavedContactSheet from './SavedContactSheet';
import PartnersSheet from './PartnersSheet';
import { canPickDeviceContact } from '../../utils/pickDeviceContact';

type Step = 'choose' | 'save';

type Props = {
  open?: boolean;
  fieldId?: string;
  fields: Field[];
  categories?: ServiceCategory[];
  canInviteFamily?: boolean;
  canInvitePartner?: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onInviteFamily?: () => void;
  onInvitePartner?: () => void;
  onImportPhone?: () => void;
};



const AddPersonSheet: React.FC<Props> = ({
  open = true,
  fieldId,
  fields,
  categories,
  canInviteFamily = false,
  canInvitePartner = false,
  onClose,
  onSaved,
  onInviteFamily,
  onInvitePartner,
  onImportPhone,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const [step, setStep] = useState<Step>('choose');
  const canPickPhone = useMemo(() => canPickDeviceContact(), []);

  if (step === 'save') {
    return (
      <SavedContactSheet
        open={open}
        fieldId={fieldId}
        fields={fields}
        categories={categories}
        onClose={onClose}
        onSaved={() => onSaved?.()}
      />
    );
  }

  return (
    <PartnersSheet
      open={open}
      title={t('partners:addPerson')}
      subtitle={t('partners:addPersonChoicesHint')}
      onClose={onClose}
    >
      <div className="partners-choice-grid">
        {canPickPhone && onImportPhone ? (
          <button
            type="button"
            className="partners-choice-card"
            onClick={() => {
              onClose();
              onImportPhone();
            }}
          >
            <span className="partners-choice-icon" aria-hidden>
              <Smartphone size={22} />
            </span>
            <span className="partners-choice-title">{t('partners:importPhone.openPhone')}</span>
            <span className="partners-choice-desc">{t('partners:importPhone.pickHint')}</span>
          </button>
        ) : null}
        <button type="button" className="partners-choice-card" onClick={() => setStep('save')}>
          <span className="partners-choice-icon" aria-hidden>
            <BookUser size={22} />
          </span>
          <span className="partners-choice-title">{t('partners:saveContact')}</span>
          <span className="partners-choice-desc">{t('partners:saveContactHint')}</span>
        </button>
        {canInviteFamily ? (
          <button
            type="button"
            className="partners-choice-card"
            onClick={() => {
              onClose();
              onInviteFamily?.();
            }}
          >
            <span className="partners-choice-icon" aria-hidden>
              <Users size={22} />
            </span>
            <span className="partners-choice-title">{t('partners:inviteFamilySeat')}</span>
            <span className="partners-choice-desc">{t('partners:inviteFamilySeatHint')}</span>
          </button>
        ) : null}
        {canInvitePartner ? (
          <button
            type="button"
            className="partners-choice-card"
            onClick={() => {
              onClose();
              onInvitePartner?.();
            }}
          >
            <span className="partners-choice-icon" aria-hidden>
              <Handshake size={22} />
            </span>
            <span className="partners-choice-title">{t('partners:invitePartnerSeat')}</span>
            <span className="partners-choice-desc">{t('partners:invitePartnerSeatHint')}</span>
          </button>
        ) : null}
        {!canInviteFamily && !canInvitePartner ? (
          <p className="partners-inline-hint">{t('partners:seatsFullHint')}</p>
        ) : null}
      </div>
      <div className="partners-sheet-actions">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('common:close')}
        </Button>
      </div>
    </PartnersSheet>
  );
};

export default AddPersonSheet;
