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
import { usePreferences } from '../context/PreferencesContext';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Section from '../components/layout/Section';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/ui/Card';
import AlertBanner from '../components/ui/AlertBanner';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';
import { createElevation } from '../theme/elevation';
import { isTaskOverdue } from '../utils/taskListUtils';

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
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isEveryday, isFullPicture, tapMin, fontScaleMultiplier } = usePreferences();
  const { t, i18n } = useTranslation(['today', 'common', 'fields']);
  const navigation = useNavigation<Nav>();
  const { tasks, fields, loading, refresh } = useTasks();
  const { refreshing, onRefresh } = useRefresh(refresh);

  const myOpenTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter((task) => task.status !== 'completed');
  }, [tasks, user]);

  const sortedOpen = useMemo(() => {
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
    return list;
  }, [myOpenTasks]);

  const nextTask = sortedOpen[0];
  const following = sortedOpen.slice(1, isEveryday ? 4 : 8);

  const routeFields = useMemo(() => {
    const fieldIds = [...new Set(sortedOpen.map((tk) => tk.fieldId))];
    return fieldIds.map((id) => fields[id]).filter(Boolean).slice(0, 3);
  }, [sortedOpen, fields]);

  const overdueCount = useMemo(
    () => sortedOpen.filter((tk) => isTaskOverdue(tk)).length,
    [sortedOpen]
  );

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

      {overdueCount > 0 ? (
        <View style={styles.bannerWrap}>
          <AlertBanner
            variant="error"
            icon="alert-circle"
            message={t('overdueSafety', { count: overdueCount })}
          />
        </View>
      ) : null}

      {nextTask ? (
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.primaryDark,
              minHeight: Math.max(tapMin * 2.5, 128),
              ...createElevation(colors, 'md'),
            },
          ]}
          onPress={() => navigation.navigate('TaskDetail', { taskId: nextTask.id })}
          accessibilityRole="button"
          accessibilityLabel={`${t('startNext')}: ${nextTask.title}`}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.heroLabel,
              { color: colors.textInverse + 'CC', fontSize: 13 * fontScaleMultiplier },
            ]}
          >
            {t('startNextHint')}
          </Text>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.textInverse, fontSize: 22 * fontScaleMultiplier },
            ]}
            numberOfLines={2}
          >
            {nextTask.title}
          </Text>
          {fields[nextTask.fieldId]?.name ? (
            <View style={styles.heroMeta}>
              <Ionicons name="leaf-outline" size={16} color={colors.textInverse} />
              <Text
                style={{
                  color: colors.textInverse,
                  fontWeight: '600',
                  fontSize: 15 * fontScaleMultiplier,
                }}
              >
                {fields[nextTask.fieldId].name}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.heroCta,
              { backgroundColor: colors.textInverse + '25', minHeight: tapMin },
            ]}
          >
            <Text
              style={{
                color: colors.textInverse,
                fontWeight: '800',
                fontSize: 17 * fontScaleMultiplier,
              }}
            >
              {t('startNext')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      ) : (
        <Card variant="muted" style={styles.emptyHero}>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier },
            ]}
          >
            {t('noTasksTitle')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }}>
            {t('noTasksDescription')}
          </Text>
        </Card>
      )}

      {routeFields.length > 0 ? (
        <Section title={t('fieldsNeedYou')}>
          {routeFields.map((field) => (
            <TouchableOpacity
              key={field.id}
              style={[
                styles.fieldChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  minHeight: tapMin,
                  ...createElevation(colors, 'sm'),
                },
              ]}
              onPress={() => navigation.navigate('FieldDetail', { fieldId: field.id })}
              accessibilityRole="button"
            >
              <Ionicons name="leaf" size={18} color={colors.primaryDark} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '700',
                  flex: 1,
                  fontSize: 16 * fontScaleMultiplier,
                }}
                numberOfLines={1}
              >
                {field.name}
              </Text>
              {field.latitude != null && field.longitude != null ? (
                <TouchableOpacity
                  onPress={() => openDirections(field.latitude!, field.longitude!)}
                  hitSlop={12}
                  accessibilityLabel="Maps"
                >
                  <Ionicons name="navigate-outline" size={20} color={colors.primaryDark} />
                </TouchableOpacity>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Section>
      ) : null}

      {following.length > 0 ? (
        <Section title={t('recommendedTasks')}>
          {following.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskRow,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  minHeight: tapMin,
                  ...createElevation(colors, 'sm'),
                },
              ]}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            >
              <Ionicons name="ellipse-outline" size={14} color={colors.primaryDark} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '600',
                  flex: 1,
                  fontSize: 15 * fontScaleMultiplier,
                }}
              >
                {task.title}
              </Text>
              {task.scheduledEnd ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }}>
                  {formatLocaleDate(new Date(task.scheduledEnd), i18n.language)}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </Section>
      ) : null}

      {isFullPicture ? (
        <TouchableOpacity
          style={[styles.agendaLink, { minHeight: tapMin }]}
          onPress={() => navigation.navigate('Main', { screen: 'Calendar' })}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
          <Text
            style={{
              color: colors.primaryDark,
              fontWeight: '700',
              fontSize: 15 * fontScaleMultiplier,
            }}
          >
            {t('viewCalendar')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  bannerWrap: { paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  heroCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.base,
    justifyContent: 'center',
  },
  emptyHero: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    padding: spacing.base,
  },
  heroLabel: { ...typography.styles.caption, marginBottom: spacing.xs },
  heroTitle: { ...typography.styles.h3, fontWeight: '800', marginBottom: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  emptyTitle: { fontWeight: '700', marginBottom: 4 },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  agendaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
  },
});

export default TodayScreen;
