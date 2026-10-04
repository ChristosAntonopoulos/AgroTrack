import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { partnerService, type SavedContact } from '../../services/partnerService';
import { canPickDeviceContact, pickDeviceContact } from '../../utils/pickDeviceContact';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  value: string;
  onChange: (name: string) => void;
  /** Prefer people linked to this grove when ranking results. */
  fieldId?: string;
  /** Hide title/hint — parent already labels the step. */
  compact?: boolean;
};

const contactLabel = (contact: SavedContact) =>
  contact.displayName.trim() || contact.phone || contact.email || '';

/** Compact contact picker — text input + shortlist; selected chip with change. */
const SaleBuyerPicker: React.FC<Props> = ({ value, onChange, fieldId, compact = false }) => {
  const { t } = useTranslation(['capture', 'partners']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [picking, setPicking] = useState(false);
  const canPick = useMemo(() => canPickDeviceContact(), []);

  useEffect(() => {
    let cancelled = false;
    void partnerService
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
  };

  const importFromPhone = async () => {
    if (!canPick) return;
    try {
      setPicking(true);
      const row = await pickDeviceContact();
      if (!row) return;
      onChange(row.displayName.trim() || row.phone || row.email || '');
      setQuery('');
      setTyping(false);
    } finally {
      setPicking(false);
    }
  };

  if (connected && !typing) {
    return (
      <View>
        {!compact ? (
          <Text style={styles.fieldLabel}>
            {t('money.buyerTitle', { defaultValue: 'Who with?' })}
          </Text>
        ) : null}
        <View style={styles.buyerChip} accessibilityLabel={t('money.buyerTitle', { defaultValue: 'Who with?' })}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <View style={styles.buyerChipCopy}>
            <Text style={styles.buyerChipName} numberOfLines={1}>
              {connected}
            </Text>
          </View>
          <Pressable
            style={styles.buyerChange}
            onPress={() => {
              setTyping(true);
              setQuery(connected);
            }}
          >
            <Text style={styles.buyerChangeText}>
              {t('money.buyerChange', { defaultValue: 'Change' })}
            </Text>
          </Pressable>
          <Pressable
            style={styles.buyerClear}
            accessibilityLabel={t('money.buyerClear', { defaultValue: 'Clear' })}
            onPress={() => {
              onChange('');
              setQuery('');
              setTyping(false);
            }}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      {!compact ? (
        <>
          <Text style={styles.fieldLabel}>
            {t('money.buyerTitle', { defaultValue: 'Who with?' })}
          </Text>
          <Text style={styles.buyerHint}>
            {t('money.buyerHint', { defaultValue: 'Pick a contact or type a name.' })}
          </Text>
        </>
      ) : null}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('money.buyerSearch', { defaultValue: 'Search contacts' })}
        placeholderTextColor={colors.textTertiary}
        style={styles.fieldInput}
        autoComplete="off"
        accessibilityLabel={t('money.buyerSearch', { defaultValue: 'Search contacts' })}
      />
      {matches.length > 0 ? (
        <View style={styles.buyerList} accessibilityLabel={t('money.buyerTitle', { defaultValue: 'Who with?' })}>
          {matches.map((contact) => {
            const name = contactLabel(contact);
            return (
              <Pressable key={contact.id} style={styles.buyerRow} onPress={() => connectContact(contact)}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.buyerRowName} numberOfLines={1}>
                    {name}
                  </Text>
                  {contact.phone ? (
                    <Text style={styles.buyerRowMeta} numberOfLines={1}>
                      {contact.phone}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : contacts.length === 0 ? (
        compact ? null : (
          <Text style={styles.buyerHint}>
            {t('money.buyerEmpty', { defaultValue: 'No saved contacts yet. Type a name.' })}
          </Text>
        )
      ) : needle ? (
        <Text style={styles.buyerHint}>
          {t('money.buyerNoMatch', { defaultValue: 'No contact matches that name.' })}
        </Text>
      ) : null}
      {canPick ? (
        <Pressable
          disabled={picking}
          onPress={() => void importFromPhone()}
          style={[styles.btnSecondary, styles.btnSm, { marginVertical: 8, alignSelf: 'flex-start' }]}
        >
          <Text style={styles.btnSecondaryText}>
            {picking
              ? t('money.buyerPhoneOpening', { defaultValue: 'Opening…' })
              : t('partners:fromPhone', { defaultValue: 'From your phone' })}
          </Text>
        </Pressable>
      ) : null}
      <TextInput
        value={value}
        onChangeText={(text) => {
          setTyping(true);
          onChange(text);
        }}
        onFocus={() => setTyping(true)}
        onBlur={() => {
          if (value.trim()) setTyping(false);
        }}
        placeholder={
          compact
            ? t('money.buyerSearch', { defaultValue: 'Search contacts' })
            : t('money.counterparty', { defaultValue: 'From / to' })
        }
        placeholderTextColor={colors.textTertiary}
        style={styles.fieldInput}
        autoComplete="name"
        accessibilityLabel={t('money.buyerTypeName', { defaultValue: 'Or type a name' })}
      />
    </View>
  );
};

export default SaleBuyerPicker;
