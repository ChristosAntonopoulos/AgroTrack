import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import TaskCard from '../components/domain/TaskCard';
import TasksCategoryBrowse from '../components/domain/TasksCategoryBrowse';
import FilterChips from '../components/ui/FilterChips';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  getTaskFilterCounts,
  sortTasksForList,
  TaskFilter,
  isTaskOverdue,
} from '../utils/taskListUtils';

type Route = RouteProp<MainTabParamList, 'Tasks'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const TaskListScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { isEveryday } = usePreferences();
  const { t } = useTranslation(['tasks', 'common', 'fields']);
  const fieldId = route.params?.fieldId;
  const initialFilter = route.params?.filter as TaskFilter | undefined;

  const { filteredTasks, fields, loading, filter, setFilter, refresh, tasks } = useTasks({
    fieldId,
  });
  const { refreshing, onRefresh } = useRefresh(refresh);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (
      initialFilter === 'planned' ||
      initialFilter === 'in_progress' ||
      initialFilter === 'ready' ||
      initialFilter === 'blocked'
    ) {
      setFilter(initialFilter);
    }
  }, [initialFilter, setFilter]);

  const counts = useMemo(() => getTaskFilterCounts(tasks), [tasks]);
  const sortedTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const searched = needle
      ? filteredTasks.filter(
          (task) =>
            task.title.toLowerCase().includes(needle) ||
            (task.description || '').toLowerCase().includes(needle) ||
            (task.templateCode || '').toLowerCase().includes(needle)
        )
      : filteredTasks;
    return sortTasksForList(searched);
  }, [filteredTasks, query]);
  const overdueCount = useMemo(
    () => tasks.filter((tk) => isTaskOverdue(tk)).length,
    [tasks]
  );

  const filterKeys = (['all', 'planned', 'in_progress', 'ready', 'blocked'] as const);

  const filterOptions = filterKeys.map((value) => ({
    value,
    label: t(`tasks:filters.${value}`, {
      defaultValue:
        value === 'planned'
          ? 'Planned'
          : value === 'ready'
            ? 'Ready'
            : value === 'blocked'
              ? 'Blocked'
              : t(`tasks:filters.${value}`),
    }),
    count: counts[value],
  }));

  const fieldName = fieldId ? fields[fieldId]?.name : undefined;

  const openCount = counts.planned + counts.ready + counts.in_progress + counts.blocked;
  const subtitle = fieldName
    ? t('tasks:subtitleField', { field: fieldName, count: sortedTasks.length })
    : t('tasks:subtitle', { open: openCount, total: counts.all });

  const emptyDescription =
    filter === 'all'
      ? isFieldOwner()
        ? t('tasks:emptyOwner')
        : t('tasks:emptyProducer')
      : t('tasks:emptyFilter', { filter: t(`tasks:filters.${filter}`, { defaultValue: filter }) });

  const handleCreate = () => {
    navigation.navigate('CreateTask', { fieldId });
  };

  if (loading && tasks.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout style={styles.screen}>
      <FlatList
        data={sortedTasks.length === 0 ? [] : (['browse'] as const)}
        keyExtractor={() => 'browse'}
        renderItem={() => (
          <TasksCategoryBrowse
            tasks={sortedTasks}
            fields={fields}
            compact={!isEveryday}
            onPressTask={(taskId) => navigation.navigate('TaskDetail', { taskId })}
          />
        )}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <ScreenHeader
              title={isFieldOwner() ? t('tasks:title') : t('tasks:titleProducer')}
              subtitle={subtitle}
            />

            {fieldName ? (
              <View style={[styles.fieldBanner, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Ionicons name="leaf" size={16} color={colors.primary} />
                <Text style={[styles.fieldBannerText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {fieldName}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    navigation.setParams({ fieldId: undefined, filter: undefined });
                    setFilter('all');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.clearLink, { color: colors.link }]}>
                    {t('tasks:showAll')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <SummaryPill
                icon="flash-outline"
                label={t('tasks:summaryOpen')}
                value={openCount}
                color={colors.infoDark}
                colors={colors}
              />
              <View style={[styles.summaryDivider, { backgroundColor: colors.borderLight }]} />
              <SummaryPill
                icon="alert-circle-outline"
                label={t('tasks:summaryOverdue')}
                value={overdueCount}
                color={colors.error}
                colors={colors}
              />
            </View>

            <FilterChips options={filterOptions} selected={filter} onSelect={setFilter} />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('tasks:searchPlaceholder', { defaultValue: 'Search tasks' })}
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.search,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            />

            {sortedTasks.length > 0 ? (
              <Text style={[styles.resultsLabel, { color: colors.textTertiary }]}>
                {t('tasks:showing', { count: sortedTasks.length })}
              </Text>
            ) : null}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          sortedTasks.length === 0 && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="clipboard-outline" size={36} color={colors.primary} />}
            title={t('common:empty.noTasks')}
            description={emptyDescription}
            action={isFieldOwner() ? { label: t('tasks:createTask'), onPress: handleCreate } : undefined}
          />
        }
      />

      {isFieldOwner() ? (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primary, ...createElevation(colors, 'lg') },
          ]}
          onPress={handleCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('tasks:createTask')}
        >
          <Ionicons name="add" size={28} color={colors.onOlive} />
        </TouchableOpacity>
      ) : null}
    </ScreenLayout>
  );
};

const SummaryPill = ({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View style={styles.summaryPill}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: { paddingBottom: spacing.xs },
  search: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  fieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldBannerText: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  clearLink: {
    ...typography.styles.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  summaryPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  summaryValue: {
    ...typography.styles.h3,
    fontWeight: '700',
    fontSize: 20,
  },
  summaryLabel: {
    ...typography.styles.caption,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },
  resultsLabel: {
    ...typography.styles.caption,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 100,
  },
  emptyContainer: { flexGrow: 1 },
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
});

export default TaskListScreen;
