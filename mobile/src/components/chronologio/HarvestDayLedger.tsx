import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
import type { HarvestDaySummary } from '../../harvestCampaign/totals';
import { openHarvestCampaign } from '../../navigation/intents';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import type { RootStackParamList } from '../../navigation/types';

type FieldRef = { id: string; name: string };
type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  days: HarvestDaySummary[];
  fields: FieldRef[];
};

const formatKg = (kg: number, locale: string) =>
  kg.toLocaleString(locale, { maximumFractionDigits: kg >= 10 ? 0 : 1 });

const HarvestDayLedger: React.FC<Props> = ({ days, fields }) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors, tapMin } = useTheme();
  const navigation = useNavigation<Nav>();
  const locale = i18n.language || 'el';
  if (days.length === 0) return null;

  const nameFor = (id: string) => friendlyFieldLabel(fields.find((field) => field.id === id)?.name || id);

  return (
    <View style={styles.list}>
      {days.map((day) => {
        const when = new Date(`${day.date}T12:00:00`);
        const weekday = when.toLocaleDateString(locale, { weekday: 'short' });
        const dayNum = when.toLocaleDateString(locale, { day: 'numeric' });
        const month = when.toLocaleDateString(locale, { month: 'short' });
        const olives = day.officialKg > 0 ? day.officialKg : day.estimatedKg;
        const names = [...new Set(day.fieldIds)].map(nameFor).filter(Boolean);
        const bits = [
          day.sacks > 0 ? `${day.sacks} ${t('sacksUnit')}` : null,
          olives > 0 ? `${formatKg(olives, locale)} ${t('olivesUnit')}` : null,
          day.oilKg > 0 ? `${formatKg(day.oilKg, locale)} ${t('oilUnit')}` : null,
          day.people > 0 ? `${day.people} ${t('workers')}` : null,
        ].filter(Boolean);
        return (
          <Pressable
            key={day.date}
            onPress={() => openHarvestCampaign(navigation, { day: day.date, view: 'fields' })}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: day.closed ? colors.borderLight : colors.primary,
                minHeight: Math.max(tapMin, 56),
              },
            ]}
          >
            <View>
              <Text style={[styles.dateStrong, { color: colors.textPrimary }]}>
                {dayNum} {month.replace(/\.$/, '')}
              </Text>
              <Text style={[styles.weekday, { color: colors.textTertiary }]}>
                {weekday.replace(/\.$/, '')}
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={[styles.line, { color: colors.textPrimary }]} numberOfLines={2}>
                {bits.join(' · ')}
                {day.closed ? '' : ` · ${t('living.harvestDayOpen')}`}
              </Text>
              {names.length > 0 ? (
                <Text style={[styles.fields, { color: colors.textSecondary }]} numberOfLines={1}>
                  {names.join(' · ')}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dateStrong: { fontSize: 15, fontWeight: '700' },
  weekday: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  body: { flex: 1, gap: 2 },
  line: { fontSize: 14, fontWeight: '600' },
  fields: { fontSize: 12 },
});

export default HarvestDayLedger;
