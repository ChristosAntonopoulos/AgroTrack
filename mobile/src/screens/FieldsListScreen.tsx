import React, { useMemo } from 'react';
import { FlatList, StyleSheet, RefreshControl, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import OverviewMetricsStrip from '../components/layout/OverviewMetricsStrip';
import DashboardFieldCard from '../components/domain/DashboardFieldCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { RootStackParamList } from '../navigation/types';
import { countFieldLocations } from '../utils/dashboardUtils';
import { OverviewMetricCardProps } from '../components/ui/OverviewMetricCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FieldsListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common', 'nav']);
  const {
    fields,
    loading,
    fieldOpenTaskCounts,
    fieldHasOverdue,
    refresh,
  } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);

  const totalArea = useMemo(
    () => fields.reduce((sum, f) => sum + (f.area || 0), 0),
    [fields]
  );
  const totalOpenTasks = useMemo(
    () => Object.values(fieldOpenTaskCounts).reduce((sum, n) => sum + n, 0),
    [fieldOpenTaskCounts]
  );
  const irrigatedCount = useMemo(
    () => fields.filter(f => f.irrigationStatus).length,
    [fields]
  );
  const highYearCount = useMemo(
    () => fields.filter(f => f.currentLifecycleYear === 'high').length,
    [fields]
  );
  const locationCount = useMemo(() => countFieldLocations(fields), [fields]);
  const overdueFields = useMemo(
    () => Object.values(fieldHasOverdue).filter(Boolean).length,
    [fieldHasOverdue]
  );

  const overviewMetrics = useMemo((): OverviewMetricCardProps[] => {
    if (fields.length === 0) return [];
    return [
      {
        icon: 'leaf',
        value: fields.length,
        label: t('fields:summaryFields'),
        subtitle: t('fields:acrossLocations', { count: locationCount }),
        accentColor: colors.success,
        onPress: undefined,
      },
      {
        icon: 'resize-outline',
        value: `${totalArea.toFixed(1)} ha`,
        label: t('fields:summaryArea'),
        subtitle: t('fields:hectaresTotal'),
        accentColor: colors.primary,
      },
      {
        icon: 'clipboard-outline',
        value: totalOpenTasks,
        label: t('fields:openTasks'),
        subtitle:
          overdueFields > 0
            ? t('fields:fieldsWithOverdue', { count: overdueFields })
            : t('fields:allOnTrack'),
        subtitleColor: overdueFields > 0 ? colors.error : colors.textTertiary,
        accentColor: colors.warning,
        onPress: () => navigation.navigate('Main', { screen: 'Tasks' }),
      },
      {
        icon: 'water-outline',
        value: irrigatedCount,
        label: t('fields:irrigatedFields'),
        subtitle: t('fields:highYearCount', { count: highYearCount }),
        accentColor: colors.info,
      },
    ];
  }, [fields.length, locationCount, totalArea, totalOpenTasks, overdueFields, irrigatedCount, highYearCount, colors, t, navigation]);

  const goTab = (screen: 'Tasks' | 'Calendar', fieldId: string) => {
    if (screen === 'Tasks') {
      navigation.navigate('Main', { screen: 'Tasks', params: { fieldId } });
    } else {
      navigation.navigate('Main', {
        screen: 'Calendar',
        params: { fieldId, date: new Date().toISOString() },
      });
    }
  };

  if (loading && fields.length === 0) return <LoadingSpinner fullScreen />;

  const listTitle = isFieldOwner() ? t('fields:titleOwner') : t('fields:title');
  const listSubtitle = t('fields:subtitle', { count: fields.length, area: totalArea.toFixed(1) });

  return (
    <View style={styles.root}>
      {fields.length > 0 ? (
        <OverviewMetricsStrip
          greeting={listTitle}
          dateLabel={listSubtitle}
          metrics={overviewMetrics}
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={fields}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <DashboardFieldCard
              field={item}
              openTaskCount={fieldOpenTaskCounts[item.id] ?? 0}
              hasOverdue={fieldHasOverdue[item.id]}
              onPress={() => navigation.navigate('FieldDetail', { fieldId: item.id })}
              onViewTasks={() => goTab('Tasks', item.id)}
              onViewCalendar={() => goTab('Calendar', item.id)}
              onViewDetails={() => navigation.navigate('FieldDetail', { fieldId: item.id })}
            />
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={fields.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryDark} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="leaf-outline" size={36} color={colors.primaryDark} />}
            title={t('common:empty.noFields')}
            description={isFieldOwner() ? t('fields:emptyOwner') : t('fields:emptyWorker')}
            action={
              isFieldOwner()
                ? { label: t('fields:addField'), onPress: () => navigation.navigate('FieldForm', {}) }
                : undefined
            }
          />
        }
      />

      {isFieldOwner() ? (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primaryDark, ...createElevation(colors, 'lg') },
          ]}
          onPress={() => navigation.navigate('FieldForm', {})}
          accessibilityLabel={t('fields:addField')}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  cardWrap: { paddingHorizontal: spacing.base },
  listContent: { paddingTop: spacing.sm, paddingBottom: spacing['3xl'] },
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FieldsListScreen;
