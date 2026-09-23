import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getFieldService, getFieldWorkService } from '../../services/serviceFactory';
import { getApiErrorMessage } from '../../services/api';
import type { Field } from '../../services/fieldService';
import type { CopyFieldWorkProfileResult, FieldWorkProfile } from '../../services/fieldWorkService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import {
  buildCopyDiffPreview,
  selectableCopyTargets,
  type CopyProfileOptions,
} from '../../utils/fieldWorkProfileCopy';
import { spacing } from '../../theme';

type Phase = 'pick' | 'options' | 'review' | 'done';

type Props = {
  sourceFieldId: string;
  profile: FieldWorkProfile;
  onDone: () => void;
  onCancel: () => void;
};

const WorkProfileCopyWizard: React.FC<Props> = ({ sourceFieldId, profile, onDone, onCancel }) => {
  const { t } = useTranslation(['tasks', 'common']);
  const { user } = useAuth();
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('pick');
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<CopyProfileOptions>({
    copyIrrigation: false,
    copyLastPerformed: false,
    copyAssignments: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyFieldWorkProfileResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const all = await getFieldService().getFields(user.id, user.role);
        if (!cancelled) setFields(selectableCopyTargets(all, sourceFieldId));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, t('tasks:fieldWork.profile.copy.loadFailed')));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceFieldId, t, user]);

  const targets = useMemo(
    () => fields.filter((field) => selectedIds.includes(field.id)),
    [fields, selectedIds]
  );
  const diffRows = useMemo(() => buildCopyDiffPreview(profile, options), [profile, options]);

  const toggleField = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const apply = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const copied = await getFieldWorkService().copyWorkProfile(sourceFieldId, {
        targetFieldIds: selectedIds,
        ...options,
      });
      setResult(copied);
      setPhase('done');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('tasks:fieldWork.profile.copy.applyFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Text style={{ color: colors.textSecondary }}>{t('common:loading')}</Text>;
  }

  if (fields.length === 0 && phase === 'pick') {
    return (
      <View style={styles.block}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('tasks:fieldWork.profile.copy.title')}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('tasks:fieldWork.profile.copy.noTargets')}
        </Text>
        <Button title={t('common:back')} onPress={onCancel} fullWidth />
      </View>
    );
  }

  const optionRow = (key: keyof CopyProfileOptions, label: string) => (
    <View key={key} style={[styles.switchRow, { borderColor: colors.borderLight }]}>
      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={options[key]}
        onValueChange={(enabled) => setOptions((current) => ({ ...current, [key]: enabled }))}
        trackColor={{ false: colors.warmStone, true: colors.sage }}
        thumbColor={colors.white}
      />
    </View>
  );

  return (
    <View style={styles.block}>
      {phase === 'pick' ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('tasks:fieldWork.profile.copy.title')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('tasks:fieldWork.profile.copy.pickBody')}
          </Text>
          {fields.map((field) => {
            const selected = selectedIds.includes(field.id);
            return (
              <Pressable
                key={field.id}
                onPress={() => toggleField(field.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                style={[
                  styles.choice,
                  {
                    backgroundColor: selected ? colors.primaryLight : colors.surfaceElevated,
                    borderColor: selected ? colors.primary : colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>
                  {friendlyFieldLabel(field.name)}
                </Text>
              </Pressable>
            );
          })}
          <Button title={t('common:cancel')} variant="outline" onPress={onCancel} fullWidth />
          <Button
            title={t('tasks:fieldWork.profile.copy.continue')}
            onPress={() => setPhase('options')}
            disabled={selectedIds.length === 0}
            fullWidth
          />
        </>
      ) : null}

      {phase === 'options' ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('tasks:fieldWork.profile.copy.optionsTitle')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('tasks:fieldWork.profile.copy.optionsBody')}
          </Text>
          {optionRow('copyIrrigation', t('tasks:fieldWork.profile.copy.optIrrigation'))}
          {optionRow('copyLastPerformed', t('tasks:fieldWork.profile.copy.optLastPerformed'))}
          {optionRow('copyAssignments', t('tasks:fieldWork.profile.copy.optAssignments'))}
          <Button title={t('common:back')} variant="outline" onPress={() => setPhase('pick')} fullWidth />
          <Button
            title={t('tasks:fieldWork.profile.copy.review')}
            onPress={() => setPhase('review')}
            fullWidth
          />
        </>
      ) : null}

      {phase === 'review' ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('tasks:fieldWork.profile.copy.reviewTitle')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('tasks:fieldWork.profile.copy.reviewBody', { count: targets.length })}
          </Text>
          {targets.map((field) => (
            <Text key={field.id} style={[styles.choiceTitle, { color: colors.textPrimary }]}>
              {friendlyFieldLabel(field.name)}
            </Text>
          ))}
          {diffRows.map((row) => (
            <View key={row.key} style={styles.diffRow}>
              <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>
                {t(`tasks:fieldWork.profile.copy.diff.${row.labelKey}`)}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {row.included
                  ? t('tasks:fieldWork.profile.copy.willCopy')
                  : t('tasks:fieldWork.profile.copy.willSkip')}
              </Text>
            </View>
          ))}
          <Button title={t('common:back')} variant="outline" onPress={() => setPhase('options')} fullWidth />
          <Button
            title={
              submitting
                ? t('tasks:fieldWork.profile.copy.applying')
                : t('tasks:fieldWork.profile.copy.apply')
            }
            onPress={() => void apply()}
            disabled={submitting}
            fullWidth
          />
        </>
      ) : null}

      {phase === 'done' && result ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('tasks:fieldWork.profile.copy.doneTitle')}
          </Text>
          {result.results.map((row) => (
            <View key={row.fieldId} style={styles.diffRow}>
              <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>
                {friendlyFieldLabel(fields.find((field) => field.id === row.fieldId)?.name || row.fieldId)}
              </Text>
              <Text style={{ color: row.success ? colors.textSecondary : colors.error }}>
                {row.success ? t('tasks:fieldWork.profile.copy.ok') : row.errorMessage || row.errorCode}
              </Text>
            </View>
          ))}
          <Button title={t('tasks:fieldWork.profile.copy.finish')} onPress={onDone} fullWidth />
        </>
      ) : null}

      {error ? <Text style={[styles.hint, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700' },
  hint: { fontSize: 14, lineHeight: 20 },
  choice: { borderWidth: 1, borderRadius: 14, padding: spacing.md },
  choiceTitle: { fontSize: 15, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  optionLabel: { flex: 1, fontSize: 15, lineHeight: 20 },
  diffRow: { gap: 2, paddingVertical: 6 },
});

export default WorkProfileCopyWizard;
