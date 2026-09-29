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
  const [relationship, setRelationship] = useState<FieldPersonRole>(role === 'Admin' ? 'Family' : role);
  const isPartner = relationship === 'Partner';
  const ns = isPartner ? 'ownerPartner' : 'family';
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [choice, setChoice] = useState<'view' | 'record' | 'work'>(role === 'Partner' ? 'work' : 'view');
  const [modules, setModules] = useState<FieldModule[]>(
    role === 'Partner' ? [...DEFAULT_FIELD_MODULES] : ['chronologio', 'photos']
  );
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>(role === 'Partner' ? 'work' : 'view');
  const [step, setStep] = useState<'who' | 'access'>('who');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FieldInvite | null>(null);

  const whoReady = Boolean(name.trim() && email.trim());
  const canSubmit = Boolean(fieldId && whoReady && modules.length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      setError(null);
      const created = await fieldPeopleService.createInvite(fieldId, {
        role: relationship === 'Partner' ? 'Partner' : 'Family',
        displayName: name.trim(),
        email: email.trim(),
        modules,
        accessLevel: choice === 'view' ? 'view' : 'work',
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
        invite ? undefined : step === 'who' ? (
          <>
            <Button
              title={t('common:next')}
              onPress={() => setStep('access')}
              disabled={!whoReady}
            />
            <Button title={t('common:cancel')} variant="ghost" onPress={onClose} />
          </>
        ) : (
          <>
            <Button
              title={saving ? t('partners:inviteSending') : t(`partners:${ns}.sendInvite`)}
              loading={saving}
              onPress={() => void submit()}
              disabled={!canSubmit}
            />
            <Button title={t('common:back')} variant="outline" onPress={() => setStep('who')} />
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
          {step === 'who' ? (
            <>
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
            </>
          ) : (
            <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 8 }}>
              {t('partners:peoplePage.steps.3.title', { defaultValue: 'Relationship' })}
            </Text>
            {(['Family', 'Partner'] as FieldPersonRole[]).map((option) => (
              <Button
                key={option}
                title={t(`partners:peoplePage.relationship.${option === 'Partner' ? 'Collaborator' : 'Family'}`, {
                  defaultValue: option,
                })}
                variant={relationship === option ? 'primary' : 'outline'}
                onPress={() => setRelationship(option)}
              />
            ))}
            <Text style={{ color: colors.textPrimary, fontWeight: '700', marginTop: 12, marginBottom: 8 }}>
              {t('partners:peoplePage.steps.4.title', { defaultValue: 'Access' })}
            </Text>
            {(['view', 'record', 'work'] as const).map((option) => (
              <Button
                key={option}
                title={t(`partners:peoplePage.preset.${option}`, { defaultValue: option })}
                variant={choice === option ? 'primary' : 'outline'}
                onPress={() => {
                  setChoice(option);
                  setAccessLevel(option === 'view' ? 'view' : 'work');
                  setModules(
                    option === 'work'
                      ? ['chronologio', 'photos', 'tasks', 'harvest']
                      : ['chronologio', 'photos']
                  );
                }}
              />
            ))}
            <AccessFields
              modules={modules}
              accessLevel={accessLevel}
              showLevels={false}
              onToggleModule={(module) =>
                setModules((prev) =>
                  prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                )
              }
              onSetLevel={setAccessLevel}
            />
          )}
        </>
      )}
    </PartnersSheet>
  );
};

export default SeatInviteSheet;
