import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { CalendarEvent } from '../../services/calendarService';
import { spacing, typography } from '../../theme';

type Props = {
  month: Date;
  events: CalendarEvent[];
  language: string;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
};

const CalendarMonthGrid: React.FC<Props> = ({ month, events, language, onSelectDate, onChangeMonth }) => {
  const { colors } = useTheme();
  const locale = language === 'el' ? el : enUS;
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((event) => {
      const key = format(new Date(event.start), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [events]);

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable onPress={() => onChangeMonth(addMonths(month, -1))}>
          <Text style={[styles.navBtn, { color: colors.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{format(month, 'LLLL yyyy', { locale })}</Text>
        <Pressable onPress={() => onChangeMonth(addMonths(month, 1))}>
          <Text style={[styles.navBtn, { color: colors.primary }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());
          const count = counts.get(key) || 0;
          return (
            <Pressable
              key={key}
              onPress={() => onSelectDate(day)}
              style={[
                styles.cell,
                {
                  backgroundColor: today ? colors.primaryLight : 'transparent',
                  borderWidth: today ? 1 : 0,
                  borderColor: today ? colors.oliveBorder : 'transparent',
                  opacity: inMonth ? 1 : 0.4,
                },
              ]}
            >
              <Text style={{ color: today ? colors.primary : colors.textPrimary, fontWeight: today ? '800' : '500' }}>
                {format(day, 'd')}
              </Text>
              {count > 0 ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { fontSize: 28, paddingHorizontal: spacing.sm, fontWeight: '700' },
  title: { ...typography.styles.body, fontWeight: '800', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});

export default CalendarMonthGrid;
