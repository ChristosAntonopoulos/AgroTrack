import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { getTaskService, getFieldService } from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import Card from '../components/ui/Card';
import Section from '../components/layout/Section';
import StatusBadge from '../components/StatusBadge';
import TaskStatusStepper from '../components/domain/TaskStatusStepper';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EvidenceForm, { EvidenceFormData } from '../components/forms/EvidenceForm';
import OfflineBanner from '../components/OfflineBanner';
import { typography, spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { formatDate, formatDateTime, formatCurrency } from '../utils/formatters';
import { toBoolean } from '../utils/booleanConverter';
import { isTaskOverdue } from '../utils/taskListUtils';
import { harvestFocusForPhase, harvestJobType, resolveHarvestPhase } from '../utils/harvestUtils';
import { RootStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../services/fileService';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;

const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE_URL.replace(/\/$/, '')}${url}`;

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
  const { t } = useTranslation(['tasks', 'common']);
  const [task, setTask] = useState<Task | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [prepareNote, setPrepareNote] = useState('');

  const isUpdating = toBoolean(updating);
  const isAddingEvidence = toBoolean(addingEvidence);
  const phase = task ? resolveHarvestPhase(task) : null;
  const jobType = task ? harvestJobType(task) : '';

  const canWork = Boolean(
    user?.id &&
      (field?.ownerId === user.id ||
        (field?.assignedProducerIds || []).includes(user.id) ||
        user.role === 'Producer')
  );
  const canApprove = isFieldOwner();

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const taskData = await getTaskService().getTask(taskId);
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
      defaultValue: t('tasks:harvestJobs.prepare.checklist', { returnObjects: true, defaultValue: [] }),
    }) as string[];
  }, [phase, jobType, t]);

  const promptPhotoAfterDone = () => {
    Alert.alert(t('tasks:addPhotoTitle'), t('tasks:addPhotoBody'), [
      { text: t('tasks:notNow'), style: 'cancel' },
      { text: t('tasks:camera'), onPress: () => setShowEvidenceForm(true) },
    ]);
  };

  const openHarvestNext = (completed: Task) => {
    const nextPhase = resolveHarvestPhase(completed);
    if (nextPhase === 'daily') {
      Alert.alert(t('tasks:harvest.writeKilosTitle'), t('tasks:harvest.writeKilosBody'), [
        { text: t('tasks:notNow'), style: 'cancel', onPress: promptPhotoAfterDone },
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
        { text: t('tasks:harvest.writeMoneyIn'), onPress: () => navigation.navigate('FieldDetail', { fieldId: completed.fieldId, focus: 'money' }) },
        {
          text: t('tasks:harvest.addMillOil'),
          onPress: () =>
            navigation.navigate('FieldDetail', {
              fieldId: completed.fieldId,
              focus: harvestFocusForPhase('final'),
            }),
        },
      ]);
      return;
    }
    promptPhotoAfterDone();
  };

  const completeTask = async () => {
    if (!task) return;
    try {
      setUpdating(true);
      const updated = await getTaskService().updateTaskStatus(taskId, 'completed');
      setTask(updated);
      if (resolveHarvestPhase(updated)) {
        openHarvestNext(updated);
      } else {
        promptPhotoAfterDone();
      }
    } catch (err: unknown) {
      Alert.alert(t('common:confirm'), err instanceof Error ? err.message : 'Error');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (!task) return;
    if (newStatus === 'completed') {
      Alert.alert(
        t('tasks:confirmDoneTitle'),
        t('tasks:confirmDoneBody', { title: task.title }),
        [
          { text: t('common:cancel'), style: 'cancel' },
          { text: t('common:done'), onPress: () => void completeTask() },
        ]
      );
      return;
    }
    const messages: Record<string, string> = {
      in_progress: t('tasks:startTask'),
      pending: t('tasks:reopenTask'),
    };
    Alert.alert(t('tasks:confirmStatus'), messages[newStatus] ?? t('tasks:confirmStatus'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:confirm'),
        onPress: async () => {
          try {
            setUpdating(true);
            const updated = await getTaskService().updateTaskStatus(taskId, newStatus);
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

  const handleAddEvidence = async (data: EvidenceFormData) => {
    if (!task) return;
    try {
      setAddingEvidence(true);
      const updated = await getTaskService().addEvidence(taskId, data.photoUrl, data.notes);
      setTask(updated);
      Alert.alert(t('tasks:evidenceAdded'));
    } finally {
      setAddingEvidence(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    if (!task) return;
    try {
      setUpdating(true);
      const updated = approve
        ? await getTaskService().approveTask(taskId)
        : await getTaskService().rejectTask(taskId);
      setTask(updated);
    } catch (err: unknown) {
      Alert.alert(t('common:confirm'), err instanceof Error ? err.message : 'Error');
    } finally {
      setUpdating(false);
    }
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
    if (!task) return null;
    if (canWork) {
      if (task.status === 'pending') {
        return { label: t('tasks:startTask'), onPress: () => handleStatusUpdate('in_progress') };
      }
      if (task.status === 'in_progress') {
        return { label: doneLabel, onPress: () => handleStatusUpdate('completed') };
      }
    }
    if (canApprove && task.approvalStatus === 'pending') {
      return { label: t('tasks:approve'), onPress: () => handleApprove(true) };
    }
    return null;
  }, [task, canWork, canApprove, doneLabel, t]);

  const secondaryAction = useMemo(() => {
    if (!task) return null;
    if (canWork && (task.status === 'in_progress' || task.status === 'completed')) {
      return { label: t('tasks:addEvidence'), onPress: () => setShowEvidenceForm(true) };
    }
    if (canApprove && task.approvalStatus === 'pending') {
      return { label: t('tasks:reject'), onPress: () => handleApprove(false) };
    }
    return null;
  }, [task, canWork, canApprove, t]);

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
                <DetailRow label={t('tasks:type')} value={task.type} colors={colors} />
                {task.description ? (
                  <DetailRow label={t('tasks:notes')} value={task.description} colors={colors} />
                ) : null}
              </Card>
            </Section>

            <Section title={t('tasks:detailSchedule')}>
              <Card variant="outlined">
                {task.scheduledStart ? (
                  <DetailRow label={t('tasks:scheduled')} value={formatDate(task.scheduledStart)} colors={colors} />
                ) : null}
                {task.scheduledEnd ? (
                  <DetailRow label={t('tasks:due')} value={formatDate(task.scheduledEnd)} colors={colors} />
                ) : null}
                {task.cost !== undefined ? (
                  <DetailRow label={t('tasks:cost')} value={formatCurrency(task.cost)} colors={colors} />
                ) : null}
              </Card>
            </Section>
          </>
        ) : null}

        {task.evidence?.length > 0 ? (
          <Section title={t('tasks:addEvidence')}>
            {task.evidence.map((evidence, index) => (
              <Card key={index} variant="elevated" style={{ marginBottom: spacing.sm }}>
                {evidence.photoUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(evidence.photoUrl) }}
                    style={styles.evidenceImage}
                    resizeMode="cover"
                  />
                ) : null}
                {evidence.notes ? (
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>{evidence.notes}</Text>
                ) : null}
                <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                  {formatDateTime(evidence.timestamp)}
                </Text>
              </Card>
            ))}
          </Section>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {(primaryAction || secondaryAction) ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border, ...createElevation(colors, 'lg') },
          ]}
        >
          {secondaryAction && !isEveryday ? (
            <Button
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant="outline"
              style={[styles.footerBtn, { minHeight: tapMin }]}
              disabled={isUpdating}
            />
          ) : null}
          {primaryAction ? (
            <Button
              title={primaryAction.label}
              onPress={primaryAction.onPress}
              loading={isUpdating}
              style={[styles.footerBtn, { flex: 1, minHeight: tapMin }]}
            />
          ) : null}
        </View>
      ) : null}

      <EvidenceForm
        visible={showEvidenceForm}
        onClose={() => setShowEvidenceForm(false)}
        onSubmit={handleAddEvidence}
        loading={isAddingEvidence}
      />
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
  evidenceImage: { width: '100%', height: 200, borderRadius: 12 },
  timestamp: { ...typography.styles.caption, marginTop: spacing.xs },
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
