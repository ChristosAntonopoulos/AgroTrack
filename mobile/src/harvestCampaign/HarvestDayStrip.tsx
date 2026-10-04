import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { appFonts, radii, spacing } from '../theme';
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

const CHIP_WIDTH = 44;
const CHIP_GAP = 6;
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
  const { colors, fontScaleMultiplier: scale, tapMin } = useTheme();
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
      <View style={[styles.masthead, { minHeight: Math.max(56, tapMin) }]}>
        <Pressable
          onPress={() => onShift(-1)}
          disabled={!canPrev}
          hitSlop={10}
          accessibilityLabel={t('harvestCampaign.dayNav.prev')}
          style={[styles.chevron, { opacity: canPrev ? 1 : 0.28 }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.copy} accessibilityRole="header">
          <Text
            style={[
              styles.dateLine,
              {
                color: colors.textPrimary,
                fontSize: 16 * scale,
              },
            ]}
            numberOfLines={1}
          >
            {`${weekday} ${dayMonth}`}
          </Text>
        </View>

        <Pressable
          onPress={() => onShift(1)}
          disabled={!canNext}
          hitSlop={10}
          accessibilityLabel={t('harvestCampaign.dayNav.next')}
          style={[styles.chevron, { opacity: canNext ? 1 : 0.28 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
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
                hitSlop={4}
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipWeekday,
                    {
                      color: selected ? colors.onOlive : colors.textSecondary,
                    },
                  ]}
                >
                  {chipWeekday}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: selected ? colors.onOlive : colors.textPrimary,
                      fontSize: 15 * scale,
                    },
                  ]}
                >
                  {dayNum}
                </Text>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: selected
                        ? colors.onOlive
                        : active
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
  wrap: { gap: 6 },
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chevron: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  dateLine: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  strip: {
    gap: CHIP_GAP,
    paddingVertical: 2,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  chip: {
    width: CHIP_WIDTH,
    borderRadius: radii.md,
    paddingTop: 6,
    paddingBottom: 5,
    alignItems: 'center',
    gap: 1,
  },
  chipWeekday: {
    fontSize: 10,
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dayNum: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});

export default HarvestDayStrip;
