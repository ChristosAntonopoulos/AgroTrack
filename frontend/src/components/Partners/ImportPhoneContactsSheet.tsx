import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Contact, Smartphone } from 'lucide-react';
import Button from '../Common/Button';
import PartnersSheet from './PartnersSheet';
import { Field } from '../../services/fieldService';
import {
  SavedContact,
  ServiceCategory,
  categoryName,
} from '../../services/partnerService';
import { getPartnerService } from '../../services/serviceFactory';
import { getApiErrorMessage } from '../../utils/translateApiError';
import {
  canPickDeviceContact,
  pickDeviceContacts,
  PickedDeviceContact,
} from '../../utils/pickDeviceContact';

type Draft = PickedDeviceContact & { key: string; selected: boolean };

type Props = {
  open?: boolean;
  fieldId?: string;
  fields: Field[];
  categories?: ServiceCategory[];
  onClose: () => void;
  onImported?: (contacts: SavedContact[]) => void;
};

const draftKey = (row: PickedDeviceContact, index: number) =>
  `${row.phone || ''}|${row.email || ''}|${row.displayName}|${index}`;

const ImportPhoneContactsSheet: React.FC<Props> = ({
  open = true,
  fields,
  categories = [],
  onClose,
  onImported,
}) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const canPick = useMemo(() => canPickDeviceContact(), []);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = drafts.filter((d) => d.selected);
  const skillOptions = categories.filter((c) => c.isProminent || skills.includes(c.id));

  const toggleSkill = (id: string) => {
    setSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDraft = (key: string) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, selected: !d.selected } : d)));
  };

  const pick = async () => {
    setError(null);
    if (!canPick) {
      setError(t('partners:contactPickerUnavailable'));
      return;
    }
    try {
      setPicking(true);
      const rows = await pickDeviceContacts({ multiple: true });
      if (rows.length === 0) return;
      setDrafts(
        rows.map((row, index) => ({
          ...row,
          key: draftKey(row, index),
          selected: true,
        }))
      );
    } catch {
      setError(t('partners:contactPickerUnavailable'));
    } finally {
      setPicking(false);
    }
  };

  const save = async () => {
    if (selected.length === 0) return;
    const linkedFields = fields.map((field) => field.id);
    try {
      setSaving(true);
      setError(null);
      const service = getPartnerService();
      const created: SavedContact[] = [];
      for (const row of selected) {
        const contact = await service.createContact({
          displayName: row.displayName.trim() || row.phone || row.email || t('partners:contact'),
          phone: row.phone?.trim() || undefined,
          email: row.email?.trim() || undefined,
          fieldIds: linkedFields,
          serviceCategoryIds: skills,
          source: 'PhoneBook',
        });
        created.push(contact);
      }
      onImported?.(created);
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnersSheet
      open={open}
      title={t('partners:importPhone.title')}
      subtitle={
        drafts.length === 0
          ? t('partners:importPhone.pickHint')
          : t('partners:importPhone.reviewHint', { count: selected.length })
      }
      onClose={onClose}
      footer={
        <div className="partners-sheet-actions">
          {drafts.length === 0 ? (
            <Button
              type="button"
              loading={picking}
              onClick={() => void pick()}
              icon={<Smartphone size={18} aria-hidden />}
              disabled={!canPick && !picking}
            >
              {t('partners:importPhone.openPhone')}
            </Button>
          ) : (
            <Button type="button" loading={saving} disabled={selected.length === 0} onClick={() => void save()}>
              {t('partners:importPhone.save', { count: selected.length })}
            </Button>
          )}
          {drafts.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => void pick()} loading={picking}>
              {t('partners:importPhone.pickAgain')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
        </div>
      }
    >
      {drafts.length === 0 ? (
        <div className="import-phone-hero">
          <span className="import-phone-hero-icon" aria-hidden>
            <Contact size={28} />
          </span>
          <p>{t('partners:importPhone.emptyBody')}</p>
          {!canPick ? <p className="partners-inline-hint">{t('partners:importPhone.unsupported')}</p> : null}
        </div>
      ) : (
        <>
          <ul className="import-phone-list" aria-label={t('partners:importPhone.title')}>
            {drafts.map((draft) => (
              <li key={draft.key}>
                <label className={`import-phone-row ${draft.selected ? 'is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={draft.selected}
                    onChange={() => toggleDraft(draft.key)}
                  />
                  <span className="import-phone-row-text">
                    <strong>{draft.displayName}</strong>
                    {draft.phone ? <span>{draft.phone}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {skillOptions.length > 0 ? (
            <fieldset className="partners-fieldset">
              <legend>{t('partners:importPhone.skillsTitle')}</legend>
              <p className="partners-field-hint">{t('partners:importPhone.skillsHint')}</p>
              <div className="partners-chip-select">
                {skillOptions.map((category) => {
                  const on = skills.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`partners-select-chip ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleSkill(category.id)}
                    >
                      {categoryName(category, i18n.language)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </>
      )}

      {error ? <div className="error-message">{error}</div> : null}
    </PartnersSheet>
  );
};

export default ImportPhoneContactsSheet;
