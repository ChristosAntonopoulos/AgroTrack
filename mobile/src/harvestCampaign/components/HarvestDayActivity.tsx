import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { FieldNameRow, type FieldNameRef } from '../../components/fields/FieldName';
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
  fieldOf: (fieldId: string) => FieldNameRef;
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
  onAdd: (kind: DayActivityKind) => void;
  allowedKinds?: HarvestCaptureKind[];
};

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  kindLabel: string;
  title: string;
  fieldLine?: string;
  fields?: FieldNameRef[];
  lines?: string[];
  status?: string;
  onPress: () => void;
  onMenu: () => void;
};

const ActivityRow: React.FC<RowProps> = ({
  icon,
  kindLabel,
  title,
  fieldLine,
  fields,
  lines,
  status,
  onPress,
  onMenu,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.rowTop}>
        <Pressable onPress={onPress} style={styles.rowMain} accessibilityRole="button">
          <Ionicons name={icon} size={18} color={colors.eventHarvest} />
          <Text style={[styles.kind, { color: colors.textPrimary }]} numberOfLines={1}>
            {kindLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onMenu}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('harvestCampaign.dayActivity.more')}
          style={styles.menuBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Pressable onPress={onPress} style={styles.rowBody}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {fields && fields.length > 0 ? <FieldNameRow fields={fields} /> : null}
        {fieldLine ? (
          <Text style={[styles.field, { color: colors.textSecondary }]}>{fieldLine}</Text>
        ) : null}
        {lines?.map((line, index) => (
          <Text key={`${index}-${line}`} style={[styles.meta, { color: colors.textSecondary }]}>
            {line}
          </Text>
        ))}
        {status ? (
          <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{status}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

export const HarvestDayActivity: React.FC<Props> = ({
  campaign,
  date,
  fieldOf,
  onEdit,
  onRemove,
  allowedKinds,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const [filter, setFilter] = useState<DayActivityKind | null>(null);

  useEffect(() => {
    setFilter(null);
  }, [date]);

  const day = useMemo(() => {
    const sacks = campaign.sacks.filter((row) => row.date === date);
    const mills = campaign.millWeights.filter((row) => row.date === date);
    const oils = campaign.oils.filter((row) => row.date === date);
    const people = campaign.peopleLogs.filter((row) => row.date === date);
    return { sacks, mills, oils, people };
  }, [campaign, date]);

  const sackCount = day.sacks.reduce((sum, row) => sum + row.sacks, 0);
  const millKg = day.mills.reduce((sum, row) => sum + row.kg, 0);
  const oilKg = day.oils.reduce((sum, row) => sum + oilAmountToKg(row), 0);
  const peopleCount = day.people.reduce((sum, row) => sum + row.people, 0);

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

  const openMenu = (target: DayActivityEditTarget) => {
    Alert.alert(t('harvestCampaign.dayActivity.more'), undefined, [
      { text: t('harvestCampaign.dayActivity.edit'), onPress: () => onEdit(target) },
      {
        text: t('harvestCampaign.dayActivity.remove'),
        style: 'destructive',
        onPress: () => confirmRemove(target),
      },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const hoursLabel = (entry: HarvestPeopleEntry) => {
    if (entry.hours === 'half') return t('harvestCampaign.people.hours.half');
    if (entry.hours === 'full') return t('harvestCampaign.people.hours.full');
    if (entry.hours === 'other') {
      return `${t('harvestCampaign.people.otherHours')}: ${entry.otherHours ?? '—'}`;
    }
    return t('harvestCampaign.people.hours.skip');
  };

  const kgLabel = (kg: number) => (kg > 0 ? `${formatKg(kg)} kg` : '—');

  const chip = (
    kind: DayActivityKind,
    capture: HarvestCaptureKind,
    label: string,
    value: string,
    count: number
  ) => {
    if (count <= 0) return null;
    if (allowedKinds && !allowedKinds.includes(capture)) return null;
    const selected = filter === kind;
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
        onPress={() => setFilter((current) => (current === kind ? null : kind))}
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.chip,
          {
            borderColor: selected ? colors.oliveBorder : colors.borderLight,
            backgroundColor: selected ? colors.primaryLight : colors.surface,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={14} color={colors.eventHarvest} />
        <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
          <Text style={{ color: colors.textSecondary }}>{` · ${value}`}</Text>
        </Text>
      </Pressable>
    );
  };

  const show = (kind: DayActivityKind) => filter == null || filter === kind;

  return (
    <View style={styles.section}>
      <Text style={[styles.kicker, { color: colors.textTertiary }]}>
        {t('harvestCampaign.dayActivity.recorded')}
      </Text>

      {!empty ? <View style={styles.chips}>
        {chip(
          'sack',
          'sacks',
          t('harvestCampaign.dayActivity.short.sacks'),
          sackCount > 0 ? String(sackCount) : '—',
          sackCount
        )}
        {chip(
          'mill',
          'mill',
          t('harvestCampaign.dayActivity.short.mill'),
          kgLabel(millKg),
          millKg
        )}
        {chip('oil', 'oil', t('harvestCampaign.dayActivity.short.oil'), kgLabel(oilKg), oilKg)}
        {chip(
          'people',
          'people',
          t('harvestCampaign.dayActivity.short.people'),
          peopleCount > 0 ? String(peopleCount) : '—',
          peopleCount
        )}
      </View> : null}

      {empty ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('harvestCampaign.dayActivity.empty')}
        </Text>
      ) : (
        <View style={styles.list}>
          {show('sack')
            ? day.sacks.map((entry) => (
                <ActivityRow
                  key={entry.id}
                  kindLabel={t('harvestCampaign.dayActivity.short.sacks')}
                  icon={HARVEST_ACTION_ICONS.sacks}
                  title={`${entry.sacks} ${t('harvestCampaign.sacks.unit')}`}
                  fields={[fieldOf(entry.fieldId)]}
                  lines={
                    entry.kgPerSack
                      ? [`${t('harvestCampaign.sacks.kgPerSack')}: ${entry.kgPerSack}`]
                      : undefined
                  }
                  status={
                    entry.millWeightId
                      ? undefined
                      : t('harvestCampaign.dayActivity.openBadge')
                  }
                  onPress={() => onEdit({ kind: 'sack', entry })}
                  onMenu={() => openMenu({ kind: 'sack', entry })}
                />
              ))
            : null}

          {show('mill')
            ? day.mills.map((entry) => (
                <ActivityRow
                  key={entry.id}
                  kindLabel={t('harvestCampaign.dayActivity.millWeight')}
                  icon={HARVEST_ACTION_ICONS.mill}
                  title={`${formatKg(entry.kg)} kg`}
                  fields={entry.fieldIds.map(fieldOf)}
                  fieldLine={entry.fieldIds.length === 0 ? t('harvestCampaign.shared.badge') : undefined}
                  lines={[
                    entry.sackIds.length > 0
                      ? t('harvestCampaign.flow.fromSacks', { count: entry.sackIds.length })
                      : null,
                    entry.note || null,
                  ].filter((line): line is string => Boolean(line))}
                  onPress={() => onEdit({ kind: 'mill', entry })}
                  onMenu={() => openMenu({ kind: 'mill', entry })}
                />
              ))
            : null}

          {show('oil')
            ? day.oils.map((entry) => {
                const tins = readOilTinCounts(entry);
                const tinBits: string[] = [];
                if (tins.tin16 > 0) {
                  tinBits.push(t('harvestCampaign.oil.tinBit', { count: tins.tin16, size: 16 }));
                }
                if (tins.tin17 > 0) {
                  tinBits.push(t('harvestCampaign.oil.tinBit', { count: tins.tin17, size: 17 }));
                }
                const lines: string[] = [];
                if (tinBits.length > 0) lines.push(tinBits.join(' · '));
                if (entry.millKept != null) {
                  lines.push(
                    t('harvestCampaign.dayActivity.millKept', {
                      amount: formatHarvestOilAmountLabel(
                        entry.millKept,
                        entry.unit,
                        i18n.language || 'en'
                      ),
                    })
                  );
                }
                if (entry.acidity != null) {
                  lines.push(`${t('harvestCampaign.oil.acidity')}: ${entry.acidity}`);
                }
                if (entry.note) lines.push(entry.note);
                return (
                  <ActivityRow
                    key={entry.id}
                    kindLabel={t('harvestCampaign.dayActivity.short.oil')}
                    icon={HARVEST_ACTION_ICONS.oil}
                    title={
                      entry.unit === 'litres'
                        ? `${Math.round(entry.amount)} L`
                        : `${formatKg(oilAmountToKg(entry))} kg`
                    }
                    fields={entry.fieldIds.map(fieldOf)}
                    fieldLine={
                      entry.fieldIds.length
                        ? undefined
                        : t('harvestCampaign.dayActivity.fromMills', {
                            count: entry.millWeightIds.length,
                          })
                    }
                    lines={lines}
                    onPress={() => onEdit({ kind: 'oil', entry })}
                    onMenu={() => openMenu({ kind: 'oil', entry })}
                  />
                );
              })
            : null}

          {show('people')
            ? day.people.map((entry) => (
                <ActivityRow
                  key={entry.id}
                  kindLabel={t('harvestCampaign.dayActivity.short.people')}
                  icon={HARVEST_ACTION_ICONS.people}
                  title={t('harvestCampaign.today.people', { count: entry.people })}
                  fieldLine={hoursLabel(entry)}
                  onPress={() => onEdit({ kind: 'people', entry })}
                  onMenu={() => openMenu({ kind: 'people', entry })}
                />
              ))
            : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kind: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    paddingLeft: 26,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  field: {
    fontSize: 14,
    lineHeight: 18,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HarvestDayActivity;
