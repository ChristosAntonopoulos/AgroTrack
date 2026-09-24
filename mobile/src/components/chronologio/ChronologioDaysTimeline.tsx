import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ViewToken,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Image,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import {
  buildChronologioTimelineRows,
  type ChronologioTimelineRow,
} from '../../utils/chronologioTimeline';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import { resolvePublicAssetUrl } from '../../config/env';
import ChronologioEntryCard, { ChronologioWeatherCluster } from './ChronologioEntryCard';
import ChronologioPhotoStackCard from './ChronologioPhotoStackCard';
import ChronologioTimelineRowView from './ChronologioTimelineRow';
import DailyWeatherStrip from './DailyWeatherStrip';
import PhotoViewer, { type PhotoViewerItem } from '../photos/PhotoViewer';
import Sheet from '../ui/Sheet';
import { radii, spacing } from '../../theme';
import {
  buildDayWeatherView,
  type DayWeatherInput,
} from '../../chronologio/dayWeather';
import { athensCalendarDateKey } from '../../utils/athensDate';

type Props = {
  entries: ChronologioEntry[];
  showField: boolean;
  numberLocale: string;
  tapMin: number;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPressEntry: (entry: ChronologioEntry) => void;
  empty?: React.ReactNode;
  onScrollY?: (y: number) => void;
  onVisibleMonth?: (year: number, month: number, label: string) => void;
  listHeader?: React.ReactNode;
  weatherByDate?: Record<string, DayWeatherInput>;
  todayWeather?: DayWeatherInput | null;
  onOpenDayWeather?: (year: number, month: number, dateKey: string) => void;
  /** When set, scroll the timeline to this calendar day (yyyy-MM-dd). */
  focusDate?: string;
};

const isYearWeatherReview = (e: ChronologioEntry) => e.eventType === 'weather.yearReview';

