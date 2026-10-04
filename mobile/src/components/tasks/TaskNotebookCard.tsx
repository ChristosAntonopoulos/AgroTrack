import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Sheet from '../ui/Sheet';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatCompactTaskPeriod } from '../../utils/taskDateRange';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { hexToRgba } from '../../utils/hexToRgba';
import {
  checklistCount,
  leadTask,
  notebookStatus,
  primaryActionFor,
  weatherChangesDecision,
  whenTone,
  type NotebookAction,
  type TaskUnit,
} from '../../utils/taskNotebook';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { radii, spacing } from '../../theme';
import TaskCategoryGlyph from './TaskCategoryGlyph';

export type NotebookMenuAction = 'reschedule' | 'block' | 'skip' | 'cancel' | 'reopen';

type Props = {
  unit: TaskUnit;
  fieldName: (fieldId: string) => string;
  fieldColor?: (fieldId: string) => string | undefined;
  personName?: string;
  year: number;
  busy?: boolean;
  onOpen: (task: FieldTask) => void;
  onPrimary: (task: FieldTask, action: NotebookAction) => void;
  onMenu?: (task: FieldTask, action: NotebookMenuAction) => void;
};

const TaskNotebookCard: React.FC<Props> = ({
  unit,
  fieldName,
  fieldColor,
  personName,
  year,
  busy,
  onOpen,
  onPrimary,
  onMenu,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const task = leadTask(unit);
  const status = notebookStatus(task.status);
  const action = primaryActionFor(status);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const several = unit.tasks.length > 1;
  const doneFields = unit.tasks.filter((item) => notebookStatus(item.status) === 'completed').length;
  const checks = checklistCount(task);
  const tone = whenTone(task);
  const period = formatCompactTaskPeriod(task.plannedStart, task.plannedEnd, i18n.language, year);
  const when =
    tone === 'overdue'
      ? t('notebook.when.overdue')
      : tone === 'today' || tone === 'progress'
        ? t('notebook.when.today')
        : tone === 'tomorrow'
          ? t('notebook.when.tomorrow')
          : tone === 'none'
            ? t('notebook.when.noDate')
            : period || t('notebook.when.noDate');
  const where = several ? t('notebook.fieldCount', { n: unit.tasks.length }) : fieldName(task.fieldId);
  const progress = several
    ? t('notebook.fieldProgress', { done: doneFields, total: unit.tasks.length })
    : checks.total > 0
      ? t('notebook.checks', { done: checks.done, total: checks.total })
      : null;
  const showWeather = weatherChangesDecision(task);
  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const accent = resolveTaskCategoryAccent(task.templateCode);
  const colorsDots = unit.tasks
    .slice(0, 3)
    .map((item) => resolveFieldColor(fieldColor?.(item.fieldId), item.fieldId));

  const actionLabel =
    action === 'start'
      ? t('fieldWork.actions.start')
      : action === 'continue'
        ? t('fieldWork.actions.continueIt')
        : action === 'resolve'
          ? t('notebook.actions.resolve')
          : t('fieldWork.actions.viewResult');

  const statusLabel = status === 'todo' ? null : t(`notebook.status.${status}` as const);
  const who = personName || t('notebook.unassigned');
  const metaParts = [where, when, who, progress].filter(Boolean);
  const strongPrimary = action === 'start' || action === 'continue' || action === 'resolve';
  const urgent = tone === 'overdue';

  const menuItems: Array<{
    id: NotebookMenuAction;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }> = [];
  if (status !== 'completed' && status !== 'cancelled' && status !== 'skipped') {
    menuItems.push({ id: 'reschedule', label: t('notebook.menu.reschedule'), icon: 'calendar-outline' });
  }
  if (status === 'todo' || status === 'in_progress') {
    menuItems.push({ id: 'block', label: t('notebook.menu.block'), icon: 'pause-outline' });
  }
  if (status === 'todo' || status === 'in_progress' || status === 'blocked') {
    menuItems.push({ id: 'skip', label: t('notebook.menu.skip'), icon: 'play-skip-forward-outline' });
  }
  if (status !== 'completed' && status !== 'cancelled' && status !== 'skipped') {
    menuItems.push({ id: 'cancel', label: t('notebook.menu.cancel'), icon: 'close-circle-outline' });
  }
  if (status === 'completed' || status === 'cancelled' || status === 'skipped') {
    menuItems.push({ id: 'reopen', label: t('notebook.menu.reopen'), icon: 'refresh-outline' });
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: urgent ? hexToRgba(colors.warning, 0.06) : colors.surface,
          borderColor: urgent ? hexToRgba(colors.warning, 0.4) : colors.borderLight,
          borderLeftWidth: urgent ? 3 : StyleSheet.hairlineWidth,
          borderLeftColor: urgent ? colors.warning : colors.borderLight,
        },
      ]}
    >
      <Pressable
        onPress={() => onOpen(task)}
        style={styles.hit}
        accessibilityRole="button"
      >
        <TaskCategoryGlyph templateCode={task.templateCode} accent={accent} size={40} />
        <View style={styles.copy}>
          <Text
            style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {metaParts.map((part, index) => (
              <Text key={`${part}-${index}`}>
                {index > 0 ? ' · ' : ''}
                <Text style={index === 1 && urgent ? { fontWeight: '700', color: colors.textPrimary } : undefined}>
                  {part}
                </Text>
              </Text>
            ))}
          </Text>
          {(statusLabel || showWeather) ? (
            <View style={styles.statusRow}>
              {statusLabel ? (
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusLabel}</Text>
              ) : null}
              {showWeather ? (
                <Text style={[styles.statusText, { color: colors.warning }]}>
                  {weatherKind === 'unsuitable'
                    ? t('notebook.weather.unsuitable')
                    : t('notebook.weather.caution')}
                </Text>
              ) : null}
            </View>
          ) : null}
          {colorsDots.length > 0 ? (
            <View style={styles.dots}>
              {colorsDots.map((color, index) => (
                <View key={`${color}-${index}`} style={[styles.dot, { backgroundColor: color }]} />
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onPrimary(task, action)}
          disabled={busy}
          style={[
            styles.primary,
            {
              minHeight: Math.max(44, tapMin * 0.92),
              backgroundColor: strongPrimary ? colors.primary : colors.primaryLight,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={{ color: strongPrimary ? colors.onOlive : colors.primary, fontWeight: '700' }}>
            {actionLabel}
          </Text>
        </Pressable>
        {onMenu ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityLabel={t('fieldWork.actions.more')}
            style={[
              styles.more,
              {
                minHeight: Math.max(44, tapMin * 0.92),
                minWidth: Math.max(44, tapMin * 0.92),
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t('fieldWork.actions.more')} edge="bottom" size="sm">
        {menuItems.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setMenuOpen(false);
              onMenu?.(task, item.id);
            }}
            style={[styles.menuRow, { minHeight: tapMin }]}
          >
            <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }}>{item.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  hit: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontWeight: '700', lineHeight: 22, letterSpacing: -0.2 },
  meta: { lineHeight: 18 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 4, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 99 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  primary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  more: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});

export default TaskNotebookCard;
