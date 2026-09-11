import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ViewToken,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import {
  buildChronologioTimelineRows,
  type ChronologioTimelineRow,
} from '../../utils/chronologioTimeline';
import ChronologioEntryCard, { ChronologioWeatherCluster } from './ChronologioEntryCard';
import ChronologioTimelineRowView from './ChronologioTimelineRow';

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
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors } = useTheme();
  const stickyMeta = useRef<{ label: string; year: number; month: number }[]>([]);

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

  useEffect(() => {
    stickyMeta.current = rows.map((r) => ({
      label: r.stickyLabel,
      year: r.year,
      month: r.month,
    }));
    if (rows[0] && onVisibleMonth) {
      onVisibleMonth(rows[0].year, rows[0].month, rows[0].stickyLabel);
    }
  }, [onVisibleMonth, rows]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const first = viewableItems.find((v) => v.isViewable && v.index != null);
      if (first?.index == null) return;
      const meta = stickyMeta.current[first.index];
      if (meta && onVisibleMonth) onVisibleMonth(meta.year, meta.month, meta.label);
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 18 }).current;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollY?.(e.nativeEvent.contentOffset.y);
    },
    [onScrollY]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ChronologioTimelineRow; index: number }) => (
      <ChronologioTimelineRowView
        row={item}
        isFirst={index === 0}
        isLast={index === rows.length - 1}
      >
        {item.kind === 'weatherCluster' && item.weatherReviews?.length ? (
          <ChronologioWeatherCluster
            entries={item.weatherReviews}
            numberLocale={numberLocale}
            onPressEntry={onPressEntry}
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
    ),
    [numberLocale, onPressEntry, rows.length, showField, tapMin]
  );

  if (!Array.isArray(entries) || entries.length === 0) {
    return <>{empty}</>;
  }

  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <FlatList
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
  );
};

const styles = StyleSheet.create({
  list: { paddingBottom: 100, paddingTop: 4 },
  end: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 13,
  },
});

export default ChronologioDaysTimeline;
