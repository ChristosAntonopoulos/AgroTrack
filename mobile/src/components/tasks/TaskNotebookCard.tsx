import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Sheet from '../ui/Sheet';
import type { Task } from '../../services/taskService';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatCompactTaskPeriod } from '../../utils/taskDateRange';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { hexToRgba } from '../../utils/hexToRgba';
import {
  leadTask,
  notebookStatus,
  whenTone,
  type NotebookMenuAction,
  type TaskUnit,
} from '../../utils/taskNotebook';
import { radii, spacing } from '../../theme';
import TaskCategoryGlyph from './TaskCategoryGlyph';

export type { NotebookMenuAction };

type Props = {
  unit: TaskUnit;
  fieldName: (fieldId: string) => string;
  fieldColor?: (fieldId: string) => string | undefined;
  personName?: string;
  year: number;
  busy?: boolean;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onMenu?: (task: Task, action: NotebookMenuAction) => void;
};

const TaskNotebookCard: React.FC<Props> = ({
  unit,
  fieldName,
  fieldColor,
  personName,
  year,
  busy,
  onOpen,
  onComplete,
  onMenu,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const task = leadTask(unit);
  const status = notebookStatus(task.status);
  const done = status === 'done';
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const tone = whenTone(task);
  const period = formatCompactTaskPeriod(
    task.scheduledFor || task.plannedStart,
    task.plannedEnd,
    i18n.language,
    year
  );
  const when =
    tone === 'overdue'
      ? t('notebook.when.overdue')
      : tone === 'today'
        ? t('notebook.when.today')
        : tone === 'tomorrow'
          ? t('notebook.when.tomorrow')
          : tone === 'none'
            ? ''
            : period || '';
  const where = fieldName(task.fieldId);
  const who = personName || t('notebook.unassigned');
  const metaParts = [where, when, who].filter(Boolean);
  const accent = resolveTaskCategoryAccent(task.templateCode);
  const color = resolveFieldColor(fieldColor?.(task.fieldId), task.fieldId);
  const urgent = tone === 'overdue';

  const menuItems: Array<{
    id: NotebookMenuAction;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }> = [
    { id: 'reschedule', label: t('notebook.menu.reschedule'), icon: 'calendar-outline' },
    { id: 'assign', label: t('notebook.menu.assign'), icon: 'person-outline' },
    { id: 'repeat', label: t('notebook.menu.repeat'), icon: 'refresh-outline' },
    { id: 'edit', label: t('notebook.menu.edit'), icon: 'create-outline' },
    { id: 'complete', label: t('notebook.menu.complete'), icon: 'checkmark-circle-outline' },
  ];

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
      <View style={styles.row}>
        <View style={styles.checkBlock}>
          <Pressable
            onPress={() => {
              if (!done) onComplete(task);
            }}
            disabled={busy || status === 'skipped'}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done, disabled: busy || status === 'skipped' }}
            accessibilityLabel={done ? t('notebook.actions.completed') : t('notebook.actions.markDone')}
            style={[
              styles.check,
              {
                minHeight: Math.max(48, tapMin),
                minWidth: Math.max(48, tapMin),
                borderColor: done ? colors.primary : colors.borderLight,
                backgroundColor: done ? colors.primary : colors.surface,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            {done ? <Ionicons name="checkmark" size={22} color={colors.onOlive} /> : null}
          </Pressable>
          {!done && status === 'planned' ? (
            <Text
              style={[
                styles.checkCue,
                { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
              ]}
              numberOfLines={2}
            >
              {t('notebook.actions.markDone')}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => onOpen(task)}
          style={styles.hit}
          accessibilityRole="button"
        >
          <TaskCategoryGlyph templateCode={task.templateCode} accent={accent} size={40} />
          <View style={styles.copy}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  fontSize: 16 * fontScaleMultiplier,
                  textDecorationLine: done ? 'line-through' : 'none',
                  opacity: done ? 0.7 : 1,
                },
              ]}
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
                  <Text
                    style={
                      index === 1 && urgent
                        ? { fontWeight: '700', color: colors.textPrimary }
                        : undefined
                    }
                  >
                    {part}
                  </Text>
                </Text>
              ))}
            </Text>
            <View style={[styles.dot, { backgroundColor: color }]} />
          </View>
        </Pressable>

        {onMenu && status === 'planned' ? (
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

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('fieldWork.actions.more')}
        edge="bottom"
        size="sm"
      >
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  checkBlock: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 72,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
  },
  checkCue: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  hit: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
    alignItems: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontWeight: '700', lineHeight: 22, letterSpacing: -0.2 },
  meta: { lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 99, marginTop: 6 },
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
