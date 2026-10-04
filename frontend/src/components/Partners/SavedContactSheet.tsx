import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Handshake, Users } from 'lucide-react';
import Button from '../Common/Button';
import { Field } from '../../services/fieldService';
import {
  SavedContact,
  ServiceCategory,
  UpsertSavedContactPayload,
  categoryName,
} from '../../services/partnerService';
import { getPartnerService } from '../../services/serviceFactory';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { canPickDeviceContact, pickDeviceContact } from '../../utils/pickDeviceContact';
import PhoneActions from './PhoneActions';
import PartnersSheet from './PartnersSheet';

type FieldOption = Pick<Field, 'id' | 'name'>;

export type ContactInviteSeats = {
  canManage: boolean;
  canInviteFamily: boolean;
  canInvitePartner: boolean;
  familyUsed: number;
  familyMax: number;
  partnerUsed: number;
  partnerMax: number;
};

type InvitePrefill = { name?: string; email?: string };

type Props = {
  open?: boolean;
  fieldId?: string;
  fields: FieldOption[];
  categories?: ServiceCategory[];
  existing?: SavedContact;
  hasFields?: boolean;
  inviteFields?: FieldOption[];
  seatsByField?: Record<string, ContactInviteSeats>;
  onClose: () => void;
  onSaved?: (contact: SavedContact) => void;
  onInviteFamily?: (prefill: InvitePrefill, fieldId: string) => void;
  onInvitePartner?: (prefill: InvitePrefill, fieldId: string) => void;
};

