import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { appFonts, createElevation, radii, spacing } from '../theme';
import type { HarvestDaySummary } from './totals';
import { harvestWorkingDayHasActivity } from './workingDay';

type Props = {
  selectedDay: string;
  today: string;
  stripRows: HarvestDaySummary[];
  canPrev: boolean;
  canNext: boolean;
  locale: string;
  onSelectDay: (day: string) => void;
  onShift: (delta: -1 | 1) => void;
};

const CHIP_WIDTH = 72;
const CHIP_GAP = spacing.md;
const CHIP_STRIDE = CHIP_WIDTH + CHIP_GAP;

const HarvestDayStrip: React.FC<Props> = ({
  selectedDay,
  today,
  stripRows,
  canPrev,
  canNext,
  locale,
  onSelectDay,
  onShift,
}) => {
  const { t } = useTranslation('fields');
  const { colors, fontScaleMultiplier: scale } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const viewportWidth = useRef(0);

  const centerSelected = useCallback(() => {
    const index = stripRows.findIndex((row) => row.date === selectedDay);
    if (index < 0 || viewportWidth.current <= 0) return;
    const x = index * CHIP_STRIDE - (viewportWidth.current - CHIP_WIDTH) / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: false });
  }, [selectedDay, stripRows]);

  useEffect(() => {
    centerSelected();
  }, [centerSelected]);

  const weekday = new Date(`${selectedDay}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
  });
  const dayMonth = new Date(`${selectedDay}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
  });

  return (
    <View accessibilityLabel={t('harvestCampaign.dayNav.label')} style={styles.wrap}>
      <View
        style={[
          styles.masthead,
          {
            backgroundColor: colors.surfaceElevated,
            ...createElevation(colors, 'sm'),
          },
        ]}
      >
        <Pressable
          onPress={() => onShift(-1)}
          disabled={!canPrev}
          hitSlop={12}
          accessibilityLabel={t('harvestCampaign.dayNav.prev')}
          style={[
            styles.chevron,
            {
              opacity: canPrev ? 1 : 0.3,
              backgroundColor: colors.primaryLight,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
        </Pressable>

        <View style={styles.copy} accessibilityRole="header">
          <Text
            style={[
              styles.weekday,
              {
                color: colors.primaryDark,
                fontSize: 12 * scale,
              },
            ]}
            numberOfLines={1}
          >
            {weekday}
          </Text>
          <Text
            style={[
              styles.dayMonth,
              {
                color: colors.textPrimary,
                fontSize: 20 * scale,
                lineHeight: 24 * scale,
              },
            ]}
            numberOfLines={1}
          >
            {dayMonth}
          </Text>
        </View>

        <Pressable
          onPress={() => onShift(1)}
          disabled={!canNext}
          hitSlop={12}
          accessibilityLabel={t('harvestCampaign.dayNav.next')}
          style={[
            styles.chevron,
            {
              opacity: canNext ? 1 : 0.3,
              backgroundColor: colors.primaryLight,
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>

      {stripRows.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          onLayout={(event) => {
            viewportWidth.current = event.nativeEvent.layout.width;
            centerSelected();
          }}
        >
          {stripRows.map((row) => {
            const selected = row.date === selectedDay;
            const active = harvestWorkingDayHasActivity(row);
            const dayNum = Number(row.date.slice(-2));
            const chipWeekday = new Date(`${row.date}T12:00:00`)
              .toLocaleDateString(locale, { weekday: 'narrow' })
              .toUpperCase();
            return (
              <Pressable
                key={row.date}
                onPress={() => onSelectDay(row.date)}
                hitSlop={6}
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? colors.primary : 'transparent',
                    backgroundColor: selected
                      ? colors.primaryLight
                      : colors.surfaceElevated,
                    borderWidth: selected ? 1.5 : 0,
                    ...(selected ? {} : createElevation(colors, 'sm')),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipWeekday,
                    {
                      color: selected ? colors.primaryDark : colors.textSecondary,
                    },
                  ]}
                >
                  {chipWeekday}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: selected ? colors.primaryDark : colors.textPrimary,
                      fontSize: 17 * scale,
                    },
                  ]}
                >
                  {dayNum}
                </Text>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : row.date === today
                          ? colors.eventHarvest
                          : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  chevron: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  weekday: {
    fontFamily: appFonts.semibold,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  dayMonth: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.35,
    textAlign: 'center',
  },
  strip: { gap: CHIP_GAP, paddingVertical: 4, paddingHorizontal: 2 },
  chip: {
    width: CHIP_WIDTH,
    borderRadius: radii.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  chipWeekday: {
    fontSize: 11,
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dayNum: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});

export default HarvestDayStrip;
