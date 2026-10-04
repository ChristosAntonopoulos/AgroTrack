import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Contacts from 'expo-contacts';
import PartnersSheet from './PartnersSheet';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { Field } from '../../services/fieldService';
import {
  SavedContact,
  ServiceCategory,
  categoryName,
} from '../../services/partnerService';
import { getPartnerService } from '../../services/serviceFactory';
import { PickedDeviceContact } from '../../utils/pickDeviceContact';
import { spacing } from '../../theme';

type Draft = PickedDeviceContact & { key: string; selected: boolean };

type Props = {
  visible: boolean;
  fields: Field[];
  categories?: ServiceCategory[];
  onClose: () => void;
  onImported?: (contacts: SavedContact[]) => void;
};

const draftKey = (row: PickedDeviceContact, index: number) =>
  `${row.phone || ''}|${row.email || ''}|${row.displayName}|${index}`;

const ImportPhoneContactsSheet: React.FC<Props> = ({
  visible,
  fields,
  categories = [],
  onClose,
  onImported,
}) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [query, setQuery] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = drafts.filter((d) => d.selected);
  const skillOptions = categories.filter((c) => c.isProminent || skills.includes(c.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter(
      (d) =>
        d.displayName.toLowerCase().includes(q) ||
        (d.phone || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q)
    );
  }, [drafts, query]);

  const loadContacts = async () => {
    setError(null);
    setLoading(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError(t('partners:contactPickerUnavailable'));
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        pageSize: 500,
        sort: Contacts.SortTypes.FirstName,
      });
      const rows: Draft[] = [];
      data.forEach((contact, index) => {
        const displayName =
          contact.name?.trim() ||
          [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
        const phone = contact.phoneNumbers?.find((row) => row.number?.trim())?.number?.trim();
        const email = contact.emails?.find((row) => row.email?.trim())?.email?.trim();
        if (!displayName && !phone && !email) return;
        const row: PickedDeviceContact = {
          displayName: displayName || phone || email || '',
          phone,
          email,
        };
        rows.push({ ...row, key: draftKey(row, index), selected: false });
      });
      setDrafts(rows);
      if (rows.length === 0) {
        setError(t('partners:importPhone.emptyBody'));
      }
    } catch {
      setError(t('partners:contactPickerUnavailable'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setDrafts([]);
      setQuery('');
      setSkills([]);
      setError(null);
      return;
    }
    void loadContacts();
  }, [visible]);

  const toggleDraft = (key: string) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, selected: !d.selected } : d)));
  };

  const toggleSkill = (id: string) => {
    setSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
    } catch {
      setError(t('common:error', { defaultValue: 'Something went wrong' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnersSheet
      visible={visible}
      title={t('partners:importPhone.title')}
      subtitle={
        drafts.length === 0
          ? t('partners:importPhone.pickHint')
          : t('partners:importPhone.reviewHint', { count: selected.length })
      }
      onClose={onClose}
      footer={
        <>
          <Button
            title={t('partners:importPhone.save', { count: selected.length })}
            loading={saving}
            disabled={selected.length === 0}
            onPress={() => void save()}
          />
          <Button title={t('common:close')} variant="outline" onPress={onClose} />
        </>
      }
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : null}
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      {drafts.length > 0 ? (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('common:search', { defaultValue: 'Search' })}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
          />
          {filtered.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => toggleDraft(item.key)}
              style={[
                styles.row,
                {
                  borderColor: item.selected ? colors.oliveBorder : colors.border,
                  backgroundColor: item.selected ? colors.primaryLight : colors.surface,
                  minHeight: tapMin,
                },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700', width: 22 }}>
                {item.selected ? '☑' : '☐'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.displayName}</Text>
                {item.phone ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.phone}</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
          {skillOptions.length > 0 ? (
            <View style={{ gap: 8, marginTop: spacing.sm }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t('partners:importPhone.skillsTitle')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {t('partners:importPhone.skillsHint')}
              </Text>
              <View style={styles.chips}>
                {skillOptions.map((cat) => {
                  const on = skills.includes(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleSkill(cat.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: on ? colors.primaryLight : colors.surface,
                          borderColor: on ? colors.oliveBorder : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: on ? colors.primary : colors.textPrimary, fontWeight: '600' }}>
                        {categoryName(cat, i18n.language)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      ) : !loading ? (
        <Button title={t('partners:importPhone.openPhone')} onPress={() => void loadContacts()} />
      ) : null}
    </PartnersSheet>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

export default ImportPhoneContactsSheet;
