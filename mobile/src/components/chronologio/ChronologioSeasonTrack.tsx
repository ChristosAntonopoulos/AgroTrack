import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SEASON_STAGES, seasonTrackFill } from '../../chronologio/yearPresentation';
import { radii } from '../../theme';

type Props = {
  currentIndex: number;
  complete?: boolean;
};

/**
 * Agricultural-year season progress — bar + four stage labels (web ChronologioSeasonTrack).
 */
const ChronologioSeasonTrack: React.FC<Props> = ({ currentIndex, complete = false }) => {
  const { t } = useTranslation('chronologio');
  const { colors, fontScaleMultiplier } = useTheme();
  const idx = Math.min(SEASON_STAGES.length - 1, Math.max(0, currentIndex));
  const fill = seasonTrackFill(idx, complete) * 100;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View style={[styles.bar, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.fill,
            { width: `${fill}%`, backgroundColor: colors.primary },
          ]}
        />
        {SEASON_STAGES.map((key, index) => {
          const done = complete || index < idx;
          const now = !complete && index === idx;
          return (
            <View
              key={key}
              style={[
                styles.dot,
                {
                  left: `${((index + 0.5) / SEASON_STAGES.length) * 100}%`,
                  backgroundColor: done || now ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        {SEASON_STAGES.map((key, index) => {
          const done = complete || index < idx;
          const now = !complete && index === idx;
          return (
            <View key={key} style={styles.labelCell}>
              <Text
                style={[
                  styles.label,
                  {
                    color: now || done ? colors.textPrimary : colors.textTertiary,
                    fontWeight: now ? '700' : '500',
                    fontSize: 10 * fontScaleMultiplier,
                  },
                ]}
                numberOfLines={1}
              >
                {t(`yearView.stages.${key}`)}
              </Text>
              {now ? (
                <Text style={[styles.here, { color: colors.primary, fontSize: 9 * fontScaleMultiplier }]}>
                  {t('yearView.here')}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8, marginVertical: 4 },
  bar: {
    height: 6,
    borderRadius: radii.full,
    position: 'relative',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.full,
  },
  dot: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 99,
    borderWidth: 2,
  },
  labels: {
    flexDirection: 'row',
  },
  labelCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    textAlign: 'center',
  },
  here: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default ChronologioSeasonTrack;
