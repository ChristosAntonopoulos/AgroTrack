import React, { useMemo } from 'react';
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
import { appFonts, radii, spacing } from '../../theme';

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
  title: string;
  timeLabel?: string;
  fields?: FieldNameRef[];
  lines?: string[];
  status?: string;
  onPress: () => void;
  onMenu: () => void;
};

const tidyLine = (line: string) =>
  line.replace(/μερίδιο\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/gi, (_m, a: string, b: string) => {
    const left = Math.round(Number(a) * 10) / 10;
    const right = Math.round(Number(b) * 10) / 10;
    return `μερίδιο ${left}/${right}`;
  });

const formatTime = (iso: string, locale: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const ActivityRow: React.FC<RowProps> = ({
  icon,
  title,
  timeLabel,
  fields,
  lines,
  status,
  onPress,
  onMenu,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.rowTop}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {timeLabel ? (
          <Text style={[styles.time, { color: colors.textTertiary }]}>{timeLabel}</Text>
        ) : null}
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
      {fields && fields.length > 0 ? (
        <View style={styles.rowBody}>
          <FieldNameRow fields={fields} variant="legend" />
        </View>
      ) : null}
      {lines?.map((line, index) => (
        <Text
          key={`${index}-${line}`}
          style={[styles.meta, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {tidyLine(line)}
        </Text>
      ))}
      {status ? (
        <Text style={[styles.status, { color: colors.eventHarvest }]}>{status}</Text>
      ) : null}
    </Pressable>
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
  const locale = i18n.language || 'el';

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
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('harvestCampaign.dayActivity.title')}
      </Text>

      {empty ? (
        <View
          style={[
            styles.guide,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.guideTitle, { color: colors.textSecondary }]}>
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
                    minHeight: Math.max(52, tapMin),
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.primaryDark} />
                <Text style={[styles.guideLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {day.sacks.map((entry) => (
            <ActivityRow
              key={entry.id}
              icon={HARVEST_ACTION_ICONS.sacks}
              title={`${entry.sacks} ${t('harvestCampaign.sacks.unit')}`}
              timeLabel={formatTime(entry.createdAt, locale)}
              fields={[fieldOf(entry.fieldId)]}
              lines={
                entry.kgPerSack
                  ? [`~${entry.kgPerSack} kg ${t('harvestCampaign.sacks.kgPerSack')}`]
                  : undefined
              }
              status={
                entry.millWeightId ? undefined : t('harvestCampaign.dayActivity.openBadge')
              }
              onPress={() => onEdit({ kind: 'sack', entry })}
              onMenu={() => openMenu({ kind: 'sack', entry })}
            />
          ))}

          {day.mills.map((entry) => (
            <ActivityRow
              key={entry.id}
              icon={HARVEST_ACTION_ICONS.mill}
              title={`${formatKg(entry.kg)} kg`}
              timeLabel={formatTime(entry.createdAt, locale)}
              fields={entry.fieldIds.map(fieldOf)}
              lines={[
                entry.fieldIds.length === 0 ? t('harvestCampaign.shared.badge') : null,
                entry.sackIds.length > 0
                  ? t('harvestCampaign.flow.fromSacks', { count: entry.sackIds.length })
                  : null,
                entry.note || null,
              ].filter((line): line is string => Boolean(line))}
              onPress={() => onEdit({ kind: 'mill', entry })}
              onMenu={() => openMenu({ kind: 'mill', entry })}
            />
          ))}

          {day.oils.map((entry) => {
            const recorded = (entry.tinLines || []).filter((line) => line.count > 0);
            const tins = readOilTinCounts(entry);
            const tinBits: string[] =
              recorded.length > 0
                ? recorded.map((line) =>
                    t('harvestCampaign.oil.tinBit', { count: line.count, size: line.sizeLitres })
                  )
                : [
                    tins.tin16 > 0
                      ? t('harvestCampaign.oil.tinBit', { count: tins.tin16, size: 16 })
                      : '',
                    tins.tin17 > 0
                      ? t('harvestCampaign.oil.tinBit', { count: tins.tin17, size: 17 })
                      : '',
                  ].filter(Boolean);
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
                icon={HARVEST_ACTION_ICONS.oil}
                title={
                  entry.unit === 'litres'
                    ? `${Math.round(entry.amount)} L`
                    : `${formatKg(oilAmountToKg(entry))} kg`
                }
                timeLabel={formatTime(entry.createdAt, locale)}
                fields={entry.fieldIds.map(fieldOf)}
                lines={lines}
                onPress={() => onEdit({ kind: 'oil', entry })}
                onMenu={() => openMenu({ kind: 'oil', entry })}
              />
            );
          })}

          {day.people.map((entry) => (
            <ActivityRow
              key={entry.id}
              icon={HARVEST_ACTION_ICONS.people}
              title={t('harvestCampaign.today.people', { count: entry.people })}
              timeLabel={formatTime(entry.createdAt, locale)}
              lines={[hoursLabel(entry)]}
              onPress={() => onEdit({ kind: 'people', entry })}
              onMenu={() => openMenu({ kind: 'people', entry })}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: appFonts.bold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  guide: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guideTile: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  guideLabel: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: appFonts.bold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  menuBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    paddingLeft: 26,
  },
  meta: {
    paddingLeft: 26,
    fontSize: 13,
    lineHeight: 17,
  },
  status: {
    paddingLeft: 26,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HarvestDayActivity;
