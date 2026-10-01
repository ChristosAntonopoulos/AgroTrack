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
import { createElevation, radii, spacing } from '../../theme';

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

/** Round ugly share fractions in notes: μερίδιο 54.701.../95.16... → 54.7/95.2 */
const tidyLine = (line: string) =>
  line.replace(/μερίδιο\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/gi, (_m, a: string, b: string) => {
    const left = Math.round(Number(a) * 10) / 10;
    const right = Math.round(Number(b) * 10) / 10;
    return `μερίδιο ${left}/${right}`;
  });

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
        { backgroundColor: colors.surfaceElevated, ...createElevation(colors, 'sm') },
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
          <Text style={[styles.field, { color: colors.textSecondary }]}>{tidyLine(fieldLine)}</Text>
        ) : null}
        {lines?.map((line, index) => (
          <Text key={`${index}-${line}`} style={[styles.meta, { color: colors.textSecondary }]}>
            {tidyLine(line)}
          </Text>
        ))}
        {status ? (
          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="time-outline" size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>{status}</Text>
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
  onAdd,
  allowedKinds,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { colors, tapMin } = useTheme();
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
            borderColor: selected ? colors.eventHarvest : colors.oliveBorder,
            backgroundColor: selected ? colors.eventHarvestSoft : colors.surfaceElevated,
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

  const guideKinds: {
    kind: DayActivityKind;
    capture: HarvestCaptureKind;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
  }[] = [
    {
      kind: 'sack',
      capture: 'sacks',
      icon: HARVEST_ACTION_ICONS.sacks,
      label: t('harvestCampaign.pipeline.sacks'),
    },
    {
      kind: 'mill',
      capture: 'mill',
      icon: HARVEST_ACTION_ICONS.mill,
      label: t('harvestCampaign.pipeline.fruit'),
    },
    {
      kind: 'oil',
      capture: 'oil',
      icon: HARVEST_ACTION_ICONS.oil,
      label: t('harvestCampaign.pipeline.oil'),
    },
    {
      kind: 'people',
      capture: 'people',
      icon: HARVEST_ACTION_ICONS.people,
      label: t('harvestCampaign.dayActivity.short.people'),
    },
  ].filter((item) => !allowedKinds || allowedKinds.includes(item.capture));

  return (
    <View style={styles.section}>
      {empty ? (
        <View
        style={[
          styles.guide,
          {
            backgroundColor: colors.surfaceElevated,
            ...createElevation(colors, 'sm'),
          },
        ]}
        >
          <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
            {t('harvestCampaign.dayGuide.title')}
          </Text>
          <View style={styles.guideGrid}>
            {guideKinds.map((item) => (
              <Pressable
                key={item.kind}
                onPress={() => onAdd(item.kind)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.guideTile,
                  {
                    minHeight: Math.max(72, tapMin + 24),
                    backgroundColor: colors.surface,
                    ...createElevation(colors, 'sm'),
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={[styles.guideIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.guideLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.chips}>
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
          </View>

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
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guide: {
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  guideTile: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
  },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
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
