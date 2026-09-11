import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Button from '../ui/Button';
import AccentCard from '../ui/AccentCard';
import { DOMAIN_ACCENTS } from '../../utils/domainAccents';
import type { FieldTask } from '../../services/fieldWorkService';
import { formatTaskDay } from '../../utils/taskDateRange';
import { checklistProgress, taskStartedAt } from '../../utils/plannedTaskGroups';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';

const InProgressTaskRow = ({
  task,
  fieldName,
  personName,
  year,
  busy,
  onContinue,
}: {
  task: FieldTask;
  fieldName: string;
  personName?: string;
  year: number;
  busy?: boolean;
  onContinue: () => void;
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, fontScaleMultiplier } = useTheme();
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const started = formatTaskDay(taskStartedAt(task), i18n.language, year);
  const updated = formatTaskDay(task.updatedAt, i18n.language, year);
  const showUpdated = Boolean(updated && started && updated !== started);
  const progress = checklistProgress(task);
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <AccentCard accentColor={DOMAIN_ACCENTS.task} style={styles.card}>
      <Pressable onPress={onContinue}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {title}
        </Text>
        <Text style={[styles.context, { color: colors.textSecondary }]}>{fieldName}</Text>
        <Text style={[styles.started, { color: colors.textTertiary }]}>
          {started
            ? `${t('fieldWork.task.started', { date: started })}${personName ? ` · ${personName}` : ''}`
            : personName || ''}
          {showUpdated ? ` · ${t('fieldWork.task.updated', { date: updated })}` : ''}
        </Text>
      </Pressable>
      {progress.total > 0 ? (
        <View>
          <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.barFill,
                { width: `${percent}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
            {t('fieldWork.task.checksLong', { done: progress.done, total: progress.total })}
          </Text>
        </View>
      ) : null}
      <Button
        title={t('fieldWork.actions.continueIt')}
        onPress={onContinue}
        disabled={busy}
      />
    </AccentCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '700' },
  context: { ...typography.styles.bodySmall, marginTop: 2 },
  started: { ...typography.styles.caption, marginTop: 4 },
  barTrack: { height: 6, borderRadius: radii.full, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: radii.full },
  progressLabel: { ...typography.styles.caption, marginTop: 4 },
});

export default InProgressTaskRow;
