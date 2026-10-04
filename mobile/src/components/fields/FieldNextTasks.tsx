import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import { isActiveFieldTask } from '../../services/fieldWorkService';
import { useTheme } from '../../context/ThemeContext';
import TaskCategoryGlyph from '../tasks/TaskCategoryGlyph';
import { getNextUpcomingTask } from '../../utils/fieldDisplay';
import { resolveFieldColor } from '../../utils/fieldColors';
import { createElevation, radii, spacing, typography } from '../../theme';

type Props = {
  tasks: FieldTask[];
  fieldColor?: string | null;
  fieldId: string;
  onOpenTask: (taskId: string) => void;
  onSeeAll: () => void;
};

const formatTaskWhen = (task: FieldTask, locale: string): string => {
  const raw = task.plannedStart || task.plannedEnd;
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};

/** Compact next 1–3 tasks for the field home tab. */
const FieldNextTasks: React.FC<Props> = ({
  tasks,
  fieldColor,
  fieldId,
  onOpenTask,
  onSeeAll,
}) => {
  const { t, i18n } = useTranslation(['fields', 'tasks']);
  const { colors, tapMin } = useTheme();
  const accent = resolveFieldColor(fieldColor, fieldId);
  const locale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-GB';

  const nextTasks = useMemo(() => {
    const active = tasks.filter(isActiveFieldTask);
    const first = getNextUpcomingTask(active);
    if (!first) return [] as FieldTask[];
    const rest = active
      .filter((task) => task.id !== first.id)
      .filter((task) => task.plannedEnd || task.plannedStart)
      .slice()
      .sort((a, b) => {
        const aT = new Date(a.plannedStart || a.plannedEnd || 0).getTime();
        const bT = new Date(b.plannedStart || b.plannedEnd || 0).getTime();
        return aT - bT;
      })
      .slice(0, 2);
    return [first, ...rest];
  }, [tasks]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('fields:page.nextTasks.title', {
            defaultValue: t('fields:upcomingTasks', { defaultValue: 'Επόμενες εργασίες' }),
          })}
        </Text>
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            {t('fields:page.nextTasks.seeAll', {
              defaultValue: t('fields:viewAllTasks', { defaultValue: 'Όλες' }),
            })}
          </Text>
        </Pressable>
      </View>

      {nextTasks.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('fields:page.nextTasks.empty', {
            defaultValue: t('fields:overview.noNextTask'),
          })}
        </Text>
      ) : (
        <View style={styles.list}>
          {nextTasks.map((task) => {
            const when = formatTaskWhen(task, locale);
            return (
              <Pressable
                key={task.id}
                onPress={() => onOpenTask(task.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    minHeight: Math.max(56, tapMin),
                    borderColor: colors.borderLight,
                    backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                    opacity: pressed ? 0.94 : 1,
                  },
                ]}
                accessibilityRole="button"
              >
                <TaskCategoryGlyph
                  templateCode={task.templateCode || 'task'}
                  accent={accent}
                  size={36}
                />
                <View style={styles.copy}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {when ? (
                    <Text style={[styles.rowDetail, { color: colors.textTertiary }]} numberOfLines={1}>
                      {when}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.styles.body,
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowDetail: {
    fontSize: 12,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: spacing.xs,
  },
});

export default FieldNextTasks;
