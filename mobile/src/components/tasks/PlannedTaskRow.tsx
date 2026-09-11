import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';
import Button from '../ui/Button';
import AccentCard from '../ui/AccentCard';
import { DOMAIN_ACCENTS } from '../../utils/domainAccents';
import type { FieldTask } from '../../services/fieldWorkService';
import { formatCompactTaskPeriod } from '../../utils/taskDateRange';
import { checklistProgress } from '../../utils/plannedTaskGroups';
import { isWeatherSensitiveTemplate } from '../../data/fieldWorkCatalogueLabels';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { weatherExplanationCopy } from '../../utils/proposalPresentation';
import { TaskWeatherChip } from './TaskChoiceChips';

const PlannedTaskRow = ({
  task,
  fieldName,
  personName,
  year,
  busy,
  highlighted,
  onStart,
  onOpen,
}: {
  task: FieldTask;
  fieldName: string;
  personName?: string;
  year: number;
  busy?: boolean;
  highlighted?: boolean;
  onStart: () => void;
  onOpen: () => void;
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, fontScaleMultiplier } = useTheme();
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const period = formatCompactTaskPeriod(task.plannedStart, task.plannedEnd, i18n.language, year);
  const progress = checklistProgress(task);
  const blocked = String(task.status).toLowerCase() === 'blocked';
  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const showWeather =
    weatherKind === 'unknown' ||
    (isWeatherSensitiveTemplate(task.templateCode) && weatherKind !== 'not_sensitive');
  const weatherCopy = useMemo(
    () => weatherExplanationCopy(weatherKind === 'not_sensitive' ? 'not_sensitive' : weatherKind, [], i18n.language),
    [weatherKind, i18n.language]
  );

  return (
    <AccentCard
      accentColor={DOMAIN_ACCENTS.task}
      style={[styles.card, highlighted ? { borderColor: colors.primary } : null]}
    >
      <Pressable onPress={onOpen}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {title}
        </Text>
        <Text style={[styles.context, { color: colors.textSecondary }]}>
          {[fieldName, period].filter(Boolean).join(' · ')}
        </Text>
      </Pressable>
      <View style={styles.meta}>
        {blocked ? (
          <TaskWeatherChip kind="caution" label={t('fieldWork.task.blocked')} />
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
        {progress.total > 0 ? (
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {t('fieldWork.task.checksShort', { done: progress.done, total: progress.total })}
          </Text>
        ) : null}
        {personName ? (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{personName}</Text>
        ) : null}
      </View>
      {weatherCopy.headline && showWeather && weatherKind === 'unknown' ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{weatherCopy.headline}</Text>
      ) : null}
      {blocked ? (
        <Button title={t('fieldWork.actions.open')} variant="outline" onPress={onOpen} disabled={busy} />
      ) : (
        <Button title={t('fieldWork.actions.start')} onPress={onStart} disabled={busy} />
      )}
    </AccentCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '700' },
  context: { ...typography.styles.bodySmall, marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.styles.caption, fontWeight: '600' },
  hint: { ...typography.styles.caption },
});

export default PlannedTaskRow;
