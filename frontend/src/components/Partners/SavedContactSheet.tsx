import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

type Props = {
  open?: boolean;
  fieldId?: string;
  fields: FieldOption[];
  categories?: ServiceCategory[];
  existing?: SavedContact;
  onClose: () => void;
  onSaved?: (contact: SavedContact) => void;
};

const SavedContactSheet: React.FC<Props> = ({
  open = true,
  fieldId,
  fields,
  categories = [],
  existing,
  onClose,
  onSaved,
}) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const [name, setName] = useState(existing?.displayName || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [fieldIds, setFieldIds] = useState<string[]>(
    existing?.fieldIds?.length ? existing.fieldIds : fieldId ? [fieldId] : []
  );
  const [serviceCategoryIds, setServiceCategoryIds] = useState<string[]>(existing?.serviceCategoryIds || []);
  const [source, setSource] = useState<'Manual' | 'PhoneBook'>(existing?.source || 'Manual');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(existing));
  const canPick = useMemo(() => canPickDeviceContact(), []);

  const toggleField = (id: string) => {
    setFieldIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

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

  return (
    <PartnersSheet
      open={open}
      title={existing ? t('partners:editContact') : t('partners:saveContact')}
      subtitle={t('partners:saveContactHint')}
      onClose={onClose}
      footer={
        <div className="partners-sheet-actions">
          <Button type="button" loading={saving} disabled={!name.trim()} onClick={() => void save()}>
            {existing ? t('common:save') : t('partners:saveContact')}
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
      {canPick ? (
        <Button type="button" variant="outline" className="btn-full-width" onClick={() => void fromPhone()}>
          {t('partners:fromPhone')}
        </Button>
      ) : null}

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
          <span>{t('partners:invitePhone')}</span>
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

        {fields.length > 0 ? (
          <fieldset className="partners-fieldset">
            <legend>{t('partners:linkToField')}</legend>
            <div className="partners-chip-select">
              {fields.map((field) => {
                const on = fieldIds.includes(field.id);
                return (
                  <button
                    key={field.id}
                    type="button"
                    className={`partners-select-chip ${on ? 'is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleField(field.id)}
                  >
                    {field.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <button
          type="button"
          className="partners-details-toggle"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? t('partners:hideDetails') : t('partners:addLaterDetails')}
        </button>

        {detailsOpen ? (
          <div className="partners-form-details">
            <label>
              <span>{t('partners:inviteEmail')}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label>
              <span>{t('partners:contactNotes')}</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </label>
            {categories.length > 0 ? (
              <fieldset className="partners-fieldset">
                <legend>{t('partners:whatTheyDo')}</legend>
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
          </div>
        ) : null}

        {error ? <div className="error-message">{error}</div> : null}
      </form>
    </PartnersSheet>
  );
};

export default SavedContactSheet;