const ChronologioDaysTimeline: React.FC<Props> = ({
  entries,
  showField,
  numberLocale,
  tapMin,
  loadingMore,
  hasMore,
  onLoadMore,
  onPressEntry,
  empty,
  onScrollY,
  onVisibleMonth,
  listHeader,
  weatherByDate = {},
  todayWeather,
  onOpenDayWeather,
  focusDate,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'photos']);
  const { colors } = useTheme();
  const stickyMeta = useRef<{ label: string; year: number; month: number }[]>([]);
  const onVisibleMonthRef = useRef(onVisibleMonth);
  onVisibleMonthRef.current = onVisibleMonth;
  const listRef = useRef<FlatList<ChronologioTimelineRow>>(null);
  const jumpedFocusRef = useRef<string | null>(null);
  const [photoDayEntries, setPhotoDayEntries] = useState<ChronologioEntry[] | null>(null);
  const [viewer, setViewer] = useState<{ items: PhotoViewerItem[]; index: number } | null>(null);

  const rows = useMemo(
    () =>
      buildChronologioTimelineRows(Array.isArray(entries) ? entries : [], {
        todayLabel: t('today'),
        yesterdayLabel: t('yesterday'),
        locale: i18n.language,
        skipEntry: isYearWeatherReview,
      }),
    [entries, i18n.language, t]
  );

  const daySheetItems = useMemo(() => {
    if (!photoDayEntries?.length) return [] as PhotoViewerItem[];
    return collectChronologioImages(photoDayEntries).map((m) => {
      const uri = resolvePublicAssetUrl(m.url || m.thumbnailUrl) || m.url || m.thumbnailUrl || '';
      return { id: m.id || uri, uri };
    });
  }, [photoDayEntries]);

  useEffect(() => {
    stickyMeta.current = rows.map((r) => ({
      label: r.stickyLabel,
      year: r.year,
      month: r.month,
    }));
  }, [rows]);

  useEffect(() => {
    const focusKey = (focusDate || '').slice(0, 10);
    if (!focusKey || rows.length === 0) return;
    if (jumpedFocusRef.current === focusKey) return;
    const index = rows.findIndex(
      (row) => row.kind === 'day' && row.dateKey === focusKey
    );
    if (index < 0) return;
    jumpedFocusRef.current = focusKey;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    });
  }, [focusDate, rows]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const first = viewableItems.find((v) => v.isViewable && v.index != null);
      if (first?.index == null) return;
      const meta = stickyMeta.current[first.index];
      if (meta) onVisibleMonthRef.current?.(meta.year, meta.month, meta.label);
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 18 }).current;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollY?.(e.nativeEvent.contentOffset.y);
    },
    [onScrollY]
  );

  const todayKey = athensCalendarDateKey(new Date());

  const renderItem = useCallback(
    ({ item, index }: { item: ChronologioTimelineRow; index: number }) => {
      const dayWeather =
        item.kind === 'day' && item.dateKey
          ? item.dateKey === todayKey && todayWeather
            ? todayWeather
            : weatherByDate[item.dateKey]
          : undefined;
      return (
      <ChronologioTimelineRowView
        row={item}
        isFirst={index === 0}
        isLast={index === rows.length - 1}
      >
        {item.kind === 'day' && item.dateKey ? (
          <DailyWeatherStrip
            weather={buildDayWeatherView(dayWeather, numberLocale)}
            onOpen={
              onOpenDayWeather
                ? () => onOpenDayWeather(item.year, item.month, item.dateKey!)
                : undefined
            }
          />
        ) : null}
        {item.kind === 'weatherCluster' && item.weatherReviews?.length ? (
          <ChronologioWeatherCluster
            entries={item.weatherReviews}
            numberLocale={numberLocale}
            onPressEntry={onPressEntry}
          />
        ) : null}
        {item.kind === 'photoGroup' && item.photoEntries?.length ? (
          <ChronologioPhotoStackCard
            entries={item.photoEntries}
            showField={showField}
            minHeight={Math.max(tapMin, 112)}
            onPress={() => setPhotoDayEntries(item.photoEntries!)}
          />
        ) : null}
        {item.kind === 'entry' && item.entry ? (
          <ChronologioEntryCard
            entry={item.entry}
            showField={showField}
            numberLocale={numberLocale}
            minHeight={Math.max(tapMin, 48)}
            onPress={() => onPressEntry(item.entry!)}
          />
        ) : null}
      </ChronologioTimelineRowView>
      );
    },
    [numberLocale, onOpenDayWeather, onPressEntry, rows.length, showField, tapMin, todayKey, todayWeather, weatherByDate]
  );

  if ((!Array.isArray(entries) || entries.length === 0 || rows.length === 0) && !listHeader) {
    return <>{empty}</>;
  }

  if (!Array.isArray(entries) || entries.length === 0 || rows.length === 0) {
    return (
      <>
        {listHeader}
        {empty}
      </>
    );
  }

  return (
    <>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader ? <>{listHeader}</> : null}
        contentContainerStyle={styles.list}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0,
            });
          }, 120);
        }}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : !hasMore ? (
            <Text style={[styles.end, { color: colors.textSecondary }]}>
              {t('living.endOfJournal')}
            </Text>
          ) : null
        }
      />

      <Sheet
        open={Boolean(photoDayEntries?.length)}
        onClose={() => setPhotoDayEntries(null)}
        title={t('photos:dayStack.sheetTitle')}
        edge="bottom"
        size="lg"
      >
        <View style={styles.dayGrid}>
          {daySheetItems.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => setViewer({ items: daySheetItems, index })}
              style={[styles.dayTile, { backgroundColor: colors.surfaceElevated }]}
            >
              <Image source={{ uri: item.uri }} style={styles.dayThumb} />
            </Pressable>
          ))}
        </View>
      </Sheet>

      <PhotoViewer
        open={Boolean(viewer)}
        items={viewer?.items || []}
        index={viewer?.index || 0}
        onClose={() => setViewer(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  list: { paddingBottom: 100, paddingTop: 2 },
  end: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 13,
    fontStyle: 'italic',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  dayTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  dayThumb: {
    width: '100%',
    height: '100%',
  },
});

export default ChronologioDaysTimeline;
