import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  Pressable,
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
import { usePreferences } from '../context/PreferencesContext';
import FieldCard from '../components/domain/FieldCard';
import FieldsMap from '../components/domain/FieldsMap';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import PageHeader from '../components/layout/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import { spacing, typography, radii } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { fieldSearchHaystack } from '../utils/fieldDisplay';
import { getFieldShortLocation } from '../utils/shortLocation';
import { resolveFieldCenter } from '../utils/fieldGeo';
import { locationService } from '../services/locationService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'list' | 'map';
type SortKey = 'name' | 'area' | 'activity' | 'distance';

const FieldsListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { isFieldOwner, user } = useAuth();
  const { colors, tapMin } = useTheme();
  const { isEveryday } = usePreferences();
  const { t } = useTranslation(['fields', 'common']);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { fields, loading, fieldTodayTaskCounts, refresh } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);

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

  const subtitle =
    user?.role === 'Producer'
      ? t('fields:subtitleProducer')
      : user?.role === 'FieldOwner'
        ? t('fields:subtitleOwner')
        : t('fields:subtitleDefault');

  if (loading && fields.length === 0) {
    return (
      <ScreenLayout>
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

  const addAction = isFieldOwner() ? (
    <Pressable
      onPress={() => navigation.navigate('FieldForm', {})}
      style={[styles.addBtn, { backgroundColor: colors.primary, minHeight: tapMin }]}
      accessibilityRole="button"
    >
      <Ionicons name="add" size={18} color={colors.onOlive} />
      <Text style={{ color: colors.onOlive, fontWeight: '700' }}>{t('fields:addFieldLabel')}</Text>
    </Pressable>
  ) : null;

  const listHeader =
    fields.length > 0 ? (
      <View style={styles.header}>
        <PageHeader title={t('fields:title')} subtitle={subtitle} action={addAction} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('fields:searchPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.search,
            {
              borderColor: colors.border,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              minHeight: tapMin,
            },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {sortKeys.map((key) => {
            const active = sortBy === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSortBy(key)}
                style={[
                  styles.sortChip,
                  {
                    minHeight: tapMin,
                    borderColor: active ? colors.oliveBorder : colors.border,
                    backgroundColor: active ? colors.primaryLight : colors.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {t(`fields:sort${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <SegmentedControl
          fullWidth
          ariaLabel={t('fields:viewModeAria', { defaultValue: 'View mode' })}
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'list', label: t('fields:viewList') },
            { value: 'map', label: t('fields:viewMap') },
          ]}
        />
      </View>
    ) : null;

  return (
    <ScreenLayout>
      {viewMode === 'map' && fields.length > 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.mapScrollContent}
          refreshControl={refreshControl}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          {filteredFields.length === 0 ? (
            <EmptyState title={t('fields:emptySearchTitle')} description={t('fields:emptySearchDescription')} />
          ) : (
            <View style={styles.mapFlex}>
              <FieldsMap
                fields={filteredFields}
                fillScreen
                compact={isEveryday}
                onFieldPress={(id) => navigation.navigate('FieldDetail', { fieldId: id })}
              />
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          style={styles.flex}
          data={filteredFields}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <FieldCard
                field={item}
                stats={{ todayTaskCount: fieldTodayTaskCounts[item.id] ?? 0 }}
                onPress={() => navigation.navigate('FieldDetail', { fieldId: item.id })}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={fields.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search.trim() ? (
              <EmptyState title={t('fields:emptySearchTitle')} description={t('fields:emptySearchDescription')} />
            ) : (
              <EmptyState
                icon={<Ionicons name="leaf-outline" size={36} color={colors.primary} />}
                title={t('fields:emptyTitle')}
                description={isFieldOwner() ? t('fields:emptyDescription') : t('fields:emptyWorker')}
                action={
                  isFieldOwner()
                    ? { label: t('fields:addFieldLabel'), onPress: () => navigation.navigate('FieldForm', {}) }
                    : undefined
                }
              />
            )
          }
        />
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
  },
  search: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    ...typography.styles.body,
  },
  sortRow: { gap: spacing.sm, paddingVertical: 2 },
  sortChip: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  mapScrollContent: { flexGrow: 1 },
  mapFlex: {
    flex: 1,
    minHeight: 320,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  cardWrap: { paddingHorizontal: spacing.base },
  listContent: { paddingBottom: spacing['3xl'] },
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl },
});

export default FieldsListScreen;
