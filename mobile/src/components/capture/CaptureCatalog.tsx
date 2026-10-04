import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import {
  PRODUCTION_KINDS,
  type CaptureMenuGroup,
  type CaptureMove,
} from '../../capture/menu';
import { CATALOG_SECTION_ORDER } from '../../capture/quickAdd';
import { HARVEST_ACTION_ICONS } from '../../harvestCampaign/harvestActions';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import CaptureContextChips from './CaptureContextChips';
import Button from '../ui/Button';
import { openHarvestCampaign } from '../../navigation/intents';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

const SECTION_KEY: Record<string, string> = {
  day: 'catalogSections.harvest',
  grove: 'catalogSections.grove',
  money: 'catalogSections.money',
  warehouse: 'catalogSections.warehouse',
};

type Props = {
  groups: CaptureMenuGroup[];
  isHarvestLive: boolean;
  openSacks: number;
  openMillKg: number;
  fields: Field[];
  fieldId: string;
  occurredAt: string;
  recentFieldId?: string;
  recentIds?: readonly string[];
  onFieldChange: (id: string) => void;
  onOccurredAtChange: (iso: string) => void;
  onPick: (move: CaptureMove) => void;
  onClose: () => void;
};

const CaptureCatalog: React.FC<Props> = ({
  groups,
  isHarvestLive,
  openSacks,
  openMillKg,
  fields,
  fieldId,
  occurredAt,
  recentFieldId,
  recentIds = [],
  onFieldChange,
  onOccurredAtChange,
  onPick,
  onClose,
}) => {
  const { t } = useTranslation(['capture', 'fields', 'myOil']);
  const { colors, tapMin } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const allMoves = useMemo(() => {
    const map = new Map<string, CaptureMove>();
    for (const group of groups) {
      for (const move of group.moves) {
        if (!map.has(move.id)) map.set(move.id, move);
      }
    }
    return map;
  }, [groups]);

  const recentMoves = useMemo(() => {
    const picked: CaptureMove[] = [];
    const seen = new Set<string>();
    for (const id of recentIds) {
      if (seen.has(id)) continue;
      const move = allMoves.get(id);
      if (!move) continue;
      seen.add(id);
      picked.push(move);
      if (picked.length >= 3) break;
    }
    return picked;
  }, [recentIds, allMoves]);

  const titleOf = (move: CaptureMove): string => {
    if (move.surface === 'capture') {
      if (move.id === 'oil_sale') return t('capture:types.oilSale.title');
      if (move.id === 'payment') return t('capture:types.payment.title');
      return t(`capture:types.${move.type}.title`);
    }
    if (move.surface === 'money') return t('capture:types.money.title');
    if (move.surface === 'harvest') {
      return PRODUCTION_KINDS.includes(move.kind)
        ? t(`fields:harvestCampaign.addMenu.title.${move.kind}`)
        : t(`fields:harvestCampaign.actions.${move.kind}`);
    }
    const titleKey =
      move.action === 'fill' ? 'fillTins' : move.action === 'count' ? 'count' : move.action;
    return t(`myOil:actions.${titleKey}`);
  };

  const hintOf = (move: CaptureMove): string | undefined => {
    if (move.surface !== 'harvest') return undefined;
    if (move.kind === 'mill' && openSacks > 0) {
      return t('fields:harvestCampaign.addMenu.sacksWaiting', { count: openSacks });
    }
    if (move.kind === 'oil' && openMillKg > 0) {
      return t('fields:harvestCampaign.addMenu.fruitWaiting', { kg: Math.round(openMillKg) });
    }
    return undefined;
  };

  const iconOf = (move: CaptureMove): keyof typeof Ionicons.glyphMap => {
    if (move.surface === 'harvest') return HARVEST_ACTION_ICONS[move.kind];
    if (move.surface === 'warehouse') {
      if (move.action === 'give') return 'water-outline';
      if (move.action === 'sell') return 'cash-outline';
      if (move.action === 'hold') return 'bookmark-outline';
      if (move.action === 'fill') return 'cube-outline';
      return 'resize-outline';
    }
    if (move.id === 'oil_sale') return 'water-outline';
    if (move.id === 'payment') return 'cash-outline';
    if (move.surface === 'money' || move.type === 'money') return 'wallet-outline';
    if (move.type === 'income') return 'trending-up';
    if (move.type === 'expense') return 'trending-down';
    if (move.type === 'work') return 'checkmark-done-outline';
    if (move.type === 'photo') return 'camera-outline';
    if (move.type === 'voice') return 'mic-outline';
    if (move.type === 'document') return 'document-text-outline';
    return 'eye-outline';
  };

  const toneOf = (move: CaptureMove) => {
    if (move.surface === 'harvest') {
      if (move.kind === 'expense') return { accent: colors.eventExpense, soft: colors.eventExpenseSoft };
      if (move.kind === 'income') return { accent: colors.eventIncome, soft: colors.eventIncomeSoft };
      return { accent: colors.eventHarvest, soft: colors.eventHarvestSoft };
    }
    if (move.surface === 'warehouse') {
      return { accent: colors.eventWeather, soft: colors.eventWeatherSoft };
    }
    if (move.id === 'oil_sale' || move.type === 'income') {
      return { accent: colors.eventIncome, soft: colors.eventIncomeSoft };
    }
    if (move.id === 'payment' || move.type === 'expense') {
      return { accent: colors.eventExpense, soft: colors.eventExpenseSoft };
    }
    if (move.type === 'work') return { accent: colors.eventWork, soft: colors.eventWorkSoft };
    return { accent: colors.eventObservation, soft: colors.eventObservationSoft };
  };

  const tile = (move: CaptureMove) => {
    const title = titleOf(move);
    const hint = hintOf(move);
    const tone = toneOf(move);
    const featured = 'featured' in move && Boolean(move.featured);
    return (
      <View key={move.id} style={styles.tile}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hint ? `${title}. ${hint}` : title}
          onPress={() => onPick(move)}
          style={({ pressed }) => [
            styles.tileInner,
            {
              borderColor: featured ? tone.accent : colors.borderLight,
              backgroundColor: colors.surfaceElevated,
              minHeight: Math.max(72, tapMin + 16),
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <View style={[styles.iconWell, { backgroundColor: tone.soft }]}>
            <Ionicons name={iconOf(move)} size={20} color={tone.accent} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {title}
          </Text>
        </Pressable>
      </View>
    );
  };

  const grid = (moves: CaptureMove[]) => (
    <View style={styles.grid}>{moves.map((m) => tile(m))}</View>
  );

  return (
    <View style={styles.root}>
      <CaptureContextChips
        fields={fields}
        fieldId={fieldId}
        occurredAt={occurredAt}
        recentFieldId={recentFieldId}
        onFieldChange={onFieldChange}
        onOccurredAtChange={onOccurredAtChange}
      />

      {recentMoves.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('capture:recentSection')}
          </Text>
          {grid(recentMoves)}
        </View>
      ) : null}

      {CATALOG_SECTION_ORDER.map((sectionId) => {
        const group = byId.get(sectionId) || { id: sectionId, moves: [] as CaptureMove[] };

        if (sectionId === 'day') {
          return (
            <View key={sectionId} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t(`capture:${SECTION_KEY[sectionId]}`)}
              </Text>
              {isHarvestLive && group.moves.length > 0 ? (
                grid(group.moves)
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                    {t('capture:dayEmpty')}
                  </Text>
                  <Button
                    title={t('capture:openHarvest')}
                    onPress={() => {
                      onClose();
                      openHarvestCampaign(navigation, { fieldId: fieldId || undefined });
                    }}
                    fullWidth
                  />
                </View>
              )}
            </View>
          );
        }

        if (group.moves.length === 0) return null;

        return (
          <View key={sectionId} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t(`capture:${SECTION_KEY[sectionId]}`)}
            </Text>
            {grid(group.moves)}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 14 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tile: {
    width: '25%',
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  tileInner: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    gap: 5,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
    lineHeight: 13,
  },
});

export default CaptureCatalog;
