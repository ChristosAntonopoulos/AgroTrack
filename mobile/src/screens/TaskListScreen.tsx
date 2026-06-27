import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import TaskCard from '../components/domain/TaskCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { spacing } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';

type Route = RouteProp<MainTabParamList, 'Tasks'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const TaskListScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['tasks', 'common']);
  const fieldId = route.params?.fieldId;
  const initialFilter = route.params?.filter as 'approval' | undefined;

  const { filteredTasks, fields, loading, setFilter, refresh, tasks } = useTasks({ fieldId });
  const { refreshing, onRefresh } = useRefresh(refresh);

  useEffect(() => {
    if (initialFilter === 'approval') setFilter('approval');
  }, [initialFilter]);

  const filters = isFieldOwner()
    ? (['all', 'pending', 'in_progress', 'completed', 'approval'] as const)
    : (['all', 'pending', 'in_progress', 'completed'] as const);

  if (loading && filteredTasks.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ListHeaderComponent={
          <>
            {isFieldOwner() ? (
              <View style={styles.headerActions}>
                <Button
                  title={t('tasks:createTask')}
                  onPress={() => navigation.navigate('CreateTask', { fieldId })}
                  fullWidth
                />
              </View>
            ) : null}
            <View style={styles.filterContainer}>
              {filters.map(filterOption => (
                <Button
                  key={filterOption}
                  title={t(`tasks:filters.${filterOption}`)}
                  onPress={() => setFilter(filterOption)}
                  variant="outline"
                  size="small"
                  style={styles.filterButton}
                />
              ))}
            </View>
          </>
        }
        data={filteredTasks}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            fieldName={fields[item.fieldId]?.name}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={filteredTasks.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title={t('common:empty.noTasks')}
            description={isFieldOwner() ? t('tasks:emptyOwner') : t('tasks:emptyProducer')}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { padding: spacing.base, paddingBottom: 0 },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.base,
    gap: spacing.xs,
  },
  filterButton: { marginRight: 0 },
  listContent: { padding: spacing.base, paddingTop: 0, paddingBottom: spacing['2xl'] },
  emptyContainer: { flex: 1 },
});

export default TaskListScreen;
