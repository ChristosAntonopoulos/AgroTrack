import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import PartnersSheet from './PartnersSheet';
import { FieldModule, PersonFieldAccess, fieldPeopleService } from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { PICKABLE_MODULES, levelForModules, modulesForRelationship } from '../../utils/peopleAccess';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { spacing } from '../../theme';

type Relationship = 'Family' | 'Collaborator';

type Props = {
  visible: boolean;
  personName: string;
  userId: string;
  memberships: PersonFieldAccess[];
  activeFieldId: string;
  onClose: () => void;
  onSaved: () => void;
};

const asRelationship = (role: string): Relationship => (role === 'Partner' ? 'Collaborator' : 'Family');

const EditAccessSheet: React.FC<Props> = ({
  visible,
  personName,
  userId,
  memberships,
  activeFieldId,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const initial = memberships.find((row) => row.fieldId === activeFieldId) || memberships[0];
  const [fieldId, setFieldId] = useState(initial?.fieldId || '');
  const current = memberships.find((row) => row.fieldId === fieldId) || initial;
  const [role, setRole] = useState<Relationship>(asRelationship(current?.relationship || 'Family'));
  const [modules, setModules] = useState<FieldModule[]>(
    current?.modules?.length ? current.modules : modulesForRelationship(asRelationship(current?.relationship || 'Family'))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current || !initial) return;
    wasOpen.current = true;
    const nextRole = asRelationship(initial.relationship);
    setFieldId(initial.fieldId);
    setRole(nextRole);
    setModules(initial.modules.length > 0 ? initial.modules : modulesForRelationship(nextRole));
    setError('');
  }, [visible, initial]);

  const loadField = (nextId: string) => {
    const next = memberships.find((row) => row.fieldId === nextId);
    if (!next) return;
    const nextRole = asRelationship(next.relationship);
    setFieldId(next.fieldId);
    setRole(nextRole);
    setModules(next.modules.length > 0 ? next.modules : modulesForRelationship(nextRole));
    setError('');
  };

  const pickRole = (next: Relationship) => {
    setRole(next);
    setModules(modulesForRelationship(next));
  };

  const toggleModule = (module: FieldModule) => {
    setModules((currentModules) => {
      const next = currentModules.includes(module)
        ? currentModules.filter((item) => item !== module)
        : [...currentModules, module];
      if (!next.includes('fields')) next.unshift('fields');
      return next;
    });
  };

  const save = async () => {
    if (!userId || !fieldId) return;
    setSaving(true);
    setError('');
    const nextModules = modules.length > 0 ? modules : modulesForRelationship(role);
    try {
      await fieldPeopleService.updatePerson(fieldId, userId, {
        role,
        modules: nextModules,
        accessLevel: levelForModules(nextModules, role),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t('partners:peoplePage.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    const fieldName = friendlyFieldLabel(current?.fieldName);
    Alert.alert(
      t('partners:peoplePage.removeAccess'),
      t('partners:peoplePage.removeConfirm', { name: personName, field: fieldName }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('partners:peoplePage.removeAccess'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await fieldPeopleService.removeMembership(fieldId, userId);
              onSaved();
              onClose();
            })();
          },
        },
      ]
    );
  };

  if (!current) return null;

  return (
    <PartnersSheet
      visible={visible}
      title={t('partners:peoplePage.editTitle', { name: personName })}
      subtitle={t('partners:peoplePage.editHint')}
      onClose={onClose}
      footer={
        <>
          <Button title={t('partners:peoplePage.saveAccess')} loading={saving} onPress={() => void save()} />
          <Button title={t('partners:peoplePage.removeAccess')} variant="outline" onPress={remove} />
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} />
        </>
      }
    >
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      {memberships.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('partners:peoplePage.grovesWithAccess')}
          </Text>
          {memberships.map((row) => {
            const on = row.fieldId === fieldId;
            return (
              <Pressable
                key={row.fieldId}
                onPress={() => loadField(row.fieldId)}
                style={{
                  borderWidth: 1,
                  borderColor: on ? colors.oliveBorder : colors.border,
                  backgroundColor: on ? colors.primaryLight : colors.surface,
                  borderRadius: 12,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {friendlyFieldLabel(row.fieldName)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary }}>{friendlyFieldLabel(current.fieldName)}</Text>
      )}
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
        {t('partners:peoplePage.relationshipTitle')}
      </Text>
      {(['Collaborator', 'Family'] as Relationship[]).map((option) => {
        const on = role === option;
        return (
          <Pressable
            key={option}
            onPress={() => pickRole(option)}
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
    </PartnersSheet>
  );
};

export default EditAccessSheet;
