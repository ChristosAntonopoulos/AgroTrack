import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fieldPeopleService } from '../../services/fieldPeopleService';
import { partnerService, type SavedContact } from '../../services/partnerService';
import { getFieldService } from '../../services/serviceFactory';
import { normalizePhoneNumber } from '../../utils/phoneLinks';
import { canPickDeviceContact, pickDeviceContact } from '../../utils/pickDeviceContact';
import { createMyOilStyles } from './myOilStyles';

export type RecipientPlace = 'inside' | 'outside';

type AppPerson = { id: string; name: string };

type Props = {
  place: RecipientPlace;
  onPlace: (place: RecipientPlace) => void;
  name: string;
  onName: (name: string) => void;
};

const sameContact = (contact: SavedContact, label: string, phone?: string) => {
  const phoneKey = normalizePhoneNumber(phone);
  if (phoneKey && normalizePhoneNumber(contact.phone) === phoneKey) return true;
  return contact.displayName.trim().toLowerCase() === label.trim().toLowerCase();
};

/**
 * Who receives the oil: someone who already opens the grove, or someone outside.
 * Outside is a name you type, or a phone contact that is saved into your contacts.
 */
export function OilRecipientStep({ place, onPlace, name, onName }: Props) {
  const { t } = useTranslation('myOil');
  const { user } = useAuth();
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [people, setPeople] = useState<AppPerson[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [picking, setPicking] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const canPick = canPickDeviceContact();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingPeople(true);
      try {
        const [fields, saved] = await Promise.all([
          user?.id
            ? getFieldService().getFields(user.id, user.role || 'FieldOwner').catch(() => [])
            : Promise.resolve([]),
          partnerService.getContacts({ includeUnassigned: true }).catch(() => [] as SavedContact[]),
        ]);
        if (cancelled) return;
        setContacts(saved);
        const byId = new Map<string, AppPerson>();
        const lists = await Promise.all(
          fields.map((field) => fieldPeopleService.getPeople(field.id, field).catch(() => []))
        );
        if (cancelled) return;
        for (const member of lists.flat()) {
          if (!member.userId || member.userId === user?.id || member.status === 'removed') continue;
          const label = (member.displayName || member.email || '').trim();
          if (!label || byId.has(member.userId)) continue;
          byId.set(member.userId, { id: member.userId, name: label });
        }
        for (const contact of saved) {
          if (!contact.linkedUserId || contact.linkedUserId === user?.id) continue;
          if (byId.has(contact.linkedUserId)) continue;
          const label = contact.displayName.trim();
          if (!label) continue;
          byId.set(contact.linkedUserId, { id: contact.linkedUserId, name: label });
        }
        setPeople([...byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
      } finally {
        if (!cancelled) setLoadingPeople(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const outsideContacts = useMemo(
    () => contacts.filter((contact) => !contact.linkedUserId && contact.displayName.trim()),
    [contacts]
  );

  const shownContacts = useMemo(() => {
    const needle = name.trim().toLowerCase();
    const rows = needle
      ? outsideContacts.filter((contact) => contact.displayName.toLowerCase().includes(needle))
      : outsideContacts;
    return rows.slice(0, 6);
  }, [outsideContacts, name]);

  const choose = (next: RecipientPlace) => {
    if (next === place) return;
    setSavedNote(false);
    onName('');
    onPlace(next);
  };

  const importContact = async () => {
    if (!canPick || picking) return;
    setPicking(true);
    setSavedNote(false);
    try {
      const row = await pickDeviceContact();
      if (!row) return;
      const label = row.displayName.trim() || row.phone || row.email || '';
      if (!label) return;
      onName(label);
      if (outsideContacts.some((contact) => sameContact(contact, label, row.phone))) return;
      await partnerService.createContact({
        displayName: label,
        phone: row.phone,
        email: row.email,
        source: 'PhoneBook',
      });
      const saved = await partnerService.getContacts({ includeUnassigned: true }).catch(() => contacts);
      setContacts(saved);
      setSavedNote(true);
    } catch {
      /* The name is already filled. Saving the contact can be retried later. */
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.placeCard, place === 'inside' && styles.placeCardOn]}>
        <Pressable onPress={() => choose('inside')} style={styles.placeHead}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.placeTitle}>{t('give.inside')}</Text>
            <Text style={styles.placeHint}>{t('give.insideHint')}</Text>
          </View>
        </Pressable>
        {place === 'inside' ? (
          <View style={styles.placeBody}>
            {loadingPeople ? (
              <ActivityIndicator color={colors.primary} />
            ) : people.length === 0 ? (
              <Text style={styles.placeHint}>{t('give.insideEmpty')}</Text>
            ) : (
              people.map((person) => {
                const on = name === person.name;
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => onName(person.name)}
                    style={[styles.personRow, on && styles.personRowOn]}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                    <Text style={styles.personName} numberOfLines={1}>
                      {person.name}
                    </Text>
                    {on ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}
      </View>

      <View style={[styles.placeCard, place === 'outside' && styles.placeCardOn]}>
        <Pressable onPress={() => choose('outside')} style={styles.placeHead}>
          <Ionicons name="earth-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.placeTitle}>{t('give.outside')}</Text>
            <Text style={styles.placeHint}>{t('give.outsideHint')}</Text>
          </View>
        </Pressable>
        {place === 'outside' ? (
          <View style={styles.placeBody}>
            <View style={styles.nameRow}>
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setSavedNote(false);
                  onName(text);
                }}
                placeholder={t('give.outsidePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
                autoComplete="name"
                accessibilityLabel={t('give.outsidePlaceholder')}
              />
              {canPick ? (
                <Pressable
                  disabled={picking}
                  onPress={() => void importContact()}
                  accessibilityRole="button"
                  accessibilityLabel={t('give.importContact')}
                  style={styles.contactIcon}
                >
                  {picking ? (
                    <ActivityIndicator color={colors.onOlive} size="small" />
                  ) : (
                    <Ionicons name="people" size={20} color={colors.onOlive} />
                  )}
                </Pressable>
              ) : null}
            </View>
            {savedNote ? <Text style={styles.savedNote}>{t('give.savedContact')}</Text> : null}
            {shownContacts.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={styles.placeHint}>{t('give.yourContacts')}</Text>
                {shownContacts.map((contact) => (
                  <Pressable
                    key={contact.id}
                    onPress={() => onName(contact.displayName.trim())}
                    style={styles.personRow}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                    <Text style={styles.personName} numberOfLines={1}>
                      {contact.displayName.trim()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
