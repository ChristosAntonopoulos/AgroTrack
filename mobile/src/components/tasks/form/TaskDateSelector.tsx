import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { radii, spacing, typography } from '../../../theme';
import {
  addDaysToIso,
  athensTodayIso,
  daysInMonth,
  formatLongTaskDate,
  formatMonthHeading,
  greekWeekdayHeaders,
  parseIsoDateParts,
  toIsoDate,
  weekSundayIso,
  weekdayIndexMondayFirst,
} from '../../../utils/taskFormDates';
import { formatTaskDateRange } from '../../../utils/taskDateRange';
import { TaskChoiceChips, TaskHelpText } from '../TaskChoiceChips';

export type DatePreset = 'today' | 'tomorrow' | 'thisWeek' | 'pick' | 'undecided';

const TaskDateSelector = ({
  preset,
  start,
  end,
  multiDay,
  recommendedStart,
  recommendedEnd,
  onPreset,
  onStartChange,
  onEndChange,
  onToggleMultiDay,
}: {
  preset: DatePreset | '';
  start: string;
  end: string;
  multiDay: boolean;
  recommendedStart?: string;
  recommendedEnd?: string;
  onPreset: (preset: DatePreset) => void;
  onStartChange: (iso: string) => void;
  onEndChange: (iso: string) => void;
  onToggleMultiDay: () => void;
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors } = useTheme();
  const today = athensTodayIso();
  const startParts = parseIsoDateParts(start) || parseIsoDateParts(today)!;
  const [cursor, setCursor] = useState({ year: startParts.year, month: startParts.month });
  const pickingEnd = multiDay && Boolean(start) && preset === 'pick';
  const blanks = weekdayIndexMondayFirst(cursor.year, cursor.month, 1);
  const count = daysInMonth(cursor.year, cursor.month);
  const recommended = formatTaskDateRange(recommendedStart, recommendedEnd, i18n.language);

  const display = useMemo(() => {
    if (preset === 'undecided') return '';
    if (multiDay && start && end) return formatTaskDateRange(start, end, i18n.language);
    return formatLongTaskDate(start, i18n.language);
  }, [preset, multiDay, start, end, i18n.language]);

  return (
    <View style={styles.wrap}>
      <TaskChoiceChips
        options={(
          [
            ['today', t('fieldWork.form.when.today')],
            ['tomorrow', t('fieldWork.form.when.tomorrow')],
            ['thisWeek', t('fieldWork.form.when.thisWeek')],
            ['pick', t('fieldWork.form.when.pick')],
            ['undecided', t('fieldWork.form.when.undecided')],
          ] as Array<[DatePreset, string]>
        ).map(([id, label]) => ({ id, label }))}
        value={preset}
        onChange={onPreset}
      />
      {display ? (
        <Text style={[styles.display, { color: colors.textPrimary }]}>{display}</Text>
      ) : null}
      {recommended && preset !== 'undecided' ? (
        <TaskHelpText>
          {`${t('fieldWork.form.recommendedWindow')}: ${recommended}`}
        </TaskHelpText>
      ) : null}
      {preset && preset !== 'undecided' ? (
        <Pressable onPress={onToggleMultiDay} style={styles.link}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {multiDay ? t('fieldWork.form.singleDay') : t('fieldWork.form.moreDays')}
          </Text>
        </Pressable>
      ) : null}
      {preset === 'pick' ? (
        <View style={[styles.cal, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
          <View style={styles.calNav}>
            <Pressable
              onPress={() => {
                const next = new Date(cursor.year, cursor.month - 2, 1);
                setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
              }}
              hitSlop={8}
              accessibilityLabel={t('fieldWork.form.prevMonth')}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <Text style={[styles.calHeading, { color: colors.textPrimary }]}>
              {formatMonthHeading(cursor.year, cursor.month, i18n.language)}
            </Text>
            <Pressable
              onPress={() => {
                const next = new Date(cursor.year, cursor.month, 1);
                setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
              }}
              hitSlop={8}
              accessibilityLabel={t('fieldWork.form.nextMonth')}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.calGrid}>
            {greekWeekdayHeaders().map((day) => (
              <Text key={day} style={[styles.calDow, { color: colors.textTertiary }]}>
                {day}
              </Text>
            ))}
            {Array.from({ length: blanks }, (_, index) => (
              <View key={`e-${index}`} style={styles.calDay} />
            ))}
            {Array.from({ length: count }, (_, index) => {
              const day = index + 1;
              const iso = toIsoDate(cursor.year, cursor.month, day);
              const selected = pickingEnd ? iso === end : iso === start;
              return (
                <Pressable
                  key={iso}
                  onPress={() => (pickingEnd ? onEndChange(iso) : onStartChange(iso))}
                  accessibilityLabel={formatLongTaskDate(iso, i18n.language)}
                  style={[
                    styles.calDay,
                    selected ? { backgroundColor: colors.primary, borderRadius: radii.full } : null,
                  ]}
                >
                  <Text style={{ color: selected ? colors.onOlive : colors.textPrimary, fontWeight: '600' }}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {multiDay && preset !== 'pick' && start ? (
        <TaskHelpText>
          {`${t('fieldWork.form.periodEnds')} ${formatLongTaskDate(
            end || weekSundayIso(start) || addDaysToIso(start, 1),
            i18n.language
          )}`}
        </TaskHelpText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  display: { ...typography.styles.body, fontWeight: '600' },
  link: { paddingVertical: spacing.xs },
  cal: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.md },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calHeading: { ...typography.styles.body, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDow: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  calDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
});

export default TaskDateSelector;
