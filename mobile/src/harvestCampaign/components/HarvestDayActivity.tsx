import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import { oilAmountToKg } from '../totals';
import type {
  HarvestCampaign,
  HarvestCaptureKind,
  HarvestMillWeightEntry,
  HarvestOilEntry,
  HarvestPeopleEntry,
  HarvestSackEntry,
} from '../types';
import { formatHarvestOilAmountLabel, readOilTinCounts } from '../utils/harvestCalculations';
import { HarvestCard } from './HarvestCard';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import { radii, spacing } from '../../theme';

export type DayActivityKind = 'sack' | 'mill' | 'oil' | 'people';

export type DayActivityEditTarget =
  | { kind: 'sack'; entry: HarvestSackEntry }
  | { kind: 'mill'; entry: HarvestMillWeightEntry }
  | { kind: 'oil'; entry: HarvestOilEntry }
  | { kind: 'people'; entry: HarvestPeopleEntry };

type Props = {
  campaign: HarvestCampaign;
  date: string;
  labelOf: (fieldId: string) => string;
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
  onAdd: (kind: DayActivityKind) => void;
  allowedKinds?: HarvestCaptureKind[];
};

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  kindLabel: string;
  title: string;
  detail: string;
  onEdit: () => void;
  onRemove: () => void;
};

const ActivityRow: React.FC<RowProps> = ({
  icon,
  kindLabel,
  title,
  detail,
  onEdit,
  onRemove,
}) => {
  const { colors, tapMin } = useTheme();
  const { t } = useTranslation('fields');

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.rowTop}>
        <View style={[styles.iconWell, { backgroundColor: colors.eventHarvestSoft }]}>
          <Ionicons name={icon} size={18} color={colors.eventHarvest} />
        </View>
        <View style={styles.rowMain}>
          <Text style={[styles.kind, { color: colors.eventHarvest }]}>{kindLabel}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {detail ? (
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                minHeight: Math.max(tapMin * 0.7, 36),
                borderColor: colors.borderLight,
                backgroundColor: colors.surfaceMuted,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
              {t('harvestCampaign.dayActivity.edit')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                minHeight: Math.max(tapMin * 0.7, 36),
                borderColor: 'transparent',
                backgroundColor: 'transparent',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.error, fontWeight: '700', fontSize: 13 }}>
              {t('harvestCampaign.dayActivity.remove')}
            </Text>
          </Pressable>
        </View>
    </View>
  );
};

