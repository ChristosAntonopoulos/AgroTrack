import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';
import Button from '../ui/Button';
import AccentCard from '../ui/AccentCard';
import { DOMAIN_ACCENTS } from '../../utils/domainAccents';
import type { FieldTask } from '../../services/fieldWorkService';
import { formatCompactTaskPeriod, formatTaskDay } from '../../utils/taskDateRange';
import { checklistProgress, taskStartedAt } from '../../utils/plannedTaskGroups';
import { isWeatherSensitiveTemplate } from '../../data/fieldWorkCatalogueLabels';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { weatherExplanationCopy } from '../../utils/proposalPresentation';
import {
  attentionReasonKey,
  type AttentionReasonId,
} from '../../utils/nowAttention';
import { TaskWeatherChip } from './TaskChoiceChips';

export type TaskWorkPrimaryAction =
  | 'start'
  | 'continue'
  | 'open'
  | 'viewResult'
  | 'restore'
  | 'repeat';

type Props = {
  task: FieldTask;
  fieldName: string;
  personName?: string;
  year: number;
  busy?: boolean;
  highlighted?: boolean;
  attentionReasonId?: AttentionReasonId;
  attentionParams?: Record<string, string | number>;
  primaryAction: TaskWorkPrimaryAction;
  secondaryAction?: 'reschedule' | 'pause' | null;
  onPrimary: () => void;
  onSecondary?: () => void;
  onOpen: () => void;
};

const TaskWorkCard = ({
  task,
  fieldName,
  personName,
  year,
  busy,
  highlighted,
  attentionReasonId,
  attentionParams,
  primaryAction,
  secondaryAction,
  onPrimary,
  onSecondary,
  onOpen,
}: Props) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, fontScaleMultiplier } = useTheme();
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const period = formatCompactTaskPeriod(task.plannedStart, task.plannedEnd, i18n.language, year);
  const progress = checklistProgress(task);
  const status = String(task.status).toLowerCase();
  const blocked = status === 'blocked';
  const inProgress = status === 'in_progress';
  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const showWeather =
    weatherKind === 'unknown' ||
    (isWeatherSensitiveTemplate(task.templateCode) && weatherKind !== 'not_sensitive');
  const weatherCopy = useMemo(
    () =>
      weatherExplanationCopy(
        weatherKind === 'not_sensitive' ? 'not_sensitive' : weatherKind,
        [],
        i18n.language
      ),
    [weatherKind, i18n.language]
  );

  const primaryLabel =
    primaryAction === 'start'
      ? t('fieldWork.actions.start')
      : primaryAction === 'continue'
        ? t('fieldWork.actions.continueIt')
        : primaryAction === 'viewResult'
          ? t('fieldWork.actions.viewResult', { defaultValue: t('fieldWork.actions.open') })
          : primaryAction === 'restore'
            ? t('fieldWork.actions.restore', { defaultValue: 'Restore' })
            : primaryAction === 'repeat'
              ? t('fieldWork.actions.repeat', { defaultValue: 'Repeat' })
              : t('fieldWork.actions.open');

  const secondaryLabel =
    secondaryAction === 'reschedule'
      ? t('fieldWork.actions.changeDate', { defaultValue: 'Change date' })
      : secondaryAction === 'pause'
        ? t('fieldWork.actions.pause', { defaultValue: 'Pause' })
        : null;

  const started = formatTaskDay(taskStartedAt(task), i18n.language, year);
  const reasonText = attentionReasonId
    ? t(attentionReasonKey(attentionReasonId), attentionParams || {})
    : null;
  const sentence =
    inProgress && progress.total > 0
      ? t('fieldWork.task.progressSentence', {
          defaultValue: '{{started}} · {{done}} of {{total}} checks',
          started: started || t('fieldWork.task.startedRecently', { defaultValue: 'Started' }),
          done: progress.done,
          total: progress.total,
        })
      : null;

  return (
    <AccentCard
      accentColor={DOMAIN_ACCENTS.task}
      style={[styles.card, highlighted ? { borderColor: colors.primary } : null]}
    >
      <Pressable onPress={onOpen} accessibilityRole="button">
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {title}
        </Text>
        <Text style={[styles.context, { color: colors.textSecondary }]}>
          {[fieldName, period].filter(Boolean).join(' · ')}
        </Text>
        {reasonText ? (
          <Text style={[styles.reason, { color: colors.warning || colors.textSecondary }]}>{reasonText}</Text>
        ) : null}
        {sentence ? (
          <Text style={[styles.sentence, { color: colors.textTertiary }]}>{sentence}</Text>
        ) : null}
        {task.isPaused && task.pauseReason ? (
          <Text style={[styles.reason, { color: colors.textSecondary }]}>{task.pauseReason}</Text>
        ) : null}
      </Pressable>

      <View style={styles.meta}>
        {blocked ? <TaskWeatherChip kind="caution" label={t('fieldWork.task.blocked')} /> : null}
        {task.isPaused ? (
          <TaskWeatherChip
            kind="caution"
            label={t('fieldWork.task.paused', { defaultValue: 'Paused' })}
          />
        ) : null}
        {showWeather ? (
          <TaskWeatherChip
            kind={
              weatherKind === 'good'
                ? 'good'
                : weatherKind === 'caution'
                  ? 'caution'
                  : weatherKind === 'unsuitable'
                    ? 'unsuitable'
                    : 'unknown'
            }
            label={
              weatherKind === 'unknown'
                ? t('fieldWork.weather.unknown')
                : t(`fieldWork.proposal.chips.${weatherKind}`)
            }
          />
        ) : null}
        {personName ? (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{personName}</Text>
        ) : null}
      </View>

      {weatherCopy.headline && showWeather && weatherKind !== 'good' ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{weatherCopy.headline}</Text>
      ) : null}

      <View style={styles.actions}>
        {secondaryLabel && onSecondary ? (
          <Button title={secondaryLabel} variant="outline" onPress={onSecondary} disabled={busy} />
        ) : null}
        <Button title={primaryLabel} onPress={onPrimary} disabled={busy} />
      </View>
    </AccentCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '700' },
  context: { ...typography.styles.bodySmall, marginTop: 2 },
  reason: { ...typography.styles.bodySmall, marginTop: 6, fontWeight: '600' },
  sentence: { ...typography.styles.caption, marginTop: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.styles.caption, fontWeight: '600' },
  hint: { ...typography.styles.caption },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

export default TaskWorkCard;
