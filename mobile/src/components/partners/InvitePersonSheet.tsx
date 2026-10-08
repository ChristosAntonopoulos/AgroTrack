import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PartnersSheet from './PartnersSheet';
import { FieldInvite, FieldModule, fieldPeopleService } from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PICKABLE_MODULES,
  SUMMARY_MODULES,
  isDeliverableEmail,
  levelForModules,
  modulesForRelationship,
} from '../../utils/peopleAccess';
import { spacing } from '../../theme';

type Relationship = 'Family' | 'Collaborator';

type FieldOption = { id: string; name: string };

type Props = {
  visible: boolean;
  fields: FieldOption[];
  peopleEmailsByField?: Record<string, string[]>;
  initialFieldIds?: string[];
  initialName?: string;
  initialEmail?: string;
  onClose: () => void;
  onSent: (notice: string) => void;
};

const InvitePersonSheet: React.FC<Props> = ({
  visible,
  fields,
  peopleEmailsByField = {},
  initialFieldIds = [],
  initialName = '',
  initialEmail = '',
  onClose,
  onSent,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const [step, setStep] = useState(initialEmail && isDeliverableEmail(initialEmail) ? 2 : 1);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [fieldIds, setFieldIds] = useState<string[]>(() => {
    const seeded = initialFieldIds.filter((id) => fields.some((field) => field.id === id));
    return seeded.length > 0 ? seeded : fields[0] ? [fields[0].id] : [];
  });
  const [relationship, setRelationship] = useState<Relationship>('Collaborator');
  const [modules, setModules] = useState<FieldModule[]>(modulesForRelationship('Collaborator'));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    const startEmail = initialEmail.trim();
    setStep(isDeliverableEmail(startEmail) ? 2 : 1);
    setName(initialName);
    setEmail(startEmail);
    const seeded = initialFieldIds.filter((id) => fields.some((field) => field.id === id));
    setFieldIds(seeded.length > 0 ? seeded : fields[0] ? [fields[0].id] : []);
    setRelationship('Collaborator');
    setModules(modulesForRelationship('Collaborator'));
    setSending(false);
    setError('');
    setDone('');
  }, [visible, initialEmail, initialName, initialFieldIds, fields]);

  const emailOk = isDeliverableEmail(email);
  const taken = useMemo(() => {
    const needle = email.trim().toLowerCase();
    if (!needle) return new Set<string>();
    return new Set(
      Object.entries(peopleEmailsByField)
        .filter(([, emails]) => emails.some((value) => value.trim().toLowerCase() === needle))
        .map(([fieldId]) => fieldId)
    );
  }, [email, peopleEmailsByField]);

  const selectedFields = fields.filter((field) => fieldIds.includes(field.id) && !taken.has(field.id));

  const pickRelationship = (next: Relationship) => {
    setRelationship(next);
    setModules(modulesForRelationship(next));
  };

  const toggleField = (id: string) => {
    if (taken.has(id)) return;
    setFieldIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleModule = (module: FieldModule) => {
    setModules((current) => {
      const next = current.includes(module) ? current.filter((item) => item !== module) : [...current, module];
      if (!next.includes('fields')) next.unshift('fields');
      return next;
    });
  };

  const goNext = () => {
    if (step === 1 && !emailOk) {
      setError(t('partners:peoplePage.needEmail'));
      return;
    }
    if (step === 2 && selectedFields.length === 0) {
      setError(t('partners:peoplePage.needGrove'));
      return;
    }
    setError('');
    setStep((current) => current + 1);
  };

  const send = async () => {
    if (!emailOk || selectedFields.length === 0) return;
    setSending(true);
    setError('');
    try {
      const created = await fieldPeopleService.createInvites({
        fieldIds: selectedFields.map((field) => field.id),
        relationship,
        accessPreset: levelForModules(modules, relationship),
        modules: modules.length > 0 ? modules : modulesForRelationship(relationship),
        email: email.trim(),
        displayName: name.trim() || undefined,
      });
      const anyEmailSent = created.some((invite: FieldInvite) => invite.emailSent);
      const anyExisting = created.some((invite: FieldInvite) => invite.inviteeHasAccount);
      const hint = anyExisting
        ? t('partners:peoplePage.inviteSentExisting')
        : anyEmailSent
          ? t('partners:peoplePage.inviteSentNew')
          : t('partners:peoplePage.inviteEmailFailed');
      setDone(hint);
      onSent(t('partners:peoplePage.invitedNotice'));
    } catch (err) {
      setError(getApiErrorMessage(err, t('partners:peoplePage.inviteEmailFailed')));
    } finally {
      setSending(false);
    }
  };

  const summary = SUMMARY_MODULES.filter((module) => modules.includes(module)).map((module) =>
    t(`partners:peoplePage.modules.${module}`)
  );
  if (modules.includes('harvest')) summary.push(t('partners:peoplePage.modules.oilStore'));

  const title = done
    ? t('partners:peoplePage.steps.3.title')
    : t(`partners:peoplePage.steps.${step}.title`);

  return (
    <PartnersSheet
      visible={visible}
      title={title}
      subtitle={done ? done : t(`partners:peoplePage.steps.${step}.hint`)}
      onClose={onClose}
      footer={
        done ? (
          <Button title={t('common:done')} onPress={onClose} />
        ) : step < 3 ? (
          <>
            <Button title={t('common:next')} onPress={goNext} />
            {step > 1 ? (
              <Button title={t('common:back')} variant="outline" onPress={() => setStep((current) => current - 1)} />
            ) : (
              <Button title={t('common:cancel')} variant="ghost" onPress={onClose} />
            )}
          </>
        ) : (
          <>
            <Button
              title={sending ? t('partners:inviteSending') : t('partners:peoplePage.sendInvite')}
              loading={sending}
              disabled={selectedFields.length === 0}
              onPress={() => void send()}
            />
            <Button title={t('common:back')} variant="outline" onPress={() => setStep(2)} disabled={sending} />
          </>
        )
      }
    >
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      {!done && step === 1 ? (
        <>
          <Input
            label={t('partners:peoplePage.name')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder={t('partners:peoplePage.namePlaceholder')}
          />
          <Input
            label={t('partners:peoplePage.email')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder={t('partners:peoplePage.emailPlaceholder')}
          />
        </>
      ) : null}
      {!done && step === 2 ? (
        <>
          <Text style={{ color: colors.textSecondary }}>
            {name.trim() || email} · {email}
          </Text>
          {fields.length > 1 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t('partners:peoplePage.steps.2.groves')}
              </Text>
              {fields.map((field) => {
                const blocked = taken.has(field.id);
                const on = !blocked && fieldIds.includes(field.id);
                return (
                  <Pressable
                    key={field.id}
                    disabled={blocked}
                    onPress={() => toggleField(field.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: on ? colors.oliveBorder : colors.border,
                      backgroundColor: on ? colors.primaryLight : colors.surface,
                      borderRadius: 12,
                      padding: spacing.md,
                      opacity: blocked ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{field.name}</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                      {blocked
                        ? t('partners:peoplePage.alreadyAccess')
                        : on
                          ? t('partners:peoplePage.groveSelected')
                          : t('partners:peoplePage.groveAdd')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('partners:peoplePage.relationshipTitle')}
          </Text>
          {(['Collaborator', 'Family'] as Relationship[]).map((option) => {
            const on = relationship === option;
            return (
              <Pressable
                key={option}
                onPress={() => pickRelationship(option)}
                style={{
                  borderWidth: 1,
                  borderColor: on ? colors.oliveBorder : colors.border,
                  backgroundColor: on ? colors.primaryLight : colors.surface,
                  borderRadius: 12,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {t(`partners:peoplePage.relationship.${option}`)}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                  {t(`partners:peoplePage.relationshipHint.${option}`)}
                </Text>
              </Pressable>
            );
          })}
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('partners:peoplePage.areasTitle')}</Text>
          {PICKABLE_MODULES.map((module) => {
            const on = modules.includes(module);
            return (
              <Pressable
                key={module}
                onPress={() => toggleModule(module)}
                style={{
                  borderWidth: 1,
                  borderColor: on ? colors.oliveBorder : colors.border,
                  backgroundColor: on ? colors.primaryLight : colors.surface,
                  borderRadius: 12,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {on ? '✓ ' : ''}
                  {t(`partners:peoplePage.modules.${module}`)}
                </Text>
              </Pressable>
            );
          })}
          <Text style={{ color: colors.textSecondary }}>{t('partners:peoplePage.oilNote')}</Text>
        </>
      ) : null}
      {!done && step === 3 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textPrimary }}>
            {t('partners:peoplePage.registerAccount', { email: email.trim() })}
          </Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('partners:peoplePage.previewLead', { name: name.trim() || email.trim() })}
          </Text>
          {selectedFields.map((field) => (
            <View key={field.id}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{field.name}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {t(`partners:peoplePage.relationship.${relationship}`)}
                {summary.length > 0 ? ` · ${summary.join(', ')}` : ''}
              </Text>
            </View>
          ))}
          <Text style={{ color: colors.textSecondary }}>{t('partners:peoplePage.willNot')}</Text>
          <Text style={{ color: colors.textSecondary }}>· {t('partners:peoplePage.cannotInvite')}</Text>
          <Text style={{ color: colors.textSecondary }}>· {t('partners:peoplePage.cannotChangeGrove')}</Text>
          <Text style={{ color: colors.textSecondary }}>· {t('partners:peoplePage.cannotOwn')}</Text>
        </View>
      ) : null}
    </PartnersSheet>
  );
};

export default InvitePersonSheet;
