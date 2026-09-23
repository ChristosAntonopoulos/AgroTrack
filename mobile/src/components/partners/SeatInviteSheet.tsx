import React, { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PartnersSheet from './PartnersSheet';
import InviteSharePanel from './InviteSharePanel';
import AccessFields from './AccessFields';
import {
  DEFAULT_FIELD_MODULES,
  FieldAccessLevel,
  FieldInvite,
  FieldModule,
  FieldPersonRole,
  fieldPeopleService,
} from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  role: FieldPersonRole;
  fieldId: string;
  fieldName?: string;
  initialName?: string;
  initialEmail?: string;
  onClose: () => void;
  onCreated?: (invite: FieldInvite) => void;
};

const SeatInviteSheet: React.FC<Props> = ({
  visible,
  role,
  fieldId,
  fieldName,
  initialName = '',
  initialEmail = '',
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const isPartner = role === 'Partner';
  const ns = isPartner ? 'ownerPartner' : 'family';
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [modules, setModules] = useState<FieldModule[]>([...DEFAULT_FIELD_MODULES]);
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>(isPartner ? 'work' : 'view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FieldInvite | null>(null);

  const canSubmit = Boolean(fieldId && name.trim() && email.trim() && modules.length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      setError(null);
      const created = await fieldPeopleService.createInvite(fieldId, {
        role: isPartner ? 'Partner' : 'Family',
        displayName: name.trim(),
        email: email.trim(),
        modules,
        accessLevel,
      });
      setInvite(created);
      onCreated?.(created);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t(`${ns}.acceptFailed`)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnersSheet
      visible={visible}
      title={t(`partners:${ns}.${isPartner ? 'addPartner' : 'addMember'}`)}
      subtitle={
        invite
          ? t(`partners:${ns}.inviteReady`)
          : fieldName
            ? t('partners:fieldContext', { field: fieldName })
            : t(`partners:${ns}.addHint`)
      }
      onClose={onClose}
      footer={
        invite ? undefined : (
          <>
            <Button
              title={saving ? t('partners:inviteSending') : t(`partners:${ns}.sendInvite`)}
              loading={saving}
              onPress={() => void submit()}
              disabled={!canSubmit}
            />
            <Button title={t('common:cancel')} variant="ghost" onPress={onClose} />
          </>
        )
      }
    >
      {invite ? (
        <InviteSharePanel invite={invite} copyNs={ns} onDone={onClose} />
      ) : (
        <>
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
          <Input
            label={t('partners:inviteName')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
          <Input
            label={t('partners:inviteEmail')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <AccessFields
            modules={modules}
            accessLevel={accessLevel}
            onToggleModule={(module) =>
              setModules((prev) =>
                prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
              )
            }
            onSetLevel={setAccessLevel}
          />
        </>
      )}
    </PartnersSheet>
  );
};

export default SeatInviteSheet;
