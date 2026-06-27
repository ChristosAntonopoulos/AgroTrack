import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarEvent } from '../../services/calendarService';
import {
  formatEventTime,
  getEventCategoryColor,
  getEventChipVariant,
} from '../../utils/calendarViewUtils';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

interface Props {
  event: CalendarEvent;
  onPress: () => void;
  language: string;
}

const chipColors = {
  scheduled: { bg: '#e8f5e9', text: '#2e7d32' },
  overdue: { bg: '#ffebee', text: '#c62828' },
  completed: { bg: '#f5f5f5', text: '#757575' },
  deadline: { bg: '#fff3e0', text: '#e65100' },
};

const CalendarEventRow: React.FC<Props> = ({ event, onPress, language }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('calendar');
  const variant = getEventChipVariant(event);
  const chip = chipColors[variant];
  const accent = getEventCategoryColor(event);

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={[styles.chip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.chipText, { color: chip.text }]}>
              {t(`status.${variant === 'deadline' ? 'overdue' : event.status ?? 'pending'}`)}
            </Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {formatEventTime(event.start, language)}
          {event.fieldName ? ` · ${event.fieldName}` : ''}
          {event.taskType ? ` · ${event.taskType}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  body: { flex: 1, padding: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '600', flex: 1 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  chipText: { ...typography.styles.caption, fontWeight: '600', fontSize: 10 },
  meta: { ...typography.styles.caption, marginTop: 4 },
});

export default CalendarEventRow;
