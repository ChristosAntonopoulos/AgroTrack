import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FieldCard from '../components/domain/FieldCard';
import FieldsMap from '../components/domain/FieldsMap';
import EmptyState from '../components/EmptyState';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import SegmentedControl from '../components/ui/SegmentedControl';
import FilterChips from '../components/ui/FilterChips';
import { spacing, typography, radii } from '../theme';
import { getDockMetrics } from '../navigation/dockMetrics';
import { RootStackParamList } from '../navigation/types';
import { Field } from '../services/fieldService';
import { fieldHasBoundary, fieldSearchHaystack, isFieldSetupIncomplete } from '../utils/fieldDisplay';
import { getFieldShortLocation } from '../utils/shortLocation';
import { resolveFieldCenter } from '../utils/fieldGeo';
import { locationService } from '../services/locationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GuideTarget from '../components/onboarding/GuideTarget';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'list' | 'map';
type SortKey = 'name' | 'area' | 'activity' | 'distance';

const FieldsListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { isFieldOwner, user } = useAuth();
  const { colors, tapMin } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const insets = useSafeAreaInsets();
  const { contentBottomInset } = getDockMetrics(tapMin, insets.bottom);
  const listBottomPad = contentBottomInset;
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { fields, loading, fieldTodayTaskCounts, refresh } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const tasksReady = !loading || fields.length > 0;
  const canCreate = isFieldOwner();

  useEffect(() => {
    let cancelled = false;
    locationService
      .getCurrentLocation()
      .then((loc) => {
        if (!cancelled) setUserCoords({ lat: loc.latitude, lng: loc.longitude });
      })
      .catch(() => {
        if (!cancelled) setUserCoords(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSortByDistance = Boolean(userCoords && fields.some((field) => resolveFieldCenter(field)));

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fields;
    if (q) {
      list = list.filter((f) => {
        const short = getFieldShortLocation(f).toLowerCase();
        return fieldSearchHaystack(f).includes(q) || short.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'area') {
        const areaA = a.appMeasuredAreaSqm || a.area || 0;
        const areaB = b.appMeasuredAreaSqm || b.area || 0;
        return areaB - areaA;
      }
      if (sortBy === 'activity') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'distance' && userCoords) {
        const centerA = resolveFieldCenter(a);
        const centerB = resolveFieldCenter(b);
        const distA = centerA
          ? locationService.calculateDistance(userCoords.lat, userCoords.lng, centerA.latitude, centerA.longitude)
          : Number.POSITIVE_INFINITY;
        const distB = centerB
          ? locationService.calculateDistance(userCoords.lat, userCoords.lng, centerB.latitude, centerB.longitude)
          : Number.POSITIVE_INFINITY;
        return distA - distB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [fields, search, sortBy, userCoords]);

  useEffect(() => {
    if (selectedFieldId && !filteredFields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(null);
    }
  }, [filteredFields, selectedFieldId]);

  const subtitle =
    user?.role === 'Producer'
      ? t('fields:subtitleProducer')
      : user?.role === 'FieldOwner'
        ? t('fields:subtitleOwner')
        : t('fields:subtitleDefault');

  const tasksTodayTotal = useMemo(() => {
    if (!tasksReady) return 0;
    return fields.reduce((sum, field) => sum + (fieldTodayTaskCounts[field.id] ?? 0), 0);
  }, [fields, fieldTodayTaskCounts, tasksReady]);

  const almostReady = useMemo(
    () =>
      fields.find(
        (field) =>
          field.status !== 'Archived' && Boolean(field.name?.trim()) && !fieldHasBoundary(field)
      ) ?? null,
    [fields]
  );

  const openField = (field: Field) => {
    if (isFieldSetupIncomplete(field.status) && !field.name?.trim()) {
      navigation.navigate('FieldForm', { fieldId: field.id });
      return;
    }
    navigation.navigate('FieldDetail', { fieldId: field.id });
  };

  const getStats = (fieldId: string) => ({
    todayTaskCount: fieldTodayTaskCounts[fieldId] ?? 0,
    tasksReady,
  });

  if (loading && fields.length === 0) {
    return (
      <ScreenLayout dockInset={false}>
        <LoadingSpinner fullScreen />
      </ScreenLayout>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
  );

  const sortKeys: SortKey[] = canSortByDistance
    ? ['name', 'area', 'activity', 'distance']
    : ['name', 'area', 'activity'];

  const listHeader = (
    <View style={styles.header}>
      <ScreenHeader
        title={t('fields:title')}
        subtitle={subtitle}
        action={
          canCreate ? (
            <GuideTarget id="createField">
              <HeaderIconButton
                icon="add"
                accessibilityLabel={t('fields:addFieldCta')}
                onPress={() => navigation.navigate('FieldForm', {})}
                active
              />
            </GuideTarget>
          ) : undefined
        }
        context={
          almostReady || fields.length > 0 ? (
          <>
            {almostReady ? (
              <View
                style={[
                  styles.nudge,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.nudgeTitle, { color: colors.textPrimary }]}>
                  {t('fields:almostReady.title')}
                </Text>
                <Text style={[styles.nudgeBody, { color: colors.textSecondary }]}>
                  {t('fields:almostReady.body', { name: almostReady.name })}
                </Text>
                <Button
                  title={t('fields:almostReady.continuePlace')}
                  onPress={() =>
                    navigation.navigate('FieldMapBoundary', { fieldId: almostReady.id })
                  }
                  fullWidth
                />
                <Button
                  title={t('fields:almostReady.viewGrove')}
                  variant="outline"
                  onPress={() => navigation.navigate('FieldDetail', { fieldId: almostReady.id })}
                  fullWidth
                />
              </View>
            ) : null}
            {fields.length > 0 ? (
            <>
              <View style={styles.summaryRow}>
                <View
                  style={[
                    styles.summaryPill,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  ]}
                >
                  <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                    <Text style={[styles.summaryStrong, { color: colors.textPrimary }]}>{fields.length}</Text>
                    {'  '}
                    {t('fields:summary.fields')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryPill,
                    {
                      backgroundColor: tasksTodayTotal > 0 ? colors.primaryLight : colors.surface,
                      borderColor: tasksTodayTotal > 0 ? colors.oliveBorder : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryText,
                      { color: tasksTodayTotal > 0 ? colors.link : colors.textSecondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryStrong,
                        { color: tasksTodayTotal > 0 ? colors.link : colors.textPrimary },
                      ]}
                    >
                      {tasksReady ? tasksTodayTotal : '…'}
                    </Text>
                    {'  '}
                    {t('fields:summary.activeTasks')}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.searchWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    minHeight: tapMin,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.textTertiary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('fields:searchPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.search, { color: colors.textPrimary }]}
                  accessibilityLabel={t('fields:searchPlaceholder')}
                />
              </View>
              <View style={styles.chipsBleed}>
                <FilterChips
                  options={sortKeys.map((key) => ({
                    value: key,
                    label: t(`fields:sort${key.charAt(0).toUpperCase()}${key.slice(1)}`),
                  }))}
                  selected={sortBy}
                  onSelect={setSortBy}
                />
              </View>
              <SegmentedControl
                fullWidth
                ariaLabel={t('fields:viewModeAria')}
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'list', label: t('fields:viewList') },
                  { value: 'map', label: t('fields:viewMap') },
                ]}
              />
            </>
          ) : null}
          </>
          ) : undefined
        }
      />
    </View>
  );

  if (viewMode === 'map' && fields.length > 0) {
    return (
      <ScreenLayout dockInset={false}>
        <View style={styles.flex}>
          {listHeader}
          {filteredFields.length === 0 ? (
            <EmptyState title={t('fields:emptySearchTitle')} description={t('fields:emptySearchDescription')} />
          ) : (
            <>
              <View style={styles.mapPane}>
                <FieldsMap
                  fields={filteredFields}
                  fillScreen
                  compact={false}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={setSelectedFieldId}
                  onFieldPress={(id) => {
                    const field = filteredFields.find((item) => item.id === id);
                    if (field) openField(field);
                  }}
                />
              </View>
              <FlatList
                data={filteredFields}
                keyExtractor={(item) => item.id}
                style={styles.splitList}
                contentContainerStyle={{ paddingBottom: listBottomPad, paddingHorizontal: spacing.base }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <FieldCard
                    field={item}
                    stats={getStats(item.id)}
                    compact
                    selected={selectedFieldId === item.id}
                    onSelect={() => setSelectedFieldId(item.id)}
                    onPress={() => openField(item)}
                  />
                )}
              />
            </>
          )}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout dockInset={false}>
      <FlatList
        style={styles.flex}
        data={filteredFields}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <FieldCard field={item} stats={getStats(item.id)} onPress={() => openField(item)} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          fields.length === 0
            ? styles.emptyContainer
            : [styles.listContent, { paddingBottom: listBottomPad }]
        }
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          search.trim() ? (
            <EmptyState title={t('fields:emptySearchTitle')} description={t('fields:emptySearchDescription')} />
          ) : almostReady ? null : (
            <EmptyState
              icon={<Ionicons name="leaf-outline" size={36} color={colors.primary} />}
              title={t('fields:emptyTitle')}
              description={canCreate ? t('fields:emptyDescription') : t('fields:emptyWorker')}
              action={
                canCreate
                  ? { label: t('fields:addFieldCta'), onPress: () => navigation.navigate('FieldForm', {}) }
                  : undefined
              }
            />
          )
        }
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryPill: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  summaryText: {
    ...typography.styles.bodySmall,
  },
  summaryStrong: {
    fontWeight: '700',
  },
  nudge: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  nudgeTitle: {
    ...typography.styles.h4,
    fontWeight: '700',
  },
  nudgeBody: {
    ...typography.styles.bodySmall,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  search: {
    flex: 1,
    ...typography.styles.body,
    paddingVertical: spacing.sm,
  },
  chipsBleed: {
    marginHorizontal: -spacing.base,
  },
  mapPane: {
    flex: 1,
    minHeight: 240,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  splitList: {
    maxHeight: 280,
  },
  cardWrap: { paddingHorizontal: spacing.base },
  listContent: { paddingBottom: spacing['3xl'] },
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl },
});

export default FieldsListScreen;
