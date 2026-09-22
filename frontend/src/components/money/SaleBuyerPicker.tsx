import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, UserRound, X } from 'lucide-react';
import type { SavedContact } from '../../services/partnerService';
import { getPartnerService } from '../../services/serviceFactory';
import { canPickDeviceContact, pickDeviceContact } from '../../utils/pickDeviceContact';

type Props = {
  value: string;
  onChange: (name: string) => void;
  /** Prefer people linked to this grove when ranking results. */
  fieldId?: string;
};

const contactLabel = (contact: SavedContact) => contact.displayName.trim() || contact.phone || contact.email || '';

const SaleBuyerPicker: React.FC<Props> = ({ value, onChange, fieldId }) => {
  const { t } = useTranslation('capture');
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const canPick = useMemo(() => canPickDeviceContact(), []);

  useEffect(() => {
    let cancelled = false;
    void getPartnerService()
      .getContacts({ includeUnassigned: true })
      .then((rows) => {
        if (!cancelled) setContacts(rows);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = value.trim();
  const needle = query.trim().toLowerCase();

  const matches = useMemo(() => {
    const ranked = [...contacts].sort((a, b) => {
      const aField = fieldId && a.fieldIds.includes(fieldId) ? 0 : 1;
      const bField = fieldId && b.fieldIds.includes(fieldId) ? 0 : 1;
      if (aField !== bField) return aField - bField;
      return contactLabel(a).localeCompare(contactLabel(b), undefined, { sensitivity: 'base' });
    });
    if (!needle) return ranked.slice(0, 8);
    return ranked
      .filter((row) => {
        const hay = `${row.displayName} ${row.phone || ''} ${row.email || ''}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 10);
  }, [contacts, fieldId, needle]);

  const connectContact = (contact: SavedContact) => {
    onChange(contactLabel(contact));
    setQuery('');
    setTyping(false);
    setPickerError(null);
  };

  const importFromPhone = async () => {
    setPickerError(null);
    if (!canPick) {
      setPickerError(t('money.buyerPhoneUnavailable'));
      return;
    }
    try {
      setPicking(true);
      const row = await pickDeviceContact();
      if (!row) return;
      onChange(row.displayName.trim() || row.phone || row.email || '');
      setQuery('');
      setTyping(false);
    } catch {
      setPickerError(t('money.buyerPhoneUnavailable'));
    } finally {
      setPicking(false);
    }
  };

  if (connected && !typing) {
    return (
      <div className="money-buyer">
        <p className="money-buyer-label" id="money-buyer-label">
          {t('money.buyerTitle')}
        </p>
        <div className="money-buyer-chip" role="group" aria-labelledby="money-buyer-label">
          <span className="money-buyer-chip__icon" aria-hidden>
            <UserRound size={18} />
          </span>
          <span className="money-buyer-chip__copy">
            <strong>{connected}</strong>
          </span>
          <button
            type="button"
            className="money-buyer-chip__change"
            onClick={() => {
              setTyping(true);
              setQuery(connected);
            }}
          >
            {t('money.buyerChange')}
          </button>
          <button
            type="button"
            className="money-buyer-chip__clear"
            aria-label={t('money.buyerClear')}
            onClick={() => {
              onChange('');
              setQuery('');
              setTyping(false);
            }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="money-buyer">
      <p className="money-buyer-label" id="money-buyer-label">
        {t('money.buyerTitle')}
      </p>
      <p className="money-buyer-hint">{t('money.buyerHint')}</p>
      <label className="money-buyer-search">
        <span className="money-sr-only">{t('money.buyerSearch')}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('money.buyerSearch')}
          aria-labelledby="money-buyer-label"
          autoComplete="off"
        />
      </label>
      {matches.length > 0 ? (
        <ul className="money-buyer-list" aria-label={t('money.buyerTitle')}>
          {matches.map((contact) => {
            const name = contactLabel(contact);
            return (
              <li key={contact.id}>
                <button type="button" className="money-buyer-row" onClick={() => connectContact(contact)}>
                  <span className="money-buyer-row__icon" aria-hidden>
                    <UserRound size={16} />
                  </span>
                  <span className="money-buyer-row__copy">
                    <strong>{name}</strong>
                    {contact.phone ? <em>{contact.phone}</em> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : contacts.length === 0 ? (
        <p className="capture-hint">{t('money.buyerEmpty')}</p>
      ) : needle ? (
        <p className="capture-hint">{t('money.buyerNoMatch')}</p>
      ) : null}
      <div className="money-buyer-actions">
        <button
          type="button"
          className="money-buyer-phone"
          disabled={picking}
          onClick={() => void importFromPhone()}
        >
          <Smartphone size={16} aria-hidden />
          {picking ? t('money.buyerPhoneOpening') : t('money.buyerFromPhone')}
        </button>
      </div>
      <label className="money-buyer-type">
        <span>{t('money.buyerTypeName')}</span>
        <input
          value={value}
          onChange={(e) => {
            setTyping(true);
            onChange(e.target.value);
          }}
          onFocus={() => setTyping(true)}
          onBlur={() => {
            if (value.trim()) setTyping(false);
          }}
          placeholder={t('money.counterparty')}
          autoComplete="name"
        />
      </label>
      {pickerError ? (
        <p className="capture-hint" role="status">
          {pickerError}
        </p>
      ) : null}
    </div>
  );
};

export default SaleBuyerPicker;
