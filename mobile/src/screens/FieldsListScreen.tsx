import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  TextInput,
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
import FieldCard from '../components/domain/FieldCard';
import FieldsMap from '../components/domain/FieldsMap';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import Sheet from '../components/ui/Sheet';
import { spacing, typography, radii, motion } from '../theme';
import { getDockMetrics } from '../navigation/dockMetrics';
import { RootStackParamList } from '../navigation/types';
import { Field } from '../services/fieldService';
import {
  fieldHasBoundary,
  fieldSearchHaystack,
  getFieldSetupResumeStep,
  isFieldSetupIncomplete,
} from '../utils/fieldDisplay';
import { getFieldShortLocation } from '../utils/shortLocation';
import { resolveFieldCenter } from '../utils/fieldGeo';
import { locationService } from '../services/locationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GuideTarget from '../components/onboarding/GuideTarget';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'list' | 'map';
type SortKey = 'name' | 'area' | 'activity' | 'distance';

const MAP_PANE_HEIGHT = 280;
const SEARCH_HEIGHT = 52;

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
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const listRef = useRef<FlatList<Field>>(null);
  const { fields, loading, fieldTodayTaskCounts, refresh } = useFields('fields');
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

  useEffect(() => {
    if (!selectedFieldId || viewMode !== 'map') return;
    const index = filteredFields.findIndex((field) => field.id === selectedFieldId);
    if (index < 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedFieldId, viewMode, filteredFields]);

  const draftToResume = useMemo(
    () =>
      fields.find(
        (field) =>
          field.status !== 'Archived' &&
          (isFieldSetupIncomplete(field.status) || !fieldHasBoundary(field))
      ) ?? null,
    [fields]
  );

  const draftBannerCopy = useMemo(() => {
    if (!draftToResume) return null;
    const step = getFieldSetupResumeStep(draftToResume);
    if (step === 'boundary') {
      return {
        label: t('fields:almostReady.banner', { name: draftToResume.name }),
        icon: 'map-outline' as const,
      };
    }
    if (step === 'review') {
      return {
        label: t('fields:almostReady.bannerDetails', { name: draftToResume.name }),
        icon: 'create-outline' as const,
      };
    }
    return {
      label: t('fields:almostReady.bannerBasics', { name: draftToResume.name }),
      icon: 'leaf-outline' as const,
    };
  }, [draftToResume, t]);

  const openField = (field: Field) => {
    if (isFieldSetupIncomplete(field.status) || !fieldHasBoundary(field)) {
      const step = getFieldSetupResumeStep(field);
      if (step === 'boundary') {
        navigation.navigate('FieldMapBoundary', { fieldId: field.id });
        return;
      }
      if (step === 'review') {
        navigation.navigate('FieldForm', { fieldId: field.id, focus: 'details' });
        return;
      }
      navigation.navigate('FieldForm', { fieldId: field.id });
      return;
    }
    navigation.navigate('FieldDetail', { fieldId: field.id });
  };

  const goCreateField = () => navigation.navigate('FieldForm', {});

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

  const addShort = t('fields:addFieldShort');
  const sortCurrentLabel = t(`fields:sort${sortBy.charAt(0).toUpperCase()}${sortBy.slice(1)}`);
  const listIconColor = viewMode === 'list' ? colors.primary : colors.textTertiary;
  const mapIconColor = viewMode === 'map' ? colors.primary : colors.textTertiary;

  const listHeader = (
    <View style={styles.header}>
      <ScreenHeader
        title={t('fields:title')}
        dense
        action={
          canCreate ? (
            <GuideTarget id="createField">
              <Pressable
                onPress={goCreateField}
                accessibilityRole="button"
                accessibilityLabel={t('fields:addFieldLabel')}
                style={({ pressed }) => [
                  styles.addBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? motion.pressOpacity : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={18} color={colors.onOlive} />
                <Text style={[styles.addBtnText, { color: colors.onOlive }]}>{addShort}</Text>
              </Pressable>
            </GuideTarget>
          ) : undefined
        }
        context={
          fields.length > 0 || draftToResume ? (
            <>
              {fields.length > 0 ? (
                <SegmentedControl
                  fullWidth
                  compact
                  ariaLabel={t('fields:viewModeAria')}
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    {
                      value: 'list',
                      label: t('fields:viewList'),
                      icon: <Ionicons name="list-outline" size={15} color={listIconColor} />,
                    },
                    {
                      value: 'map',
                      label: t('fields:viewMap'),
                      icon: <Ionicons name="map-outline" size={15} color={mapIconColor} />,
                    },
                  ]}
                />
              ) : null}
              {draftToResume && draftBannerCopy ? (
                <Pressable
                  onPress={() => openField(draftToResume)}
                  accessibilityRole="button"
                  accessibilityLabel={draftBannerCopy.label}
                  style={({ pressed }) => [
                    styles.draftBanner,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.oliveBorder,
                      opacity: pressed ? motion.pressOpacity : 1,
                    },
                  ]}
                >
                  <Ionicons name={draftBannerCopy.icon} size={16} color={colors.primary} />
                  <Text
                    style={[styles.draftBannerText, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {draftBannerCopy.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </Pressable>
              ) : null}
              {fields.length > 0 ? (
                <View style={styles.toolsRow}>
                  <View
                    style={[
                      styles.searchWrap,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        height: SEARCH_HEIGHT,
                      },
                    ]}
                  >
                    <Ionicons name="search" size={16} color={colors.textTertiary} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder={t('fields:searchPlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.search, { color: colors.textPrimary }]}
                      accessibilityLabel={t('fields:searchPlaceholder')}
                    />
                  </View>
                  {viewMode === 'list' ? (
                    <Pressable
                      onPress={() => setSortOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('fields:sortLabel')}: ${sortCurrentLabel}`}
                      style={({ pressed }) => [
                        styles.sortBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          height: SEARCH_HEIGHT,
                          opacity: pressed ? motion.pressOpacity : 1,
                        },
                      ]}
                    >
                      <Ionicons name="swap-vertical-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.sortBtnText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {sortCurrentLabel}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : undefined
        }
      />
      {viewMode === 'map' && filteredFields.length > 0 ? (
        <View style={[styles.mapPane, { height: MAP_PANE_HEIGHT }]}>
          <FieldsMap
            fields={filteredFields}
            height={MAP_PANE_HEIGHT}
            embedded
            compact={false}
            selectedFieldId={selectedFieldId}
            onFieldSelect={setSelectedFieldId}
            onFieldPress={(id) => {
              const field = filteredFields.find((item) => item.id === id);
              if (field) openField(field);
            }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenLayout dockInset={false}>
      <FlatList
        ref={listRef}
        style={styles.flex}
        data={filteredFields}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <FieldCard
              field={item}
              stats={getStats(item.id)}
              currentUserId={user?.id}
              compact={viewMode === 'map'}
              selected={viewMode === 'map' ? selectedFieldId === item.id : undefined}
              onSelect={viewMode === 'map' ? () => setSelectedFieldId(item.id) : undefined}
              onPress={() => openField(item)}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({
            offset: Math.max(0, index * 88),
            animated: true,
          });
        }}
        contentContainerStyle={
          fields.length === 0
            ? styles.emptyContainer
            : [styles.listContent, { paddingBottom: listBottomPad }]
        }
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          search.trim() ? (
            <EmptyState title={t('fields:emptySearchTitle')} description={t('fields:emptySearchDescription')} />
          ) : draftToResume ? null : (
            <EmptyState
              icon={<Ionicons name="leaf-outline" size={36} color={colors.primary} />}
              title={t('fields:emptyTitle')}
              description={canCreate ? t('fields:emptyDescription') : t('fields:emptyWorker')}
              action={
                canCreate
                  ? { label: t('fields:addFieldLabel'), onPress: goCreateField }
                  : undefined
              }
            />
          )
        }
      />
      <Sheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        edge="bottom"
        size="sm"
        title={t('fields:sortLabel')}
      >
        <View style={styles.sortSheet}>
          {sortKeys.map((key) => {
            const selected = sortBy === key;
            const label = t(`fields:sort${key.charAt(0).toUpperCase()}${key.slice(1)}`);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setSortBy(key);
                  setSortOpen(false);
                }}
                style={({ pressed }) => [
                  styles.sortOption,
                  {
                    backgroundColor: selected ? colors.primaryLight : 'transparent',
                    borderColor: selected ? colors.oliveBorder : colors.borderLight,
                    opacity: pressed ? motion.pressOpacity : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: selected ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {label}
                </Text>
                {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: 0,
  },
  addBtn: {
    minHeight: 40,
    maxHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addBtnText: {
    ...typography.styles.bodySmall,
    fontWeight: '700',
    fontSize: 14,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  draftBannerText: {
    ...typography.styles.caption,
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  search: {
    flex: 1,
    ...typography.styles.bodySmall,
    paddingVertical: 0,
    fontSize: 14,
  },
  sortBtn: {
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  sortBtnText: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 12,
    flexShrink: 1,
  },
  sortSheet: {
    gap: 8,
    paddingBottom: spacing.sm,
  },
  sortOption: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortOptionText: {
    ...typography.styles.body,
    fontWeight: '600',
  },
  mapPane: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cardWrap: { paddingHorizontal: spacing.base },
  listContent: { paddingBottom: spacing['3xl'] },
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl },
});

export default FieldsListScreen;
