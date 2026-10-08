import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import type { FieldWeather } from '../../services/geospatialService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { ChronologioEntry } from '../../services/chronologioService';
import { presentGroveWeather } from '../../weather/presentGroveWeather';
import { formatRelativeTime, numberLocaleFor } from '../../utils/fieldDisplay';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii, spacing } from '../../theme';
import FieldDetailMap from '../domain/FieldDetailMap';
import FieldYearGlance from './FieldYearGlance';
import FieldPeopleStrip from './FieldPeopleStrip';
import FieldQuickLinks from './FieldQuickLinks';
import FieldPageErrorBoundary from './FieldPageErrorBoundary';
import GroveEnrichmentCards from './GroveEnrichmentCards';

const categoryIcon = (
  category?: string
): React.ComponentProps<typeof Ionicons>['name'] => {
  const key = (category || '').toLowerCase();
  if (key.includes('harvest')) return 'basket-outline';
  if (key.includes('photo')) return 'camera-outline';
  if (key.includes('task') || key.includes('work')) return 'checkbox-outline';
  if (key.includes('expense') || key.includes('income') || key.includes('money')) return 'wallet-outline';
  if (key.includes('weather')) return 'cloudy-outline';
  if (key.includes('note')) return 'document-text-outline';
  return 'ellipse-outline';
};

type Props = {
  field: Field;
  overview: FieldOverviewDto | null;
  weather: FieldWeather | null;
  tasks: FieldTask[];
  recentEntries: ChronologioEntry[];
  canEdit: boolean;
  canViewMap: boolean;
  canViewMoney: boolean;
  canViewChronologio: boolean;
  canManageAccess: boolean;
  canOwn: boolean;
  year: number;
  onOpenMap: () => void;
  onOpenStatus: () => void;
  onOpenChronologio: (entryId?: string) => void;
  onOpenTask: (taskId: string) => void;
  onSeeFinance: () => void;
  onPeople: () => void;
  onMyOil: () => void;
};

/**
 * Compact mobile field home — inspired by web Overview, denser for one-handed use.
 */
