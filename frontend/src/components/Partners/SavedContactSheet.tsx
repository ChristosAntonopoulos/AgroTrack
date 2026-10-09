import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Handshake, Users } from 'lucide-react';
import Button from '../Common/Button';
import '../money/Money.css';
import '../Capture/Capture.css';
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

const FORM_ID = 'saved-contact-form';

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
  const [entry, setEntry] = useState<'manual' | 'phone'>(existing?.source === 'PhoneBook' ? 'phone' : 'manual');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(existing?.notes || (existing?.serviceCategoryIds && existing.serviceCategoryIds.length > 0))
  );
  const [pickedFieldId, setPickedFieldId] = useState('');
  const canPick = canPickDeviceContact();
  const inviteTarget = fieldId || pickedFieldId || inviteFields[0]?.id || '';
  const seats = inviteTarget ? seatsByField[inviteTarget] : undefined;
  const showFieldPicker = !fieldId && inviteFields.length > 1;
  const showEntryMode = canPick && !existing;

  const toggleCategory = (id: string) => {
    setServiceCategoryIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const fromPhone = async () => {
    setEntry('phone');
    try {
      const picked = await pickDeviceContact();
      if (!picked) return;
      if (picked.displayName) setName(picked.displayName);
      if (picked.phone) setPhone(picked.phone);
      if (picked.email) setEmail(picked.email);
      setSource('PhoneBook');
    } catch {
      setEntry('manual');
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

  const fieldLabel =
    fields
      .filter((field) => fieldIds.includes(field.id))
      .map((field) => field.name)
      .join(', ') || fieldId;

  return (
    <PartnersSheet
      open={open}
      kicker={t('partners:notebookKicker')}
      title={existing ? t('partners:editContact') : t('partners:newContact')}
      subtitle={t('partners:saveContactHint')}
      onClose={onClose}
      footer={
        <div className="people-money">
          <div className="money-footer-actions">
            <button
              type="submit"
              form={FORM_ID}
              className="money-primary-action"
              disabled={!name.trim() || saving || deleting}
            >
              {existing ? t('partners:saveContactEdit') : t('partners:saveContactCreate')}
            </button>
            {existing ? (
              <button type="button" className="money-text-link" onClick={() => void remove()} disabled={deleting || saving}>
                {t('partners:deleteContact')}
              </button>
            ) : (
              <button type="button" className="money-text-link" onClick={onClose} disabled={saving}>
                {t('common:cancel')}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="contact-sheet-form people-money">
        {showEntryMode ? (
          <div className="money-split-toggle" role="tablist" aria-label={t('partners:newContact')}>
            <button
              type="button"
              role="tab"
              aria-selected={entry === 'phone'}
              className={entry === 'phone' ? 'is-on' : ''}
              onClick={() => void fromPhone()}
            >
              {t('partners:peoplePage.fromContacts')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={entry === 'manual'}
              className={entry === 'manual' ? 'is-on' : ''}
              onClick={() => setEntry('manual')}
            >
              {t('partners:peoplePage.newContact')}
            </button>
          </div>
        ) : null}

        {fieldIds.length > 0 && fieldLabel ? (
          <p className="invite-confirm">{t('partners:fieldContext', { field: fieldLabel })}</p>
        ) : null}

        <form
          id={FORM_ID}
          className="invite-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="money-form-label" htmlFor="contact-name">
            {t('partners:peoplePage.name')}
            <input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('partners:peoplePage.namePlaceholder')}
              autoComplete="name"
              required
              autoFocus
            />
          </label>

          <label className="money-form-label" htmlFor="contact-phone">
            <span>
              {t('partners:invitePhone')}
              <em>{t('partners:phoneOptional')}</em>
            </span>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('partners:peoplePage.phonePlaceholder')}
              autoComplete="tel"
              inputMode="tel"
            />
          </label>

          <label className="money-form-label" htmlFor="contact-email">
            <span>
              {t('partners:inviteEmail')}
              <em>{t('partners:phoneOptional')}</em>
            </span>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('partners:peoplePage.emailPlaceholder')}
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <PhoneActions phone={phone} email={email} />
          <p className="invite-confirm">{t('partners:saveLaterHint')}</p>

          <button
            type="button"
            className="capture-more-toggle"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((openNow) => !openNow)}
          >
            {detailsOpen ? t('partners:hideDetails') : t('partners:addLaterDetails')}
          </button>

          {detailsOpen ? (
            <div className="contact-more-body">
              {categories.length > 0 ? (
                <fieldset className="partners-fieldset">
                  <legend>{t('partners:whatTheyDo')}</legend>
                  <p className="invite-confirm">{t('partners:importPhone.skillsHint')}</p>
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

              <label className="money-form-label" htmlFor="contact-notes">
                {t('partners:contactNotes')}
                <textarea
                  id="contact-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <p className="people-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        {onInviteFamily || onInvitePartner ? (
          <section className="contact-access" aria-labelledby="contact-app-access-title">
            <h3 className="perm-label" id="contact-app-access-title">
              {t('partners:appAccessTitle')}
            </h3>
            <p className="perm-hint">{t('partners:appAccessHint')}</p>

            {inviteFields.length === 0 ? (
              <>
                <p className="perm-hint">
                  {hasFields ? t('partners:team.viewOnly') : t('partners:appAccessNeedField')}
                </p>
                {!hasFields ? (
                  <Button as={Link} to="/fields/new" variant="outline" size="lg" onClick={onClose}>
                    {t('partners:appAccessAddField')}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                {showFieldPicker ? (
                  <label className="money-form-label" htmlFor="contact-invite-field">
                    {t('partners:appAccessPickField')}
                    <select
                      id="contact-invite-field"
                      value={inviteTarget}
                      onChange={(event) => setPickedFieldId(event.target.value)}
                    >
                      {inviteFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <ul className="invite-option-list">
                  <li>
                    <button
                      type="button"
                      className="invite-option"
                      disabled={!seats?.canInviteFamily}
                      onClick={inviteFamily}
                    >
                      <span className="invite-contact-avatar" aria-hidden>
                        <Users size={16} />
                      </span>
                      <span className="invite-option-copy">
                        <strong>{t('partners:inviteFamilySeat')}</strong>
                        <span>
                          {seats?.canInviteFamily
                            ? t('partners:inviteFamilySeatHint')
                            : t('partners:inviteFamilySeatFull', {
                                used: seats?.familyUsed ?? 0,
                                max: seats?.familyMax ?? 2,
                              })}
                        </span>
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="invite-option"
                      disabled={!seats?.canInvitePartner}
                      onClick={invitePartner}
                    >
                      <span className="invite-contact-avatar" aria-hidden>
                        <Handshake size={16} />
                      </span>
                      <span className="invite-option-copy">
                        <strong>{t('partners:invitePartnerSeat')}</strong>
                        <span>
                          {seats?.canInvitePartner
                            ? t('partners:invitePartnerSeatHint')
                            : t('partners:invitePartnerSeatFull', {
                                used: seats?.partnerUsed ?? 0,
                                max: seats?.partnerMax ?? 1,
                              })}
                        </span>
                      </span>
                    </button>
                  </li>
                </ul>
              </>
            )}
          </section>
        ) : null}
      </div>
    </PartnersSheet>
  );
};

export default SavedContactSheet;
