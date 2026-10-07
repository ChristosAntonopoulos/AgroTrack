import React, { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PartnersSheet from './PartnersSheet';
import InviteSharePanel from './InviteSharePanel';
import AccessFields from './AccessFields';
import {
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

const RELATIONSHIP_OPTIONS: FieldPersonRole[] = ['Partner', 'Family'];

const modulesForRelationship = (relationship: FieldPersonRole): FieldModule[] =>
  relationship === 'Family'
    ? ['fields', 'chronologio', 'harvest', 'money']
    : ['fields', 'chronologio', 'photos', 'tasks'];

const levelForRelationship = (relationship: FieldPersonRole): FieldAccessLevel =>
  relationship === 'Family' ? 'view' : 'work';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NON_DELIVERABLE = new Set(['invalid', 'test', 'localhost', 'example']);

const isDeliverableEmail = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return false;
  const domain = email.split('@')[1] || '';
  const tld = domain.split('.').pop() || '';
  return Boolean(tld) && !NON_DELIVERABLE.has(tld);
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
  const { t } = useTranslation(['partners', 'common', 'fields', 'errors']);
  const { colors } = useTheme();
  const [relationship, setRelationship] = useState<FieldPersonRole>(role === 'Admin' ? 'Family' : role);
  const isPartner = relationship === 'Partner';
  const ns = isPartner ? 'ownerPartner' : 'family';
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [modules, setModules] = useState<FieldModule[]>(modulesForRelationship(relationship));
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>(levelForRelationship(relationship));
  const [step, setStep] = useState<'who' | 'access'>('who');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FieldInvite | null>(null);

  const emailOk = isDeliverableEmail(email);
  const whoReady = Boolean(name.trim() && emailOk);
  const canSubmit = Boolean(fieldId && whoReady && modules.length > 0);

  const pickRelationship = (next: FieldPersonRole) => {
    setRelationship(next);
    setModules(modulesForRelationship(next));
    setAccessLevel(levelForRelationship(next));
  };

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
        accessLevel: modules.includes('tasks') ? 'work' : accessLevel,
      });
      setInvite(created);
      onCreated?.(created);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t(`${ns}.acceptFailed`)));
    } finally {
      setSaving(false);
    }
  };

  const accessStep = (
    <>
      <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 8 }}>
        {t('partners:peoplePage.relationshipTitle', { defaultValue: 'Relationship' })}
      </Text>
      {RELATIONSHIP_OPTIONS.map((option) => (
        <Button
          key={option}
          title={t(`partners:peoplePage.relationship.${option === 'Partner' ? 'Collaborator' : 'Family'}`, {
            defaultValue: option,
          })}
          variant={relationship === option ? 'primary' : 'outline'}
          onPress={() => pickRelationship(option)}
        />
      ))}
      <Text style={{ color: colors.textSecondary, marginTop: 12, marginBottom: 8 }}>
        {t(`partners:peoplePage.relationshipPresetHint.${optionKey(relationship)}`, {
          defaultValue:
            relationship === 'Family'
              ? 'Family: History, Harvest, Oil store, Money.'
              : 'Collaborator: History, Photos, Tasks.',
        })}
      </Text>
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
    </>
  );

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
        <>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
            {invite.emailSent
              ? invite.inviteeHasAccount
                ? t('fields:people.inviteSentExisting', {
                    defaultValue: 'They already use The Olive Lot — notified in the app and by email.',
                  })
                : t('fields:people.inviteSentNew', {
                    defaultValue: 'Invite email sent. They can register with the link or code.',
                  })
              : t('partners:peoplePage.inviteEmailFailed', {
                  defaultValue:
                    'The invitation was saved, but the email was not sent. Check the address or share the link yourself.',
                })}
          </Text>
          <InviteSharePanel invite={invite} copyNs={ns} onDone={onClose} />
        </>
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
              {email.trim() && !emailOk ? (
                <Text style={{ color: colors.error }}>
                  {t('errors:emailInvalid', { defaultValue: 'Enter a valid email address.' })}
                </Text>
              ) : null}
            </>
          ) : (
            accessStep
          )}
        </>
      )}
    </PartnersSheet>
  );
};

const optionKey = (relationship: FieldPersonRole) =>
  relationship === 'Family' ? 'Family' : 'Collaborator';

export default SeatInviteSheet;