const FieldOverviewHome: React.FC<Props> = ({
  field,
  overview,
  weather,
  tasks,
  recentEntries,
  canEdit,
  canViewMap,
  canViewMoney,
  canViewChronologio,
  canManageAccess,
  canOwn,
  onOpenMap,
  onOpenStatus,
  onOpenChronologio,
  onOpenTask,
  onSeeFinance,
  onPeople,
  onMyOil,
}) => {
  const { t, i18n } = useTranslation(['fields', 'chronologio']);
  const { colors, tapMin } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const weatherView = presentGroveWeather({ field: weather });

  const weatherLine =
    weatherView.mood === 'missing'
      ? overview?.weather?.headline || null
      : [
          weatherView.temperature != null ? `${weatherView.temperature}°` : null,
          t(`chronologio:weatherCard.condition.${weatherView.conditionKey}`, {
            defaultValue: weatherView.conditionKey,
          }),
        ]
          .filter(Boolean)
          .join(' · ');

  const nextTask = useMemo(() => {
    const open = tasks.filter((task) => {
      const s = String(task.status || '').toLowerCase();
      return s !== 'completed' && s !== 'cancelled' && s !== 'done' && s !== 'skipped';
    });
    return open[0] || null;
  }, [tasks]);

  const latest = recentEntries[0] || overview?.current?.latestRecord || null;
  const historyDetail = latest
    ? `${'title' in latest ? latest.title : ''}${
        'occurredAt' in latest && latest.occurredAt
          ? ` · ${formatRelativeTime(latest.occurredAt, locale)}`
          : ''
      }`
    : undefined;

  const whenLabel = (iso: string) => formatRelativeTime(iso, locale);

  return (
    <View style={styles.root}>
      <GroveEnrichmentCards field={field} canEdit={canEdit} />

      <View style={styles.today}>
        <Text style={[styles.kicker, { color: colors.textTertiary }]}>
          {t('fields:overview.weather.today', { defaultValue: 'Σήμερα' })}
        </Text>
        {weatherLine ? (
          <View style={styles.weatherRow}>
            <Ionicons name="partly-sunny-outline" size={18} color={colors.primary} />
            <Text style={[styles.weather, { color: colors.textPrimary }]} numberOfLines={1}>
              {weatherLine}
            </Text>
          </View>
        ) : null}
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          {nextTask
            ? nextTask.title
            : t('fields:overview.today.noTask', { defaultValue: 'Καμία εργασία σήμερα' })}
        </Text>
        {latest && 'title' in latest ? (
          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
            {t('fields:overview.today.last', {
              title: latest.title,
              when: 'occurredAt' in latest && latest.occurredAt ? whenLabel(latest.occurredAt) : '',
              defaultValue: `Τελευταίο: ${latest.title}`,
            })}
          </Text>
        ) : (
          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
            {t('fields:overview.statusStrip.noRecording', { defaultValue: 'Καμία καταγραφή ακόμη' })}
          </Text>
        )}
        {nextTask ? (
          <Pressable onPress={() => onOpenTask(nextTask.id)} hitSlop={6} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 2 }}>
              {t('fields:overview.priority.open', { defaultValue: 'Άνοιγμα' })} →
            </Text>
          </Pressable>
        ) : null}
      </View>

      {canViewMap ? (
        <FieldPageErrorBoundary label="Map">
          <View
            style={[
              styles.mapCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                ...createElevation(colors, 'sm'),
              },
            ]}
          >
            <Pressable
              onPress={onOpenMap}
              style={styles.mapHead}
              accessibilityRole="button"
              accessibilityLabel={t('fields:overview.mapPeek.title', { defaultValue: 'Χάρτης' })}
            >
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, flex: 1 }]}>
                {t('fields:overview.mapPeek.title', { defaultValue: 'Χάρτης' })}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
            <FieldDetailMap field={field} height={220} showDataLayers onOpenMapTab={onOpenMap} />
          </View>
        </FieldPageErrorBoundary>
      ) : null}

      <Pressable
        onPress={onOpenStatus}
        style={({ pressed }) => [
          styles.statusRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            opacity: pressed ? 0.94 : 1,
            minHeight: Math.max(52, tapMin),
            ...createElevation(colors, 'sm'),
          },
        ]}
        accessibilityRole="button"
      >
        <View style={[styles.statusIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="leaf-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
            {t('fields:overview.statusCard.title', { defaultValue: 'Κατάσταση' })}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }} numberOfLines={1}>
            {t('fields:overview.statusCard.hint', {
              defaultValue: 'Πρασινάδα, υγρασία, δορυφόρος',
            })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      {overview ? (
        <FieldPageErrorBoundary label="YearGlance">
          <FieldYearGlance overview={overview} canViewMoney={canViewMoney} onSeeFinance={onSeeFinance} />
        </FieldPageErrorBoundary>
      ) : null}

      <FieldPeopleStrip fieldId={field.id} onManage={onPeople} seed={field.memberships} />

      {canViewChronologio ? (
        <View
          style={[
            styles.recent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              ...createElevation(colors, 'sm'),
            },
          ]}
        >
          <View style={styles.recentHead}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, flex: 1 }]}>
              {t('fields:overview.recentHistory', { defaultValue: 'Πρόσφατα' })}
            </Text>
            <Pressable onPress={() => onOpenChronologio()} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {t('fields:overview.seeAllChronologioShort', { defaultValue: 'Όλα' })}
              </Text>
            </Pressable>
          </View>
          {recentEntries.length === 0 ? (
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
              {t('fields:overview.statusStrip.noRecording', { defaultValue: 'Καμία καταγραφή ακόμη' })}
            </Text>
          ) : (
            recentEntries.slice(0, 4).map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => onOpenChronologio(entry.id)}
                style={({ pressed }) => [
                  styles.recentRow,
                  { opacity: pressed ? 0.9 : 1, minHeight: Math.max(44, tapMin - 8) },
                ]}
                accessibilityRole="button"
              >
                <Ionicons
                  name={categoryIcon(entry.category)}
                  size={16}
                  color={colors.primary}
                />
                <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {entry.title}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                  {whenLabel(entry.occurredAt)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <FieldQuickLinks
        attentionTitle={null}
        canViewChronologio={canViewChronologio}
        historyDetail={historyDetail}
        onHistory={() => onOpenChronologio()}
        canManageAccess={canManageAccess}
        onPeople={onPeople}
        showMyOil={canOwn}
        onMyOil={onMyOil}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 12 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  today: { gap: 3, paddingHorizontal: 2 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weather: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, flex: 1 },
  mapCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
    overflow: 'hidden',
  },
  mapHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recent: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 6,
  },
  recentHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
});

export default FieldOverviewHome;