const SavedContactSheet: React.FC<Props> = ({
  open = true,
  fieldId,
  fields,
  categories = [],
  existing,
  hasFields = false,
  inviteFields = [],
  seatsByField = {},
  onClose,
  onSaved,
  onInviteFamily,
  onInvitePartner,
}) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const [name, setName] = useState(existing?.displayName || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const fieldIds = existing?.fieldIds?.length
    ? existing.fieldIds
    : fieldId
      ? [fieldId]
      : [];
  const [serviceCategoryIds, setServiceCategoryIds] = useState<string[]>(existing?.serviceCategoryIds || []);
  const [source, setSource] = useState<'Manual' | 'PhoneBook'>(existing?.source || 'Manual');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(existing?.email || existing?.notes));
  const [pickedFieldId, setPickedFieldId] = useState('');
  const canPick = canPickDeviceContact();
  const inviteTarget = fieldId || pickedFieldId || inviteFields[0]?.id || '';
  const seats = inviteTarget ? seatsByField[inviteTarget] : undefined;
  const showFieldPicker = !fieldId && inviteFields.length > 1;

  const toggleCategory = (id: string) => {
    setServiceCategoryIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const fromPhone = async () => {
    try {
      const picked = await pickDeviceContact();
      if (!picked) return;
      if (picked.displayName) setName(picked.displayName);
      if (picked.phone) setPhone(picked.phone);
      if (picked.email) setEmail(picked.email);
      setSource('PhoneBook');
      if (picked.email) setDetailsOpen(true);
    } catch {
      setError(t('partners:contactPickerUnavailable'));
    }
  };

  const payload = (): UpsertSavedContactPayload => ({
    displayName: name.trim(),
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    notes: notes.trim() || undefined,
    fieldIds,
    serviceCategoryIds,
    source,
  });

  const save = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const service = getPartnerService();
      const saved = existing
        ? await service.updateContact(existing.id, payload())
        : await service.createContact(payload());
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    try {
      setDeleting(true);
      setError(null);
      await getPartnerService().deleteContact(existing.id);
      onSaved?.(existing);
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setDeleting(false);
    }
  };

  const prefill = (): InvitePrefill => ({
    name: name.trim() || undefined,
    email: email.trim() || undefined,
  });

  const inviteFamily = () => {
    if (!inviteTarget || !seats?.canInviteFamily) return;
    onInviteFamily?.(prefill(), inviteTarget);
  };

  const invitePartner = () => {
    if (!inviteTarget || !seats?.canInvitePartner) return;
    onInvitePartner?.(prefill(), inviteTarget);
  };

  return (
    <PartnersSheet
      open={open}
      title={existing ? t('partners:editContact') : t('partners:newContact')}
      subtitle={t('partners:saveContactHint')}
      onClose={onClose}
      footer={
        <div className="partners-sheet-actions">
          <Button type="button" loading={saving} disabled={!name.trim()} onClick={() => void save()}>
            {existing ? t('partners:saveContactEdit') : t('partners:saveContactCreate')}
          </Button>
          {existing ? (
            <Button type="button" variant="outline" onClick={() => void remove()} loading={deleting}>
              {t('partners:deleteContact')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
        </div>
      }
    >
      <div className="contact-sheet-layout">
        {canPick ? (
          <Button type="button" variant="outline" className="btn-full-width" onClick={() => void fromPhone()}>
            {t('partners:fromPhone')}
          </Button>
        ) : null}

        {fieldIds.length > 0 ? (
          <p className="partners-field-context">
            {t('partners:fieldContext', {
              field: fields
                .filter((field) => fieldIds.includes(field.id))
                .map((field) => field.name)
                .join(', ') || fieldId,
            })}
          </p>
        ) : null}

        <section className="contact-panel" aria-labelledby="contact-notebook-title">
          <p className="contact-panel-kicker" id="contact-notebook-title">
            {t('partners:notebookKicker')}
          </p>
          <form
            className="partners-form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label>
              <span>{t('partners:inviteName')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required autoFocus />
            </label>
            <label>
              <span className="contact-label-row">
                {t('partners:invitePhone')}
                <em className="contact-optional">{t('partners:phoneOptional')}</em>
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
              />
            </label>
            <PhoneActions phone={phone} />
            <p className="partners-field-hint">{t('partners:saveLaterHint')}</p>

            {categories.length > 0 ? (
              <fieldset className="partners-fieldset">
                <legend>{t('partners:whatTheyDo')}</legend>
                <p className="partners-field-hint">{t('partners:importPhone.skillsHint')}</p>
                <div className="partners-chip-select">
                  {categories
                    .filter((c) => c.isProminent || serviceCategoryIds.includes(c.id))
                    .map((category) => {
                      const on = serviceCategoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`partners-select-chip ${on ? 'is-on' : ''}`}
                          aria-pressed={on}
                          onClick={() => toggleCategory(category.id)}
                        >
                          {categoryName(category, i18n.language)}
                        </button>
                      );
                    })}
                </div>
              </fieldset>
            ) : null}

            <button
              type="button"
              className="partners-details-toggle contact-details-toggle"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((openNow) => !openNow)}
            >
              <span>{detailsOpen ? t('partners:hideDetails') : t('partners:addLaterDetails')}</span>
              <ChevronDown size={18} aria-hidden />
            </button>

            {detailsOpen ? (
              <div className="partners-form-details">
                <label>
                  <span className="contact-label-row">
                    {t('partners:inviteEmail')}
                    <em className="contact-optional">{t('partners:phoneOptional')}</em>
                  </span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </label>
                <label>
                  <span>{t('partners:contactNotes')}</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </label>
              </div>
            ) : null}

            {error ? <div className="error-message">{error}</div> : null}
          </form>
        </section>

        {onInviteFamily || onInvitePartner ? (
        <section className="contact-panel contact-panel-app" aria-labelledby="contact-app-access-title">
          <h3 id="contact-app-access-title">{t('partners:appAccessTitle')}</h3>
          <p className="partners-field-hint">{t('partners:appAccessHint')}</p>

          {inviteFields.length === 0 ? (
            <>
              <p className="partners-inline-hint">
                {hasFields ? t('partners:team.viewOnly') : t('partners:appAccessNeedField')}
              </p>
              {!hasFields ? (
                <Button as={Link} to="/fields/new" variant="outline" onClick={onClose}>
                  {t('partners:appAccessAddField')}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              {showFieldPicker ? (
                <label className="contact-field-pick">
                  <span>{t('partners:appAccessPickField')}</span>
                  <select value={inviteTarget} onChange={(event) => setPickedFieldId(event.target.value)}>
                    {inviteFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="partners-choice-grid contact-app-actions">
                <button
                  type="button"
                  className="partners-choice-card"
                  disabled={!seats?.canInviteFamily}
                  onClick={inviteFamily}
                >
                  <span className="partners-choice-icon" aria-hidden>
                    <Users size={22} />
                  </span>
                  <span className="partners-choice-title">{t('partners:inviteFamilySeat')}</span>
                  <span className="partners-choice-desc">
                    {seats?.canInviteFamily
                      ? t('partners:inviteFamilySeatHint')
                      : t('partners:inviteFamilySeatFull', {
                          used: seats?.familyUsed ?? 0,
                          max: seats?.familyMax ?? 2,
                        })}
                  </span>
                </button>
                <button
                  type="button"
                  className="partners-choice-card"
                  disabled={!seats?.canInvitePartner}
                  onClick={invitePartner}
                >
                  <span className="partners-choice-icon" aria-hidden>
                    <Handshake size={22} />
                  </span>
                  <span className="partners-choice-title">{t('partners:invitePartnerSeat')}</span>
                  <span className="partners-choice-desc">
                    {seats?.canInvitePartner
                      ? t('partners:invitePartnerSeatHint')
                      : t('partners:invitePartnerSeatFull', {
                          used: seats?.partnerUsed ?? 0,
                          max: seats?.partnerMax ?? 1,
                        })}
                  </span>
                </button>
              </div>
            </>
          )}
        </section>
        ) : null}
      </div>
    </PartnersSheet>
  );
};

export default SavedContactSheet;
