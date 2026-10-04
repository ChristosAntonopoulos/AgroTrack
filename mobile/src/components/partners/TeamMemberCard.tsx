import React, { useState } from 'react';
import { Text, TextInput, StyleSheet, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import Button from '../ui/Button';
import PartnersSheet from './PartnersSheet';
import InviteSharePanel, { ShareableInvite } from './InviteSharePanel';
import AccessFields from './AccessFields';
import PersonCard from './PersonCard';
import {
  FamilyAccessLevel,
  FamilyModule,
} from '../../services/familyService';
import { formatPhoneShort } from '../../utils/personPresentation';
import { spacing } from '../../theme';

type Kind = 'family' | 'partner';

type Props = {
  kind: Kind;
  displayName: string;
  phone?: string;
  email?: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
  status: string;
  pendingInvite?: ShareableInvite | null;
  canManage?: boolean;
  onChanged?: () => void;
  onUpdate: (payload: {
    displayName: string;
    phone?: string;
    email?: string;
    modules: FamilyModule[];
    accessLevel: FamilyAccessLevel;
  }) => Promise<void>;
  onRevoke: () => Promise<void>;
};

/** Team seat — same dense row as grove people; actions only in the sheet. */
const TeamMemberCard: React.FC<Props> = ({
  kind,
  displayName,
  phone,
  email,
  modules,
  accessLevel,
  status,
  pendingInvite,
  canManage,
  onChanged,
  onUpdate,
  onRevoke,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [name, setName] = useState(displayName);
  const [editPhone, setEditPhone] = useState(phone || '');
  const [editEmail, setEditEmail] = useState(email || '');
  const [editModules, setEditModules] = useState<FamilyModule[]>([...modules]);
  const [editLevel, setEditLevel] = useState<FamilyAccessLevel>(accessLevel);
  const [saving, setSaving] = useState(false);

  const ns = kind === 'family' ? 'family' : 'ownerPartner';
  const role =
    kind === 'family'
      ? t('partners:connection.family')
      : t('partners:ownerPartner.title');
  const level = t(`partners:family.levels.${accessLevel}`);
  const subtitle =
    status === 'pending'
      ? `${role} · ${t('partners:connection.invited')}`
      : `${role} · ${level}`;
  const hint =
    status === 'pending' && pendingInvite?.code
      ? `${t(`partners:${ns}.inviteCode`)} ${pendingInvite.code}`
      : formatPhoneShort(phone);

  const save = async () => {
    if (!name.trim() || editModules.length === 0) return;
    setSaving(true);
    try {
      await onUpdate({
        displayName: name.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        modules: editModules,
        accessLevel: editLevel,
      });
      setEditing(false);
      setOpen(false);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const revoke = () => {
    Alert.alert(t(`partners:${ns}.revoke`), t(`partners:${ns}.revokeConfirm`, { name: displayName }), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t(`partners:${ns}.revoke`),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await onRevoke();
            setOpen(false);
            onChanged?.();
          })();
        },
      },
    ]);
  };

  return (
    <>
      <PersonCard
        name={displayName}
        subtitle={subtitle}
        hint={hint !== formatPhoneShort(phone) ? hint : undefined}
        phone={phone}
        onPress={() => setOpen(true)}
      />

      <PartnersSheet visible={open && !editing && !sharing} title="" onClose={() => setOpen(false)}>
        <Text style={[styles.sheetName, { color: colors.textPrimary }]}>{displayName}</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }}>
          {subtitle}
        </Text>
        {phone ? (
          <Button
            title={t('partners:call')}
            onPress={() => void Linking.openURL(`tel:${phone}`)}
            style={{ marginBottom: 8 }}
          />
        ) : null}
        {canManage && status === 'pending' && pendingInvite ? (
          <Button
            title={t(`partners:${ns}.reshare`)}
            variant="outline"
            onPress={() => setSharing(true)}
            style={{ marginBottom: 8 }}
          />
        ) : null}
        {canManage ? (
          <Button
            title={t(`partners:${ns}.editAccess`, { defaultValue: t('partners:editContact') })}
            variant="outline"
            onPress={() => {
              setName(displayName);
              setEditPhone(phone || '');
              setEditEmail(email || '');
              setEditModules([...modules]);
              setEditLevel(accessLevel);
              setEditing(true);
            }}
            style={{ marginBottom: 8 }}
          />
        ) : null}
        {canManage ? (
          <Button title={t(`partners:${ns}.revoke`)} variant="outline" onPress={revoke} />
        ) : null}
      </PartnersSheet>

      <PartnersSheet
        visible={editing}
        title={t(`partners:${ns}.editAccess`, { defaultValue: t('partners:editContact') })}
        onClose={() => setEditing(false)}
        footer={
          <>
            <Button
              title={t('common:save')}
              loading={saving}
              disabled={!name.trim() || editModules.length === 0}
              onPress={() => void save()}
            />
            <Button title={t('common:cancel')} variant="outline" onPress={() => setEditing(false)} />
          </>
        }
      >
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
        />
        <TextInput
          value={editPhone}
          onChangeText={setEditPhone}
          keyboardType="phone-pad"
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
        />
        <TextInput
          value={editEmail}
          onChangeText={setEditEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
        />
        <AccessFields
          modules={editModules}
          accessLevel={editLevel}
          onToggleModule={(module) =>
            setEditModules((prev) =>
              prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
            )
          }
          onSetLevel={setEditLevel}
        />
      </PartnersSheet>

      <PartnersSheet
        visible={sharing && Boolean(pendingInvite)}
        title={t(`partners:${ns}.reshare`)}
        onClose={() => setSharing(false)}
      >
        {pendingInvite ? (
          <InviteSharePanel invite={pendingInvite} copyNs={ns} onDone={() => setSharing(false)} />
        ) : null}
      </PartnersSheet>
    </>
  );
};

const styles = StyleSheet.create({
  sheetName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
});

export default TeamMemberCard;
