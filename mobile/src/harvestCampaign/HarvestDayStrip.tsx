import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { shiftAthensDateKey } from '../utils/athensDate';
import { radii, spacing, typography } from '../theme';
import type { HarvestDaySummary } from './totals';
import { harvestWorkingDayHasActivity } from './workingDay';
import { HarvestCard } from './components/HarvestCard';

type Props = {
  selectedDay: string;
  today: string;
  dayNumber: number;
  stripRows: HarvestDaySummary[];
  canPrev: boolean;
  canNext: boolean;
  locale: string;
  onSelectDay: (day: string) => void;
  onShift: (delta: -1 | 1) => void;
};

const CHIP_STRIDE = 48 + spacing.sm;

const HarvestDayStrip: React.FC<Props> = ({
  selectedDay,
  today,
  dayNumber,
  stripRows,
  canPrev,
  canNext,
  locale,
  onSelectDay,
  onShift,
}) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const yesterday = shiftAthensDateKey(today, -1);
  const scrollRef = useRef<ScrollView>(null);
  const viewportWidth = useRef(0);

  const centerSelected = useCallback(() => {
    const index = stripRows.findIndex((row) => row.date === selectedDay);
    if (index < 0 || viewportWidth.current <= 0) return;
    const x = index * CHIP_STRIDE - (viewportWidth.current - 48) / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: false });
  }, [selectedDay, stripRows]);

  useEffect(() => {
    centerSelected();
  }, [centerSelected]);
  const title = new Date(`${selectedDay}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const relative =
    selectedDay === today
      ? t('harvestCampaign.dayNav.today')
      : selectedDay === yesterday
        ? t('harvestCampaign.dayNav.yesterday')
        : null;

  return (
    <View accessibilityLabel={t('harvestCampaign.dayNav.label')} style={styles.wrap}>
      <HarvestCard tone="hero">
        <View style={styles.mastheadRow}>
          <Pressable
            onPress={() => onShift(-1)}
            disabled={!canPrev}
            hitSlop={12}
            accessibilityLabel={t('harvestCampaign.dayNav.prev')}
            style={[
              styles.chevron,
              {
                minWidth: tapMin,
                minHeight: tapMin,
                opacity: canPrev ? 1 : 0.35,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.copy}>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={[styles.sub, { color: colors.textTertiary }]}>
              {t('harvestCampaign.home.day', { day: dayNumber })}
              {relative ? ` · ${relative}` : ''}
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
                minWidth: tapMin,
                minHeight: tapMin,
                opacity: canNext ? 1 : 0.35,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </HarvestCard>

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
            const weekday = new Date(`${row.date}T12:00:00`)
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
                    borderColor: selected ? colors.oliveBorder : colors.borderLight,
                    backgroundColor: selected ? colors.primaryLight : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.weekday, { color: colors.textTertiary }]}>{weekday}</Text>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: selected ? colors.primary : colors.textPrimary,
                      fontSize: 16 * fontScaleMultiplier,
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
                          ? colors.warning
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
  wrap: { gap: spacing.md },
  mastheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  copy: { flex: 1, gap: 2, alignItems: 'center' },
  title: { fontWeight: '750' as '700', letterSpacing: -0.3, textAlign: 'center' },
  sub: { ...typography.styles.caption, textAlign: 'center' },
  strip: { gap: spacing.sm, paddingVertical: 2, paddingHorizontal: 2 },
  chip: {
    width: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingBottom: 6,
    alignItems: 'center',
    gap: 2,
  },
  weekday: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  dayNum: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});

export default HarvestDayStrip;