export const HarvestDayActivity: React.FC<Props> = ({
  campaign,
  date,
  labelOf,
  onEdit,
  onRemove,
  onAdd,
  allowedKinds,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { colors, tapMin } = useTheme();

  const day = useMemo(() => {
    const sacks = campaign.sacks.filter((row) => row.date === date);
    const mills = campaign.millWeights.filter((row) => row.date === date);
    const oils = campaign.oils.filter((row) => row.date === date);
    const people = campaign.peopleLogs.filter((row) => row.date === date);
    return { sacks, mills, oils, people };
  }, [campaign, date]);

  const empty =
    day.sacks.length === 0 &&
    day.mills.length === 0 &&
    day.oils.length === 0 &&
    day.people.length === 0;

  const confirmRemove = (target: DayActivityEditTarget) => {
    Alert.alert(
      t('harvestCampaign.dayActivity.remove'),
      t('harvestCampaign.dayActivity.removeConfirm'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('harvestCampaign.dayActivity.remove'),
          style: 'destructive',
          onPress: () => onRemove(target),
        },
      ]
    );
  };

  const hoursLabel = (entry: HarvestPeopleEntry) => {
    if (entry.hours === 'half') return t('harvestCampaign.people.hours.half');
    if (entry.hours === 'full') return t('harvestCampaign.people.hours.full');
    if (entry.hours === 'other') {
      return `${t('harvestCampaign.people.otherHours')}: ${entry.otherHours ?? '—'}`;
    }
    return t('harvestCampaign.people.hours.skip');
  };

  const addChip = (kind: DayActivityKind, label: string) => {
    const icon =
      kind === 'sack'
        ? HARVEST_ACTION_ICONS.sacks
        : kind === 'mill'
          ? HARVEST_ACTION_ICONS.mill
          : kind === 'oil'
            ? HARVEST_ACTION_ICONS.oil
            : HARVEST_ACTION_ICONS.people;
    return (
      <Pressable
        key={kind}
        onPress={() => onAdd(kind)}
        style={({ pressed }) => [
          styles.addChip,
          {
            borderColor: colors.borderLight,
            backgroundColor: colors.eventHarvestSoft,
            minHeight: Math.max(tapMin * 0.75, 40),
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={colors.eventHarvest} />
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <HarvestCard tone="default" accent>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.kicker, { color: colors.textTertiary }]}>
            {t('harvestCampaign.dayActivity.kicker')}
          </Text>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            {t('harvestCampaign.dayActivity.title')}
          </Text>
        </View>
      </View>

      <View style={styles.addRow}>
          {(!allowedKinds || allowedKinds.includes('sacks'))
            ? addChip('sack', t('harvestCampaign.actions.sacks'))
            : null}
          {(!allowedKinds || allowedKinds.includes('mill'))
            ? addChip('mill', t('harvestCampaign.actions.mill'))
            : null}
          {(!allowedKinds || allowedKinds.includes('oil'))
            ? addChip('oil', t('harvestCampaign.actions.oil'))
            : null}
          {(!allowedKinds || allowedKinds.includes('people'))
            ? addChip('people', t('harvestCampaign.actions.people'))
            : null}
        </View>

      {empty ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('harvestCampaign.dayActivity.empty')}
        </Text>
      ) : (
        <View style={styles.list}>
          {day.sacks.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.sacks')}
              icon={HARVEST_ACTION_ICONS.sacks}
              title={`${entry.sacks} ${t('harvestCampaign.sacks.unit')}`}
              detail={[
                friendlyFieldLabel(labelOf(entry.fieldId)),
                entry.kgPerSack
                  ? `${t('harvestCampaign.sacks.kgPerSack')}: ${entry.kgPerSack}`
                  : null,
                entry.millWeightId
                  ? t('harvestCampaign.dayActivity.weighed')
                  : t('harvestCampaign.dayActivity.open'),
              ]
                .filter(Boolean)
                .join(' · ')}
              onEdit={() => onEdit({ kind: 'sack', entry })}
              onRemove={() => confirmRemove({ kind: 'sack', entry })}
            />
          ))}

          {day.mills.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.mill')}
              icon={HARVEST_ACTION_ICONS.mill}
              title={`${formatKg(entry.kg)} kg`}
              detail={[
                entry.fieldIds.map((id) => friendlyFieldLabel(labelOf(id))).join(' · ') ||
                  t('harvestCampaign.shared.badge'),
                entry.sackIds.length > 0
                  ? t('harvestCampaign.flow.fromSacks', { count: entry.sackIds.length })
                  : null,
                entry.note || null,
              ]
                .filter(Boolean)
                .join(' · ')}
              onEdit={() => onEdit({ kind: 'mill', entry })}
              onRemove={() => confirmRemove({ kind: 'mill', entry })}
            />
          ))}

          {day.oils.map((entry) => {
            const tins = readOilTinCounts(entry);
            const oilBits: string[] = [];
            if (tins.tin16 > 0) {
              oilBits.push(t('harvestCampaign.oil.tinBit', { count: tins.tin16, size: 16 }));
            }
            if (tins.tin17 > 0) {
              oilBits.push(t('harvestCampaign.oil.tinBit', { count: tins.tin17, size: 17 }));
            }
            if (entry.millKept != null) {
              oilBits.push(
                t('harvestCampaign.oil.millBit', {
                  amount: formatHarvestOilAmountLabel(entry.millKept, entry.unit, i18n.language || 'en'),
                })
              );
            }
            return (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.oil')}
              icon={HARVEST_ACTION_ICONS.oil}
              title={
                entry.unit === 'litres'
                  ? `${Math.round(entry.amount)} L`
                  : `${formatKg(oilAmountToKg(entry))} kg`
              }
              detail={[
                entry.fieldIds.length
                  ? entry.fieldIds.map((id) => friendlyFieldLabel(labelOf(id))).join(' · ')
                  : t('harvestCampaign.dayActivity.fromMills', {
                      count: entry.millWeightIds.length,
                    }),
                ...oilBits,
                entry.acidity != null
                  ? `${t('harvestCampaign.oil.acidity')}: ${entry.acidity}`
                  : null,
                entry.note || null,
              ]
                .filter(Boolean)
                .join(' · ')}
              onEdit={() => onEdit({ kind: 'oil', entry })}
              onRemove={() => confirmRemove({ kind: 'oil', entry })}
            />
            );
          })}

          {day.people.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.people')}
              icon={HARVEST_ACTION_ICONS.people}
              title={t('harvestCampaign.today.people', { count: entry.people })}
              detail={hoursLabel(entry)}
              onEdit={() => onEdit({ kind: 'people', entry })}
              onRemove={() => confirmRemove({ kind: 'people', entry })}
            />
          ))}
        </View>
      )}
    </HarvestCard>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  kind: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 44,
  },
  actionBtn: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default HarvestDayActivity;
