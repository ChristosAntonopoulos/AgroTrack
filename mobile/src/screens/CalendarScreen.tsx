import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { format, isSameDay } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useRefresh } from '../hooks/useRefresh';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import EmptyState from '../components/EmptyState';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Section from '../components/layout/Section';
import CalendarEventRow from '../components/calendar/CalendarEventRow';
import CalendarWeekStrip from '../components/calendar/CalendarWeekStrip';
import CalendarMonthGrid from '../components/calendar/CalendarMonthGrid';
import CalendarFilterSheet from '../components/calendar/CalendarFilterSheet';
import {
  AGENDA_GROUP_ORDER,
  groupEventsByAgenda,
  groupEventsByField,
  formatDayHeader,
  isEventOverdue,
} from '../utils/calendarViewUtils';
import { CalendarFilters } from '../services/calendarService';
import { typography, spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { MainTabParamList, RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CalRoute = RouteProp<MainTabParamList, 'Calendar'>;
type ViewMode = 'agenda' | 'week' | 'month' | 'field';

const CalendarScreen = () => {
  const route = useRoute<CalRoute>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { isEveryday } = usePreferences();
  const { t, i18n } = useTranslation(['calendar', 'common', 'tasks']);
  const navigation = useNavigation<Nav>();
  const readOnly = !isFieldOwner();

  const paramDate = route.params?.date ? new Date(route.params.date) : new Date();
  const paramFieldId = route.params?.fieldId;

  const [anchorDate, setAnchorDate] = useState(paramDate);
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [filters, setFilters] = useState<CalendarFilters>(() => ({
    showTasks: true,
    showDeadlines: true,
    fieldIds: paramFieldId ? [paramFieldId] : undefined,
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);

  useEffect(() => {
    if (route.params?.date) setAnchorDate(new Date(route.params.date));
    if (route.params?.fieldId) {
      setFilters(prev => ({ ...prev, fieldIds: [route.params!.fieldId!] }));
    }
  }, [route.params?.date, route.params?.fieldId]);

  useEffect(() => {
    if (isEveryday && viewMode !== 'agenda' && viewMode !== 'month') {
      setViewMode('agenda');
    }
  }, [isEveryday, viewMode]);

  const { events, fields, fieldMap, loading, refresh } = useCalendarEvents(anchorDate, filters);
  const { refreshing, onRefresh } = useRefresh(refresh);

  const locale = i18n.language === 'el' ? el : enUS;
  const agendaGroups = useMemo(() => groupEventsByAgenda(events), [events]);
  const fieldGroups = useMemo(() => groupEventsByField(events, fieldMap), [events, fieldMap]);

  const todayEvents = useMemo(
    () => events.filter(e => isSameDay(new Date(e.start), new Date())),
    [events]
  );
  const overdueEvents = useMemo(() => events.filter(isEventOverdue), [events]);

  const activeFilterCount =
    (filters.fieldIds?.length ?? 0) + (filters.statuses?.length ?? 0);

  const fieldFilterName = paramFieldId ? fieldMap.get(paramFieldId) : undefined;

  const viewModeLabels: Record<ViewMode, string> = {
    agenda: t('viewAgenda'),
    week: t('viewWeek'),
    month: t('viewMonth', { defaultValue: 'Month' }),
    field: t('viewField'),
  };

  const daySheetEvents = useMemo(() => {
    if (!daySheetDate) return [];
    return events.filter(e => isSameDay(new Date(e.start), daySheetDate));
  }, [events, daySheetDate]);

  const groupLabel = (key: string) => {
    switch (key) {
      case 'overdue':
        return t('overdueTitle');
      case 'today':
        return t('agendaToday');
      case 'tomorrow':
        return t('agendaTomorrow');
      case 'thisWeek':
        return t('agendaThisWeek');
      case 'later':
        return t('agendaLater');
      default:
        return key;
    }
  };

  const openTask = (taskId?: string) => {
    if (taskId) navigation.navigate('TaskDetail', { taskId });
  };

  const openCreateTask = (date?: Date) => {
    if (readOnly) return;
    navigation.navigate('CreateTask', {
      scheduledStart: date ? date.toISOString() : undefined,
      fieldId: paramFieldId,
    });
  };

  const jumpToToday = () => {
    const today = new Date();
    setAnchorDate(today);
    setDaySheetDate(today);
  };

  const clearFieldFilter = () => {
    navigation.setParams({ fieldId: undefined });
    setFilters(prev => ({ ...prev, fieldIds: undefined }));
  };

  if (loading && events.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const hasVisibleEvents =
    viewMode === 'agenda'
      ? AGENDA_GROUP_ORDER.some(g => agendaGroups[g].length > 0)
      : viewMode === 'week'
        ? events.some(e => isSameDay(new Date(e.start), anchorDate))
        : viewMode === 'month'
          ? events.length > 0
          : fieldGroups.length > 0;

  return (
    <ScreenLayout style={styles.safe}>
      <ScreenHeader
        title={t('title')}
        subtitle={t('subtitleShort', { count: events.length })}
        action={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={jumpToToday}
              style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>
                {t('today')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFiltersOpen(true)}
              style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="options-outline" size={16} color={colors.primaryDark} />
              {activeFilterCount > 0 ? (
                <View style={[styles.filterDot, { backgroundColor: colors.error }]} />
              ) : null}
            </TouchableOpacity>
          </View>
        }
      />

      {fieldFilterName ? (
        <View style={[styles.fieldBanner, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Ionicons name="leaf" size={16} color={colors.primaryDark} />
          <Text style={[styles.fieldBannerText, { color: colors.textPrimary }]} numberOfLines={1}>
            {fieldFilterName}
          </Text>
          <TouchableOpacity onPress={clearFieldFilter}>
            <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>
              {t('tasks:showAll')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <SummaryPill icon="today-outline" label={t('summaryToday')} value={todayEvents.length} colors={colors} />
        <View style={[styles.summaryDivider, { backgroundColor: colors.borderLight }]} />
        <SummaryPill icon="alert-circle-outline" label={t('summaryOverdue')} value={overdueEvents.length} colors={colors} accent={colors.error} />
        <View style={[styles.summaryDivider, { backgroundColor: colors.borderLight }]} />
        <SummaryPill icon="calendar-outline" label={t('summaryTotal')} value={events.length} colors={colors} />
      </View>

      {!isEveryday ? (
      <View style={styles.viewToggle}>
        {(['agenda', 'week', 'month', 'field'] as ViewMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleChip,
              {
                flex: 1,
                backgroundColor: viewMode === mode ? colors.primaryDark : colors.surface,
                borderColor: viewMode === mode ? colors.primaryDark : colors.border,
              },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={{
                color: viewMode === mode ? colors.textInverse : colors.textSecondary,
                fontWeight: '600',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              {viewModeLabels[mode]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      ) : (
      <View style={styles.viewToggle}>
        {(['agenda', 'month'] as ViewMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleChip,
              {
                flex: 1,
                backgroundColor: viewMode === mode ? colors.primaryDark : colors.surface,
                borderColor: viewMode === mode ? colors.primaryDark : colors.border,
              },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={{
                color: viewMode === mode ? colors.textInverse : colors.textSecondary,
                fontWeight: '600',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              {viewModeLabels[mode]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      )}

      {viewMode === 'month' ? (
        <CalendarMonthGrid
          month={anchorDate}
          events={events}
          language={i18n.language}
          onSelectDate={(date) => {
            setAnchorDate(date);
            setDaySheetDate(date);
            setViewMode('agenda');
          }}
          onChangeMonth={setAnchorDate}
        />
      ) : null}

      {viewMode !== 'field' && viewMode !== 'month' ? (
        <CalendarWeekStrip
          anchorDate={anchorDate}
          events={events}
          onSelectDate={date => {
            setAnchorDate(date);
            setDaySheetDate(date);
          }}
          language={i18n.language}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryDark} />
        }
        showsVerticalScrollIndicator={false}
      >
        {!hasVisibleEvents ? (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={36} color={colors.primaryDark} />}
            title={t('noEventsDay')}
            description={readOnly ? t('agendaEmpty') : t('emptyOwnerHint')}
            action={
              !readOnly
                ? { label: t('newTask'), onPress: () => openCreateTask(anchorDate) }
                : undefined
            }
          />
        ) : null}

        {viewMode === 'agenda' &&
          AGENDA_GROUP_ORDER.map(group => {
            const items = agendaGroups[group];
            if (!items.length) return null;
            return (
              <Section key={group} title={groupLabel(group)}>
                {items.map(event => (
                  <CalendarEventRow
                    key={event.id}
                    event={event}
                    language={i18n.language}
                    onPress={() => openTask(event.taskId)}
                  />
                ))}
              </Section>
            );
          })}

        {viewMode === 'week' && hasVisibleEvents ? (
          <Section title={formatDayHeader(anchorDate, i18n.language)}>
            {events
              .filter(e => isSameDay(new Date(e.start), anchorDate))
              .map(event => (
                <CalendarEventRow
                  key={event.id}
                  event={event}
                  language={i18n.language}
                  onPress={() => openTask(event.taskId)}
                />
              ))}
          </Section>
        ) : null}

        {viewMode === 'field' &&
          fieldGroups.map(group => (
            <Section key={group.fieldId} title={group.fieldName}>
              {group.events.map(event => (
                <CalendarEventRow
                  key={event.id}
                  event={event}
                  language={i18n.language}
                  onPress={() => openTask(event.taskId)}
                />
              ))}
            </Section>
          ))}
      </ScrollView>

      {!readOnly ? (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primaryDark, ...createElevation(colors, 'lg') },
          ]}
          onPress={() => openCreateTask(anchorDate)}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      ) : null}

      <CalendarFilterSheet
        visible={filtersOpen}
        fields={fields}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
      />

      <Modal visible={daySheetDate !== null} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.daySheet, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {daySheetDate ? format(daySheetDate, 'PPP', { locale }) : ''}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {daySheetEvents.length === 0 ? (
                <Text style={{ color: colors.textSecondary, paddingVertical: spacing.md }}>
                  {t('noEventsDay')}
                </Text>
              ) : (
                daySheetEvents.map(event => (
                  <CalendarEventRow
                    key={event.id}
                    event={event}
                    language={i18n.language}
                    onPress={() => {
                      setDaySheetDate(null);
                      openTask(event.taskId);
                    }}
                  />
                ))
              )}
            </ScrollView>
            {!readOnly && daySheetDate ? (
              <Button
                title={t('newTask')}
                onPress={() => {
                  const d = daySheetDate;
                  setDaySheetDate(null);
                  openCreateTask(d);
                }}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            ) : null}
            <Button
              title={t('closePanel')}
              variant="outline"
              onPress={() => setDaySheetDate(null)}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};

const SummaryPill = ({
  icon,
  label,
  value,
  colors,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  colors: ReturnType<typeof useTheme>['colors'];
  accent?: string;
}) => (
  <View style={styles.summaryPill}>
    <Ionicons name={icon} size={16} color={accent ?? colors.primaryDark} />
    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldBannerText: { flex: 1, fontWeight: '600', fontSize: 13 },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  summaryPill: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { ...typography.styles.h3, fontWeight: '700', fontSize: 18 },
  summaryLabel: { ...typography.styles.caption, fontSize: 10, textAlign: 'center' },
  summaryDivider: { width: 1, alignSelf: 'stretch', marginVertical: spacing.xs },
  viewToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  toggleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  content: { paddingBottom: 100 },
  sectionTitle: { ...typography.styles.h3, fontWeight: '700', marginBottom: spacing.sm },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  daySheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.base,
    maxHeight: '70%',
  },
});

export default CalendarScreen;
