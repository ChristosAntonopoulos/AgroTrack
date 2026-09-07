import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import FieldsSummaryHeader from '../components/fields/FieldsSummaryHeader';
import DashboardFieldCard from '../components/domain/DashboardFieldCard';
import FieldsMap from '../components/domain/FieldsMap';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import { spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { countFieldLocations } from '../utils/dashboardUtils';
import { formatTotalFieldsArea } from '../utils/fieldAreaTotals';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'list' | 'map';

const FieldsListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { isEveryday } = usePreferences();
  const { t } = useTranslation(['fields', 'common', 'nav']);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const {
    fields,
    loading,
    fieldOpenTaskCounts,
    fieldHasOverdue,
    fieldNextJobTitle,
    refresh,
  } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);

  const totalAreaLabel = useMemo(() => formatTotalFieldsArea(fields), [fields]);
  const totalOpenTasks = useMemo(
    () => Object.values(fieldOpenTaskCounts).reduce((sum, n) => sum + n, 0),
    [fieldOpenTaskCounts]
  );
  const irrigatedCount = useMemo(
    () => fields.filter((f) => f.irrigationStatus).length,
    [fields]
  );
  const locationCount = useMemo(() => countFieldLocations(fields), [fields]);
  const overdueFields = useMemo(
    () => Object.values(fieldHasOverdue).filter(Boolean).length,
    [fieldHasOverdue]
  );

  const summaryChips = useMemo(() => {
    if (fields.length === 0) return [];
    return [
      {
        icon: 'leaf' as const,
        value: fields.length,
        label: t('fields:summaryFields'),
        accentColor: colors.success,
      },
      {
        icon: 'resize-outline' as const,
        value: totalAreaLabel,
        label: t('fields:summaryArea'),
        accentColor: colors.primary,
      },
      {
        icon: 'clipboard-outline' as const,
        value: totalOpenTasks,
        label: t('fields:openTasks'),
        accentColor: colors.warning,
        badge: overdueFields > 0 ? overdueFields : undefined,
        onPress: () => navigation.navigate('Main', { screen: 'Tasks' }),
      },
      {
        icon: 'water-outline' as const,
        value: irrigatedCount,
        label: t('fields:irrigatedFields'),
        accentColor: colors.info,
      },
    ];
  }, [
    fields.length,
    totalAreaLabel,
    totalOpenTasks,
    overdueFields,
    irrigatedCount,
    colors,
    t,
    navigation,
  ]);

  if (loading && fields.length === 0) {
    return (
      <ScreenLayout style={styles.screen}>
        <LoadingSpinner fullScreen />
      </ScreenLayout>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryDark} />
  );

  const listTitle = isFieldOwner() ? t('fields:titleOwner') : t('fields:title');
  const listSubtitle = t('fields:summarySubtitle', {
    count: fields.length,
    locations: locationCount,
    area: totalAreaLabel,
  });

  const viewToggle = fields.length > 0 ? (
    <View style={[styles.viewToggle, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Pressable
        style={[
          styles.viewBtn,
          { minHeight: 48 },
          viewMode === 'list' && { backgroundColor: colors.primaryDark },
        ]}
        onPress={() => setViewMode('list')}
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'list' }}
      >
        <Ionicons
          name="list"
          size={16}
          color={viewMode === 'list' ? colors.textInverse : colors.textSecondary}
        />
        <Text
          style={[
            styles.viewBtnText,
            { color: viewMode === 'list' ? colors.textInverse : colors.textSecondary },
          ]}
        >
          {t('fields:viewList')}
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.viewBtn,
          { minHeight: 48 },
          viewMode === 'map' && { backgroundColor: colors.primaryDark },
        ]}
        onPress={() => setViewMode('map')}
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'map' }}
      >
        <Ionicons
          name="map"
          size={16}
          color={viewMode === 'map' ? colors.textInverse : colors.textSecondary}
        />
        <Text
          style={[
            styles.viewBtnText,
            { color: viewMode === 'map' ? colors.textInverse : colors.textSecondary },
          ]}
        >
          {t('fields:viewMap')}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const listHeader = fields.length > 0 ? (
    <>
      <FieldsSummaryHeader
        title={listTitle}
        subtitle={listSubtitle}
        chips={summaryChips}
        onAddPress={isFieldOwner() ? () => navigation.navigate('FieldForm', {}) : undefined}
        addLabel={t('fields:addFieldLabel')}
      />
      {viewToggle ? <View style={styles.toggleWrap}>{viewToggle}</View> : null}
    </>
  ) : null;

  return (
    <ScreenLayout style={styles.screen}>
      {viewMode === 'map' && fields.length > 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.mapScrollContent}
          refreshControl={refreshControl}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          <View style={styles.mapFlex}>
            <FieldsMap
              fields={fields}
              fillScreen
              compact={isEveryday}
              onFieldPress={(id) => navigation.navigate('FieldDetail', { fieldId: id })}
            />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          style={styles.flex}
          data={fields}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <DashboardFieldCard
                field={item}
                openTaskCount={fieldOpenTaskCounts[item.id] ?? 0}
                hasOverdue={fieldHasOverdue[item.id]}
                nextJobTitle={fieldNextJobTitle[item.id]}
                onPress={() => navigation.navigate('FieldDetail', { fieldId: item.id })}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={fields.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="leaf-outline" size={36} color={colors.primaryDark} />}
              title={t('common:empty.noFields')}
              description={isFieldOwner() ? t('fields:emptyOwner') : t('fields:emptyWorker')}
              action={
                isFieldOwner()
                  ? { label: t('fields:addFieldLabel'), onPress: () => navigation.navigate('FieldForm', {}) }
                  : undefined
              }
            />
          }
        />
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  mapScrollContent: { flexGrow: 1 },
  mapFlex: {
    flex: 1,
    minHeight: 320,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  toggleWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
  },
  viewBtnText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  cardWrap: { paddingHorizontal: spacing.base },
  listContent: { paddingBottom: spacing['3xl'] },
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl },
});

export default FieldsListScreen;
