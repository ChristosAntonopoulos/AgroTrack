import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import { oilAmountToKg } from '../totals';
import type {
  HarvestCampaign,
  HarvestMillWeightEntry,
  HarvestOilEntry,
  HarvestPeopleEntry,
  HarvestSackEntry,
} from '../types';
import { HarvestCard } from './HarvestCard';
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
  closed?: boolean;
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
  onAdd: (kind: DayActivityKind) => void;
};

type RowProps = {
  kindLabel: string;
  title: string;
  detail: string;
  closed?: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

const ActivityRow: React.FC<RowProps> = ({
  kindLabel,
  title,
  detail,
  closed,
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
      <View style={styles.rowMain}>
        <Text style={[styles.kind, { color: colors.textTertiary }]}>{kindLabel}</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {detail ? (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text>
        ) : null}
      </View>
      {!closed ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { minHeight: Math.max(tapMin * 0.7, 36), opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('harvestCampaign.dayActivity.edit')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { minHeight: Math.max(tapMin * 0.7, 36), opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ color: colors.error, fontWeight: '700', fontSize: 13 }}>
              {t('harvestCampaign.dayActivity.remove')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

export const HarvestDayActivity: React.FC<Props> = ({
  campaign,
  date,
  labelOf,
  closed,
  onEdit,
  onRemove,
  onAdd,
}) => {
  const { t } = useTranslation(['fields', 'common']);
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

  const addChip = (kind: DayActivityKind, label: string) => (
    <Pressable
      key={kind}
      onPress={() => onAdd(kind)}
      style={({ pressed }) => [
        styles.addChip,
        {
          borderColor: colors.borderLight,
          backgroundColor: colors.surface,
          minHeight: Math.max(tapMin * 0.75, 36),
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+ {label}</Text>
    </Pressable>
  );

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

      {!closed ? (
        <View style={styles.addRow}>
          {addChip('sack', t('harvestCampaign.actions.sacks'))}
          {addChip('mill', t('harvestCampaign.actions.mill'))}
          {addChip('oil', t('harvestCampaign.actions.oil'))}
          {addChip('people', t('harvestCampaign.actions.people'))}
        </View>
      ) : null}

      {empty ? (
        <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
          {t('harvestCampaign.dayActivity.empty')}
        </Text>
      ) : (
        <View style={styles.list}>
          {day.sacks.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.sacks')}
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
              closed={closed}
              onEdit={() => onEdit({ kind: 'sack', entry })}
              onRemove={() => confirmRemove({ kind: 'sack', entry })}
            />
          ))}

          {day.mills.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.mill')}
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
              closed={closed}
              onEdit={() => onEdit({ kind: 'mill', entry })}
              onRemove={() => confirmRemove({ kind: 'mill', entry })}
            />
          ))}

          {day.oils.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.oil')}
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
                entry.acidity != null
                  ? `${t('harvestCampaign.oil.acidity')}: ${entry.acidity}`
                  : null,
                entry.note || null,
              ]
                .filter(Boolean)
                .join(' · ')}
              closed={closed}
              onEdit={() => onEdit({ kind: 'oil', entry })}
              onRemove={() => confirmRemove({ kind: 'oil', entry })}
            />
          ))}

          {day.people.map((entry) => (
            <ActivityRow
              key={entry.id}
              kindLabel={t('harvestCampaign.actions.people')}
              title={t('harvestCampaign.today.people', { count: entry.people })}
              detail={hoursLabel(entry)}
              closed={closed}
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowMain: {
    gap: 2,
  },
  kind: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
});

export default HarvestDayActivity;
