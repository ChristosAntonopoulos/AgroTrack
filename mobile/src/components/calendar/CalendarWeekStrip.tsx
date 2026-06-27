import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { format, isSameDay } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { CalendarEvent } from '../../services/calendarService';

interface Props {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  language: string;
}

const CalendarWeekStrip: React.FC<Props> = ({ anchorDate, events, onSelectDate, language }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('calendar');
  const locale = language === 'el' ? el : enUS;

  const start = new Date(anchorDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const countForDay = (date: Date) =>
    events.filter(e => isSameDay(new Date(e.start), date)).length;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('weekOf', { date: format(anchorDate, 'd MMM', { locale }) })}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {days.map(date => {
          const selected = isSameDay(date, anchorDate);
          const count = countForDay(date);
          const today = isSameDay(date, new Date());
          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.day,
                {
                  backgroundColor: selected ? colors.primaryDark : colors.surfaceMuted,
                  borderColor: today ? colors.primaryDark : colors.border,
                },
              ]}
              onPress={() => onSelectDate(date)}
            >
              <Text
                style={[
                  styles.weekday,
                  { color: selected ? colors.white : colors.textSecondary },
                ]}
              >
                {format(date, 'EEE', { locale })}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  { color: selected ? colors.white : colors.textPrimary },
                ]}
              >
                {format(date, 'd')}
              </Text>
              {count > 0 ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: selected ? colors.white : colors.primary },
                  ]}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  label: { ...typography.styles.caption, marginBottom: spacing.sm, fontWeight: '600' },
  row: { gap: spacing.sm },
  day: {
    width: 52,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  weekday: { ...typography.styles.caption, fontSize: 10, fontWeight: '600' },
  dayNum: { ...typography.styles.body, fontWeight: '700', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
});

export default CalendarWeekStrip;
