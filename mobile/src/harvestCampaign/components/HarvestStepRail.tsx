import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
import { HARVEST_ACTION_ICONS } from '../harvestActions';

export type HarvestPathStep = 'sacks' | 'mill' | 'oil';

const ORDER: HarvestPathStep[] = ['sacks', 'mill', 'oil'];

export const HarvestStepRail: React.FC<{
  current: HarvestPathStep;
  facts?: Partial<Record<HarvestPathStep, string>>;
  caption?: string;
  onPick?: (step: HarvestPathStep) => void;
  enabled?: HarvestPathStep[];
}> = ({ current, facts, caption, onPick, enabled }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const you = t('harvestCampaign.stepRail.you');

  return (
    <View style={styles.wrap} accessibilityLabel={t('harvestCampaign.stepRail.aria')}>
      <View style={styles.row}>
        {ORDER.map((step) => {
          const isCurrent = step === current;
          const canPick = onPick != null && (enabled == null || enabled.includes(step));
          const factText = isCurrent ? (onPick ? you : facts?.[step] || you) : facts?.[step] || '';
          const bg = isCurrent ? colors.eventHarvestSoft : colors.surface;
          const border = isCurrent ? colors.oliveBorder : colors.border;
          const body = (
            <>
              <Ionicons
                name={HARVEST_ACTION_ICONS[step]}
                size={isCurrent ? 18 : 16}
                color={isCurrent ? colors.eventHarvest : colors.textSecondary}
              />
              <Text
                style={[
                  styles.name,
                  { color: isCurrent ? colors.textPrimary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {t(`harvestCampaign.addMenu.title.${step}`)}
              </Text>
              <Text style={[styles.fact, { color: colors.textTertiary }]} numberOfLines={1}>
                {factText || ' '}
              </Text>
            </>
          );
          if (canPick && onPick) {
            return (
              <Pressable
                key={step}
                onPress={() => onPick(step)}
                style={[
                  styles.node,
                  { minHeight: tapMin, backgroundColor: bg, borderColor: border },
                ]}
              >
                {body}
              </Pressable>
            );
          }
          return (
            <View
              key={step}
              style={[styles.node, { backgroundColor: bg, borderColor: border }]}
            >
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
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: 8 },
  node: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: 10,
    gap: 4,
    alignItems: 'flex-start',
  },
  name: { fontSize: 13, fontWeight: '700' },
  fact: { fontSize: 11 },
  caption: { fontSize: 13 },
});
