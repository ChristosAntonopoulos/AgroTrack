import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Section from '../components/layout/Section';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/ui/Card';
import TaskCard from '../components/domain/TaskCard';
import EmptyState from '../components/EmptyState';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';
import { createElevation } from '../theme/elevation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const openDirections = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  Linking.openURL(url);
};

const TodayScreen = () => {
  const { user, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['today', 'common']);
  const navigation = useNavigation<Nav>();
  const { tasks, fields, loading, refresh } = useTasks();
  const { refreshing, onRefresh } = useRefresh(refresh);

  const myOpenTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => task.status !== 'completed');
  }, [tasks, user]);

  const recommended = useMemo(() => {
    const today = startOfDay(new Date());
    const list = [...myOpenTasks];
    list.sort((a, b) => {
      const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const aOver = a.scheduledEnd ? new Date(a.scheduledEnd) < today : false;
      const bOver = b.scheduledEnd ? new Date(b.scheduledEnd) < today : false;
      if (aOver !== bOver) return aOver ? -1 : 1;
      return ad - bd;
    });
    return list.slice(0, 3);
  }, [myOpenTasks]);

  const routeFields = useMemo(() => {
    const fieldIds = [...new Set(myOpenTasks.map(tk => tk.fieldId))];
    return fieldIds.map(id => fields[id]).filter(Boolean).slice(0, 5);
  }, [myOpenTasks, fields]);

  const nextTask = recommended[0];

  if (isFieldOwner()) {
    return (
      <ScreenLayout scroll contentContainerStyle={styles.content}>
        <ScreenHeader title={t('producerOnlyTitle')} subtitle={t('producerOnlyDescription')} />
        <EmptyState
          icon={<Ionicons name="sunny-outline" size={32} color={colors.primaryDark} />}
          title={t('producerOnlyTitle')}
          description={t('producerOnlyDescription')}
        />
      </ScreenLayout>
    );
  }

  if (loading && tasks.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title={t('title')} subtitle={t('subtitle')} />

      {nextTask ? (
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.primaryDark,
              ...createElevation(colors, 'md'),
            },
          ]}
          onPress={() => navigation.navigate('TaskDetail', { taskId: nextTask.id })}
          activeOpacity={0.85}
        >
          <Text style={[styles.heroLabel, { color: colors.textInverse + 'CC' }]}>
            {t('startNextHint')}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.textInverse }]} numberOfLines={2}>
            {nextTask.title}
          </Text>
          {fields[nextTask.fieldId]?.name ? (
            <View style={styles.heroMeta}>
              <Ionicons name="leaf-outline" size={14} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontWeight: '600' }}>
                {fields[nextTask.fieldId].name}
              </Text>
            </View>
          ) : null}
          <View style={[styles.heroCta, { backgroundColor: colors.textInverse + '25' }]}>
            <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{t('startNext')}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      ) : null}

      <Section title={t('recommendedTasks')} subtitle={t('recommendedSubtitle')}>
        {recommended.length === 0 ? (
          <Card variant="muted">
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noTasksTitle')}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('noTasksDescription')}</Text>
          </Card>
        ) : (
          {recommended.filter(tk => tk.id !== nextTask?.id).map(task => (
            <TaskCard
              key={task.id}
              task={task}
              fieldName={fields[task.fieldId]?.name}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            />
          ))
        )}
      </Section>

      <Section title={t('routeTitle')} subtitle={t('routeSubtitle')}>
        {routeFields.length === 0 ? (
          <Card variant="muted">
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noRouteTitle')}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('noRouteDescription')}</Text>
          </Card>
        ) : (
          routeFields.map((field, index) => (
            <Card key={field.id} variant="elevated" style={styles.routeCard}>
              <View style={styles.routeRow}>
                <View style={[styles.stopBadge, { backgroundColor: colors.primaryDark }]}>
                  <Text style={[styles.stopNum, { color: colors.textInverse }]}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldName, { color: colors.textPrimary }]}>{field.name}</Text>
                  {field.latitude != null && field.longitude != null ? (
                    <TouchableOpacity onPress={() => openDirections(field.latitude!, field.longitude!)}>
                      <Text style={{ color: colors.primaryDark, fontWeight: '600', marginTop: 4, fontSize: 13 }}>
                        Maps →
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('FieldDetail', { fieldId: field.id })}>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </Section>

      {myOpenTasks.length > 0 ? (
        <Section title={`${t('openTask')} (${myOpenTasks.length})`}>
          {myOpenTasks.slice(0, 10).map(task => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskRow,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  ...createElevation(colors, 'sm'),
                },
              ]}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            >
              <Ionicons name="ellipse-outline" size={14} color={colors.primaryDark} />
              <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }}>{task.title}</Text>
              {task.scheduledEnd ? (
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  {formatLocaleDate(new Date(task.scheduledEnd), i18n.language)}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </Section>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  heroCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.base,
  },
  heroLabel: { ...typography.styles.caption, fontSize: 11, marginBottom: spacing.xs },
  heroTitle: { ...typography.styles.h3, fontWeight: '700', marginBottom: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  emptyTitle: { fontWeight: '700', marginBottom: 4 },
  routeCard: { marginBottom: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stopBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNum: { fontWeight: '700', fontSize: 12 },
  fieldName: { fontWeight: '600' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
});

export default TodayScreen;
