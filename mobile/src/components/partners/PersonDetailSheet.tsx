import React from 'react';
import { View, Text, StyleSheet, Linking, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import PartnersSheet from './PartnersSheet';
import { personInitials } from './personInitials';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { GrovePerson } from '../../utils/grovePeople';
import { Field } from '../../services/fieldService';
import {
  fieldNamesForPerson,
  formatPhoneShort,
  isFieldResponsible,
  personContextLine,
  personRoleLabel,
} from '../../utils/personPresentation';
import { phoneHref } from '../../utils/phoneLinks';
import { spacing } from '../../theme';

type Props = {
  person: GrovePerson | null;
  fields: Field[];
  canRemoveFromField?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onInvite?: () => void;
  onRemoveFromField?: () => void;
  onOpenProfile?: () => void;
};

const PersonDetailSheet: React.FC<Props> = ({
  person,
  fields,
  canRemoveFromField,
  onClose,
  onEdit,
  onInvite,
  onRemoveFromField,
  onOpenProfile,
}) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();

  if (!person) return null;

  const role = personRoleLabel(person, t);
  const fieldNames = fieldNamesForPerson(person, fields);
  const tel = phoneHref(person.phone, 'tel');
  const sms = phoneHref(person.phone, 'sms');
  const phoneLabel = formatPhoneShort(person.phone);
  const context = personContextLine(person, fields, t, i18n.language);
  const responsible = isFieldResponsible(person);

  const confirmRemove = () => {
    const fieldLabel = fieldNames[0] || t('partners:roles.fieldGeneric');
    Alert.alert(
      t('partners:removeMember'),
      t('partners:removeConfirm', { name: person.displayName, field: fieldLabel }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('partners:removeMember'),
          style: 'destructive',
          onPress: () => {
            onRemoveFromField?.();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <PartnersSheet
      visible={Boolean(person)}
      title=""
      onClose={onClose}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 20 }}>
            {personInitials(person.displayName)}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.textPrimary, fontSize: 22 * fontScaleMultiplier }]}>
          {person.displayName}
        </Text>
        <Text style={[styles.role, { color: colors.textSecondary }]}>
          {responsible ? `★ ${role}` : role}
        </Text>
        {phoneLabel ? (
          <Text style={{ color: colors.textTertiary, marginTop: 4 }}>{phoneLabel}</Text>
        ) : null}
        {person.email ? (
          <Text style={{ color: colors.textTertiary, marginTop: 4 }}>{person.email}</Text>
        ) : null}
        {context ? (
          <Text style={{ color: colors.textTertiary, marginTop: 6, fontSize: 13 }}>{context}</Text>
        ) : null}
      </View>

      {(tel || sms) && (
        <View style={styles.actionRow}>
          {tel ? (
            <Pressable
              onPress={() => void Linking.openURL(tel)}
              style={[styles.compactAction, { backgroundColor: colors.primaryLight, minHeight: tapMin }]}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('partners:call')}</Text>
            </Pressable>
          ) : null}
          {sms ? (
            <Pressable
              onPress={() => void Linking.openURL(sms)}
              style={[styles.compactAction, { backgroundColor: colors.surfaceMuted, minHeight: tapMin }]}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.textPrimary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('partners:text')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {fieldNames.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('partners:detail.fields')}</Text>
          {fieldNames.map((name) => (
            <Text key={name} style={[styles.sectionValue, { color: colors.textPrimary }]}>
              {name}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('partners:detail.role')}</Text>
        <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>{role}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      {onOpenProfile && person.listed && person.userId ? (
        <Pressable onPress={onOpenProfile} style={[styles.moreRow, { minHeight: tapMin }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{t('partners:profile')}</Text>
        </Pressable>
      ) : null}

      {onInvite ? (
        <Pressable
          onPress={() => {
            onInvite();
            onClose();
          }}
          style={[styles.moreRow, { minHeight: tapMin }]}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('partners:inviteToOleachron')}</Text>
        </Pressable>
      ) : null}

      {onEdit ? (
        <Pressable onPress={onEdit} style={[styles.moreRow, { minHeight: tapMin }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{t('partners:editContact')}</Text>
        </Pressable>
      ) : null}

      {canRemoveFromField && onRemoveFromField ? (
        <Pressable onPress={confirmRemove} style={[styles.moreRow, { minHeight: tapMin }]}>
          <Text style={{ color: colors.error, fontWeight: '600' }}>{t('partners:removeMember')}</Text>
        </Pressable>
      ) : null}
    </PartnersSheet>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.md, gap: 2 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: { fontWeight: '800', textAlign: 'center' },
  role: { textAlign: 'center', fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  compactAction: {
    flex: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  section: { marginBottom: spacing.md, gap: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: { fontSize: 16, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  moreRow: { justifyContent: 'center', paddingVertical: 10 },
});

export default PersonDetailSheet;
