import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import TaskCard from '../components/domain/TaskCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import TodaysSchedule from '../components/domain/TodaysSchedule';
import MinistryNotificationList from '../components/domain/MinistryNotificationList';
import { colors, spacing } from '../theme';
import { toBoolean } from '../utils/booleanConverter';

interface TaskListScreenProps {
  navigation: any;
  route?: { params?: { fieldId?: string } };
}

const TaskListScreen: React.FC<TaskListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const fieldId = route?.params?.fieldId;
  const { filteredTasks, fields, loading, setFilter, refresh, tasks } = useTasks({ fieldId });
  const { stats } = useDashboardStats();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const isRefreshing: boolean = toBoolean(refreshing);

  const handleTaskPress = (taskId: string) => {
    if (navigation?.navigate) {
      navigation.navigate('TaskDetail', { taskId });
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  if (loading && filteredTasks.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {tasks && tasks.length > 0 ? (
              <View style={styles.scheduleContainer}>
                <TodaysSchedule
                  tasks={tasks}
                  onTaskPress={handleTaskPress}
                  weatherWorkable={stats?.workableDaysThisWeek ? stats.workableDaysThisWeek > 0 : true}
                />
              </View>
            ) : null}
            {user?.role ? (
              <View style={styles.notificationsContainer}>
                <MinistryNotificationList userRole={user.role} maxItems={2} />
              </View>
            ) : null}
            <View style={styles.filterContainer}>
              {(['all', 'pending', 'in_progress', 'completed'] as const).map((filterOption) => (
                <Button
                  key={filterOption}
                  title={
                    filterOption === 'all'
                      ? 'All'
                      : filterOption === 'in_progress'
                      ? 'In Progress'
                      : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)
                  }
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
            onPress={() => handleTaskPress(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredTasks.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.emptyIcon}>📋</Text>}
            title="No tasks found"
            description={
              'There are no tasks available for your role'
            }
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scheduleContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  notificationsContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  filterButton: {
    flex: 1,
  },
  listContent: {
    padding: spacing.base,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 64,
  },
});

export default TaskListScreen;
