import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { harvestPipelinePalette } from '../../theme';
import { HARVEST_ACTION_ICONS } from '../harvestActions';

export type HarvestPathStep = 'sacks' | 'mill' | 'oil';

const ORDER: HarvestPathStep[] = ['sacks', 'mill', 'oil'];

const toneFor = (step: HarvestPathStep) =>
  step === 'sacks'
    ? harvestPipelinePalette.sacks
    : step === 'mill'
      ? harvestPipelinePalette.fruit
      : harvestPipelinePalette.oil;

/**
 * Sacks → fruit → oil, drawn as one connected path.
 */
export const HarvestStepRail: React.FC<{
  current: HarvestPathStep;
  facts?: Partial<Record<HarvestPathStep, string>>;
  caption?: string;
  onPick?: (step: HarvestPathStep) => void;
  enabled?: HarvestPathStep[];
}> = ({ current, facts, caption, onPick, enabled }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const you = t('harvestCampaign.stepRail.you');
  const currentIndex = ORDER.indexOf(current);
  const currentTone = toneFor(current);
  const fill = current === 'oil' ? '100%' : current === 'mill' ? '50%' : '12%';

  return (
    <View style={styles.wrap} accessibilityLabel={t('harvestCampaign.stepRail.aria')}>
      <View style={styles.path}>
        <View
          style={[styles.line, { backgroundColor: colors.border }]}
          accessibilityElementsHidden
        >
          <View style={[styles.lineFill, { width: fill, backgroundColor: currentTone.icon }]} />
        </View>
        {ORDER.map((step) => {
          const isCurrent = step === current;
          const index = ORDER.indexOf(step);
          const tone = toneFor(step);
          const canPick = onPick != null && (enabled == null || enabled.includes(step));
          const place =
            onPick != null
              ? isCurrent
                ? 'current'
                : canPick
                  ? 'open'
                  : 'later'
              : index < currentIndex
                ? 'done'
                : isCurrent
                  ? 'current'
                  : 'later';
          const factText = isCurrent ? (onPick ? you : facts?.[step] || you) : facts?.[step] || '';
          const filled = place === 'current';
          const dot = (
            <View
              style={[
                styles.dot,
                filled
                  ? {
                      backgroundColor: tone.icon,
                      borderColor: tone.icon,
                    }
                  : {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: place === 'later' ? colors.border : tone.icon,
                    },
              ]}
            >
              <Ionicons
                name={HARVEST_ACTION_ICONS[step]}
                size={isCurrent ? 18 : 16}
                color={
                  filled
                    ? colors.onOlive
                    : place === 'later'
                      ? colors.textTertiary
                      : tone.icon
                }
              />
            </View>
          );
          const body = (
            <>
              {dot}
              <Text
                style={[
                  styles.name,
                  {
                    color:
                      place === 'current'
                        ? tone.icon
                        : place === 'later'
                          ? colors.textTertiary
                          : colors.textPrimary,
                  },
                ]}
                numberOfLines={2}
              >
                {t(`harvestCampaign.addMenu.title.${step}`)}
              </Text>
              <Text
                style={[
                  styles.fact,
                  { color: place === 'current' ? tone.icon : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {factText || ' '}
              </Text>
            </>
          );
          if (canPick && onPick) {
            return (
              <Pressable
                key={step}
                onPress={() => onPick(step)}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                style={[styles.node, place === 'later' && styles.later]}
              >
                {body}
              </Pressable>
            );
          }
          return (
            <View key={step} style={[styles.node, place === 'later' && styles.later]}>
              {body}
            </View>
          );
        })}
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  path: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  line: {
    position: 'absolute',
    top: 21,
    left: '16%',
    right: '16%',
    height: 2,
    borderRadius: 99,
    overflow: 'hidden',
  },
  lineFill: { height: 2 },
  node: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    zIndex: 1,
  },
  later: { opacity: 0.55 },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 16 },
  fact: { fontSize: 11, fontWeight: '600', textAlign: 'center', minHeight: 14 },
  caption: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
