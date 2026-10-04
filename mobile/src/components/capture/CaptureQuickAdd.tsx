import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { PRODUCTION_KINDS, type CaptureMove } from '../../capture/menu';
import { HARVEST_ACTION_ICONS } from '../../harvestCampaign/harvestActions';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import CaptureContextChips from './CaptureContextChips';

type Props = {
  moves: CaptureMove[];
  fields: Field[];
  fieldId: string;
  occurredAt: string;
  recentFieldId?: string;
  hints?: Partial<Record<string, string>>;
  onFieldChange: (id: string) => void;
  onOccurredAtChange: (iso: string) => void;
  onPick: (move: CaptureMove) => void;
  onMore: () => void;
};

const CaptureQuickAdd: React.FC<Props> = ({
  moves,
  fields,
  fieldId,
  occurredAt,
  recentFieldId,
  hints,
  onFieldChange,
  onOccurredAtChange,
  onPick,
  onMore,
}) => {
  const { t } = useTranslation(['capture', 'fields', 'myOil']);
  const { colors, tapMin } = useTheme();

  const copyOf = (move: CaptureMove): { title: string; domain: string } => {
    if (move.surface === 'capture') {
      if (move.id === 'oil_sale') {
        return {
          title: t('capture:types.oilSale.title'),
          domain: t('capture:quickDomain.money'),
        };
      }
      if (move.id === 'payment') {
        return {
          title: t('capture:types.payment.title'),
          domain: t('capture:quickDomain.money'),
        };
      }
      return {
        title: t(`capture:types.${move.type}.title`),
        domain: t(
          `capture:quickDomain.${
            move.type === 'expense' || move.type === 'income' ? 'money' : 'grove'
          }`
        ),
      };
    }
    if (move.surface === 'money') {
      return {
        title: t('capture:types.money.title'),
        domain: t('capture:quickDomain.money'),
      };
    }
    if (move.surface === 'harvest') {
      const title = PRODUCTION_KINDS.includes(move.kind)
        ? t(`fields:harvestCampaign.addMenu.title.${move.kind}`)
        : t(`fields:harvestCampaign.actions.${move.kind}`);
      return { title, domain: t('capture:quickDomain.harvest') };
    }
    const titleKey =
      move.action === 'fill' ? 'fillTins' : move.action === 'count' ? 'count' : move.action;
    return {
      title: t(`myOil:actions.${titleKey}`),
      domain: t('capture:quickDomain.warehouse'),
    };
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

  const toneOf = (move: CaptureMove): { accent: string; soft: string } => {
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

  return (
    <View style={styles.root}>
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>{t('capture:whatToRecord')}</Text>

      <CaptureContextChips
        fields={fields}
        fieldId={fieldId}
        occurredAt={occurredAt}
        recentFieldId={recentFieldId}
        onFieldChange={onFieldChange}
        onOccurredAtChange={onOccurredAtChange}
      />

      {moves.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>{t('capture:tabLocked')}</Text>
      ) : (
        <View style={styles.grid}>
          {moves.map((move) => {
            const copy = copyOf(move);
            const tone = toneOf(move);
            const hint = hints?.[move.id];
            return (
              <Pressable
                key={move.id}
                onPress={() => onPick(move)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceElevated,
                    minHeight: Math.max(112, tapMin + 48),
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <View style={[styles.iconWell, { backgroundColor: tone.soft }]}>
                  <Ionicons name={iconOf(move)} size={24} color={tone.accent} />
                </View>
                <Text style={[styles.tileTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {copy.title}
                </Text>
                <Text style={[styles.tileDomain, { color: colors.textSecondary }]} numberOfLines={2}>
                  {hint || copy.domain}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={onMore}
        style={({ pressed }) => [
          styles.more,
          {
            borderColor: colors.borderLight,
            backgroundColor: colors.surfaceMuted,
            minHeight: Math.max(48, tapMin),
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={[styles.moreLabel, { color: colors.textPrimary }]}>{t('capture:allRecords')}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 12 },
  prompt: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minWidth: '42%',
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 14,
    gap: 8,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tileDomain: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  more: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CaptureQuickAdd;
