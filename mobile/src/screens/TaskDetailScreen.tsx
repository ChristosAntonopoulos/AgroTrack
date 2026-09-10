import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { FieldTask, fieldTaskTypeKey } from '../services/fieldWorkService';
import { Field } from '../services/fieldService';
import { getFieldWorkService, getFieldService } from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import Card from '../components/ui/Card';
import Section from '../components/layout/Section';
import StatusBadge from '../components/StatusBadge';
import TaskStatusStepper from '../components/domain/TaskStatusStepper';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import OfflineBanner from '../components/OfflineBanner';
import { typography, spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { formatDate } from '../utils/formatters';
import { toBoolean } from '../utils/booleanConverter';
import { isTaskOverdue } from '../utils/taskListUtils';
import { harvestFocusForPhase, harvestJobType, resolveHarvestPhase } from '../utils/harvestUtils';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;

const DetailRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View style={styles.detailRow}>
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
  </View>
);

const TaskDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { taskId } = route.params;
  const { isFieldOwner, user } = useAuth();
  const { colors } = useTheme();
  const { isEveryday, tapMin, fontScaleMultiplier } = usePreferences();
  const capture = useCaptureOptional();
  const { t } = useTranslation(['tasks', 'common', 'partners', 'capture']);
  const [task, setTask] = useState<FieldTask | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [prepareNote, setPrepareNote] = useState('');

  const isUpdating = toBoolean(updating);
  const phase = task ? resolveHarvestPhase(task) : null;
  const jobType = task ? harvestJobType(task) : '';
  const typeKey = task ? fieldTaskTypeKey(task) : '';

  const canWork = Boolean(
    user?.id &&
      (field?.ownerId === user.id ||
        (field?.assignedProducerIds || []).includes(user.id) ||
        user.role === 'Producer')
  );

  useEffect(() => {
    void loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const taskData = await getFieldWorkService().getFieldTask(taskId);
      setTask(taskData);
      try {
        const fieldData = await getFieldService().getField(taskData.fieldId);
        setField(fieldData);
      } catch {
        /* field optional */
      }
    } catch {
      Alert.alert(t('common:confirm'), t('tasks:loadError'));
    } finally {
      setLoading(false);
    }
  };

  const checklist = useMemo(() => {
    if (!phase || phase !== 'prepare') return [];
    return t(`tasks:harvestJobs.${jobType}.checklist`, {
      returnObjects: true,
      defaultValue: t('tasks:harvestJobs.prepare.checklist', {
        returnObjects: true,
        defaultValue: [],
      }),
    }) as string[];
  }, [phase, jobType, t]);

  const openHarvestNext = (completed: FieldTask) => {
    const nextPhase = resolveHarvestPhase(completed);
    if (nextPhase === 'daily') {
      Alert.alert(t('tasks:harvest.writeKilosTitle'), t('tasks:harvest.writeKilosBody'), [
        { text: t('tasks:notNow'), style: 'cancel' },
        {
          text: t('tasks:harvest.writeKilosNow'),
          onPress: () =>
            navigation.navigate('FieldDetail', {
              fieldId: completed.fieldId,
              focus: harvestFocusForPhase('daily'),
            }),
        },
      ]);
      return;
    }
    if (nextPhase === 'final') {
      Alert.alert(t('tasks:harvest.closeTitle'), t('tasks:harvest.closeBody'), [
        {
          text: t('tasks:harvest.writeMoneyIn'),
          onPress: () =>
            navigation.navigate('FieldDetail', { fieldId: completed.fieldId, focus: 'money' }),
        },
        {
          text: t('tasks:harvest.addMillOil'),
          onPress: () =>
            navigation.navigate('FieldDetail', {
              fieldId: completed.fieldId,
              focus: harvestFocusForPhase('final'),
            }),
        },
      ]);
    }
  };

  const completeTask = async () => {
    if (!task) return;
    try {
      setUpdating(true);
      await getFieldWorkService().completeFieldTask(taskId, {
        outcome: 'done',
        notes: prepareNote.trim() || undefined,
      });
      const updated = await getFieldWorkService().getFieldTask(taskId);
      setTask(updated);
      if (resolveHarvestPhase(updated)) {
        openHarvestNext(updated);
      }
    } catch (err: unknown) {
      Alert.alert(t('common:confirm'), err instanceof Error ? err.message : 'Error');
    } finally {
      setUpdating(false);
    }
  };

  const handleStart = () => {
    if (!task) return;
    Alert.alert(t('tasks:confirmStatus'), t('tasks:startTask'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:confirm'),
        onPress: async () => {
          try {
            setUpdating(true);
            const updated = await getFieldWorkService().startFieldTask(taskId);
            setTask(updated);
          } catch (err: unknown) {
            Alert.alert(t('common:confirm'), err instanceof Error ? err.message : 'Error');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleCompleteConfirm = () => {
    if (!task) return;
    Alert.alert(t('tasks:confirmDoneTitle'), t('tasks:confirmDoneBody', { title: task.title }), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('common:done'), onPress: () => void completeTask() },
    ]);
  };

  const doneLabel = useMemo(() => {
    if (!task) return t('tasks:completeTask');
    if (phase === 'daily') return t('tasks:harvest.doneDaily');
    if (phase === 'final') return t('tasks:harvest.doneFinal');
    if (phase === 'prepare') return t('tasks:harvest.doneNamed', { title: task.title });
    return isEveryday ? t('common:done') : t('tasks:completeTask');
  }, [task, phase, isEveryday, t]);

  const helperText = useMemo(() => {
    if (!phase) return null;
    return t(`tasks:harvestJobs.${jobType}.helper`, {
      defaultValue: t(`tasks:harvest.helpers.${phase}`),
    });
  }, [phase, jobType, t]);

  const primaryAction = useMemo(() => {
    if (!task || !canWork) return null;
    if (
      task.status === 'planned' ||
      task.status === 'ready' ||
      task.status === 'blocked' ||
      task.status === 'pending'
    ) {
      return { label: t('tasks:startTask'), onPress: handleStart };
    }
    if (task.status === 'in_progress') {
      return { label: doneLabel, onPress: handleCompleteConfirm };
    }
    return null;
  }, [task, canWork, doneLabel, t]);

  if (loading) return <LoadingSpinner fullScreen />;

  if (!task) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error }}>{t('tasks:notFound')}</Text>
        <Button title={t('common:back')} onPress={() => navigation.goBack()} variant="outline" />
      </View>
    );
  }

  const overdue = isTaskOverdue(task);
  const prepareFieldLabel = t(`tasks:harvestJobs.${jobType}.field`, { defaultValue: '' });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          <Text
            style={[
              styles.taskTitle,
              { color: colors.textPrimary, fontSize: isEveryday ? 24 * fontScaleMultiplier : undefined },
            ]}
          >
            {task.title}
          </Text>
          {phase ? (
            <Text style={[styles.phaseWord, { color: colors.primaryDark, fontSize: 15 * fontScaleMultiplier }]}>
              {t('tasks:harvest.word')} · {t(`tasks:harvest.phases.${phase}`)}
            </Text>
          ) : null}
          <View style={styles.heroMeta}>
            <StatusBadge status={task.status} showIcon />
            {overdue ? (
              <View style={[styles.overduePill, { backgroundColor: colors.errorLight }]}>
                <Text style={{ color: colors.error, fontSize: 10, fontWeight: '700' }}>
                  {t('tasks:overdue')}
                </Text>
              </View>
            ) : null}
          </View>
          {field ? (
            <TouchableOpacity style={styles.fieldLink} onPress={() => navigation.navigate('FieldDetail', { fieldId: field.id })}>
              <Ionicons name="leaf-outline" size={14} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>{field.name}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
          {helperText ? (
            <Text style={[styles.helper, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
              {helperText}
            </Text>
          ) : null}
          {!isEveryday ? <TaskStatusStepper status={task.status} /> : null}
        </View>

        {isFieldOwner() ? (
          <Button
            title={t('partners:findPartner')}
            variant="outline"
            onPress={() =>
              navigation.navigate('Partners', {
                fieldId: task.fieldId,
                taskId: task.id,
                category: typeKey,
              })
            }
          />
        ) : null}

        {capture ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm }}>
            <Button
              title={t('capture:types.expense.title')}
              variant="outline"
              style={{ flex: 1, minHeight: tapMin }}
              onPress={() =>
                capture.openCapture({
                  fieldId: task.fieldId,
                  taskId: task.id,
                  preferredType: 'expense',
                })
              }
            />
            <Button
              title={t('capture:types.observation.title')}
              variant="outline"
              style={{ flex: 1, minHeight: tapMin }}
              onPress={() =>
                capture.openCapture({
                  fieldId: task.fieldId,
                  taskId: task.id,
                  preferredType: 'observation',
                })
              }
            />
          </View>
        ) : null}

        {phase === 'prepare' && checklist.length > 0 ? (
          <Section title={t('tasks:harvest.checklist')}>
            {checklist.map((item, index) => {
              const on = !!checked[index];
              return (
                <Pressable
                  key={`${item}-${index}`}
                  onPress={() => setChecked((prev) => ({ ...prev, [index]: !prev[index] }))}
                  style={[
                    styles.checkRow,
                    {
                      minHeight: tapMin,
                      borderColor: on ? colors.primaryDark : colors.borderLight,
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                >
                  <Ionicons
                    name={on ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={on ? colors.primaryDark : colors.textTertiary}
                  />
                  <Text style={{ color: colors.textPrimary, flex: 1, fontSize: 16 * fontScaleMultiplier }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
            {prepareFieldLabel ? (
              <TextInput
                value={prepareNote}
                onChangeText={setPrepareNote}
                placeholder={prepareFieldLabel}
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.noteInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    minHeight: tapMin,
                  },
                ]}
              />
            ) : null}
          </Section>
        ) : null}

        {!isEveryday || !phase ? (
          <>
            <Section title={t('tasks:detailInfo')}>
              <Card variant="outlined">
                <DetailRow label={t('tasks:type')} value={typeKey} colors={colors} />
                {task.description ? (
                  <DetailRow label={t('tasks:notes')} value={task.description} colors={colors} />
                ) : null}
                {task.statusLabel ? (
                  <DetailRow label={t('tasks:status')} value={task.statusLabel} colors={colors} />
                ) : null}
              </Card>
            </Section>

            <Section title={t('tasks:detailSchedule')}>
              <Card variant="outlined">
                {task.plannedStart ? (
                  <DetailRow
                    label={t('tasks:scheduled')}
                    value={formatDate(task.plannedStart)}
                    colors={colors}
                  />
                ) : null}
                {task.plannedEnd ? (
                  <DetailRow label={t('tasks:due')} value={formatDate(task.plannedEnd)} colors={colors} />
                ) : null}
                {task.estimatedCost !== undefined ? (
                  <DetailRow
                    label={t('tasks:cost')}
                    value={`${task.estimatedCost} ${task.estimatedCostCurrency || 'EUR'}`}
                    colors={colors}
                  />
                ) : null}
              </Card>
            </Section>
          </>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {primaryAction ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopColor: colors.border,
              ...createElevation(colors, 'lg'),
            },
          ]}
        >
          <Button
            title={primaryAction.label}
            onPress={primaryAction.onPress}
            loading={isUpdating}
            style={{ ...styles.footerBtn, flex: 1, minHeight: tapMin }}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.base },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  taskTitle: { ...typography.styles.h2, fontWeight: '700', marginBottom: spacing.sm },
  phaseWord: { fontWeight: '700', marginBottom: spacing.sm },
  helper: { marginTop: spacing.sm, lineHeight: 22 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  overduePill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 10 },
  fieldLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailLabel: { ...typography.styles.bodySmall, flex: 1 },
  detailValue: { ...typography.styles.bodySmall, fontWeight: '600', flex: 1, textAlign: 'right' },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  footerBtn: { minWidth: 120 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});

export default TaskDetailScreen;
