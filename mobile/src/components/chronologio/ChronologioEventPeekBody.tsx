import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import {
  presentActorName,
  presentChronologioEvent,
  presentExpenseChip,
} from '../../chronologio/eventPresentation';
import { chronologioDetailKind } from '../../chronologio/detailKind';
import { accentColorsForToken } from '../../utils/chronologioCategoryAccents';
import { detailAccentToken } from '../../chronologio/detailKind';
import { resolveFieldColor } from '../../utils/fieldColors';
import WeatherReviewSummary from './WeatherReviewSummary';
import PhotoViewer, { type PhotoViewerItem } from '../photos/PhotoViewer';
import { resolvePublicAssetUrl } from '../../config/env';
import { radii, spacing, typography } from '../../theme';

type Props = {
  entry: ChronologioEntry;
  numberLocale: string;
};

const isRealMedia = (url?: string | null) => {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('unsplash') || u.includes('picsum') || u.includes('placeholder')) return false;
  return u.includes('/uploads/') || u.startsWith('file:') || u.startsWith('content:') || u.startsWith('http');
};

const Fact: React.FC<{ label: string; value?: string | null; colors: { textTertiary: string; textPrimary: string } }> = ({
  label,
  value,
  colors,
}) => {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

/** Kind-aware Chronologio event peek body — mirrors web ChronologioEventDetail richness. */
const ChronologioEventPeekBody: React.FC<Props> = ({ entry, numberLocale }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'money', 'photos']);
  const { colors } = useTheme();
  const kind = chronologioDetailKind(entry);
  const token = detailAccentToken(entry);
  const { accent, soft } = accentColorsForToken(colors, token);
  const presented = presentChronologioEvent(entry, i18n.language);
  const actor = presentActorName(entry.actor?.displayName, i18n.language);
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const when = `${new Date(entry.occurredAt).toLocaleDateString(i18n.language, {
    dateStyle: 'long',
  })} · ${new Date(entry.occurredAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;

  const photos = (entry.media || []).filter(m => isRealMedia(m.url || m.thumbnailUrl));
  const viewerItems = useMemo(
    (): PhotoViewerItem[] =>
      photos.map((m) => {
        const uri =
          resolvePublicAssetUrl(m.url || m.thumbnailUrl) || m.url || m.thumbnailUrl || '';
        return { id: m.id || uri, uri };
      }),
    [photos]
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const harvest = entry.details.harvest;
  const note = entry.details.note;
  const expense = entry.details.expense;
  const weather = entry.details.weather;
  const intelligence = entry.details.intelligence;
  const lifecycle = entry.details.lifecycle;
  const task = entry.details.task;
  const expenseChip = presentExpenseChip(entry, i18n.language);

  return (
    <View style={styles.wrap}>
      <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>{when}</Text>

      {entry.field?.name ? (
        <View style={[styles.fieldChip, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.fieldDot, { backgroundColor: fieldAccent }]} />
          <Text style={{ color: colors.textPrimary, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
            {entry.field.name}
          </Text>
        </View>
      ) : null}

      <View style={[styles.kindPill, { backgroundColor: soft }]}>
        <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>
          {presented.shortLabel}
          {kind === 'warning' ? ` · ${t('chronologio:drawer.warning', { defaultValue: 'Warning' })}` : ''}
        </Text>
      </View>

      {kind === 'harvest' && harvest ? (
        <View style={[styles.heroPanel, { backgroundColor: soft }]}>
          <View style={styles.harvestRow}>
            <View style={styles.harvestStat}>
              <Text style={[styles.heroValue, { color: colors.eventHarvest }]}>
                {harvest.oliveKg.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.heroLabel}>{t('chronologio:olivesUnit')}</Text>
            </View>
            {harvest.oilKg != null ? (
              <View style={styles.harvestStat}>
                <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
                  {harvest.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}
                </Text>
                <Text style={styles.heroLabel}>{t('chronologio:oilUnit')}</Text>
              </View>
            ) : null}
            {harvest.oilYieldPercent != null ? (
              <View style={styles.harvestStat}>
                <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
                  {harvest.oilYieldPercent}%
                </Text>
                <Text style={styles.heroLabel}>{t('chronologio:yieldUnit')}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {kind === 'money' && entry.amount ? (
        <View style={[styles.heroPanel, { backgroundColor: soft }]}>
          <Text
            style={[
              styles.moneyHero,
              {
                color: entry.category === 'income' ? colors.eventIncome : colors.eventExpense,
              },
            ]}
          >
            {entry.category === 'income' ? '+' : '−'}
            {formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
          </Text>
          {expenseChip ? (
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginTop: 4 }}>
              {expenseChip}
            </Text>
          ) : null}
        </View>
      ) : null}

      {kind === 'weatherPeriod' && weather ? (
        <WeatherReviewSummary
          weather={weather}
          eventType={entry.eventType}
          numberLocale={numberLocale}
          locale={i18n.language}
          showSource
        />
      ) : null}

      {kind === 'task' ? (
        <View style={styles.section}>
          {entry.summary ? (
            <Text style={[styles.bodyText, { color: colors.textPrimary }]}>{entry.summary}</Text>
          ) : null}
          {task?.status ? (
            <View style={[styles.chip, { backgroundColor: soft }]}>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>
                {t(`common:taskStatus.${String(task.status).toLowerCase()}`, {
                  defaultValue: String(task.status),
                })}
              </Text>
            </View>
          ) : null}
          {entry.amount ? (
            <Fact
              label={t('chronologio:drawer.cost', { defaultValue: 'Cost' })}
              value={formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
              colors={colors}
            />
          ) : null}
        </View>
      ) : null}

      {kind === 'observation' ? (
        <View style={styles.section}>
          {note?.pinned ? (
            <View style={styles.pinRow}>
              <Ionicons name="pin" size={14} color={accent} />
              <Text style={{ color: accent, fontWeight: '700' }}>
                {t('chronologio:pinned', { defaultValue: 'Pinned' })}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
            {note?.bodyPreview || entry.summary || presented.label}
          </Text>
        </View>
      ) : null}

      {kind === 'warning' ? (
        <View style={[styles.warningPanel, { backgroundColor: soft, borderLeftColor: accent }]}>
          <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
            {intelligence?.message || entry.summary || presented.label}
          </Text>
          {intelligence?.recommendation ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {intelligence.recommendation}
            </Text>
          ) : null}
        </View>
      ) : null}

      {kind === 'fieldChange' ? (
        <View style={styles.section}>
          {lifecycle?.message || entry.summary ? (
            <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
              {lifecycle?.message || entry.summary}
            </Text>
          ) : null}
          <Fact
            label={t('chronologio:drawer.previous', { defaultValue: 'Before' })}
            value={lifecycle?.previousStage || lifecycle?.previousYear}
            colors={colors}
          />
          <Fact
            label={t('chronologio:drawer.next', { defaultValue: 'After' })}
            value={lifecycle?.newStage || lifecycle?.newYear}
            colors={colors}
          />
        </View>
      ) : null}

      <View style={styles.facts}>
        <Fact label={t('chronologio:living.actor')} value={actor} colors={colors} />
        {kind === 'money' ? (
          <>
            <Fact
              label={t('chronologio:drawer.moneyCategory', { defaultValue: 'Category' })}
              value={expenseChip || expense?.expenseCategoryLabel || expense?.expenseCategory}
              colors={colors}
            />
            <Fact
              label={t('chronologio:drawer.quantity', { defaultValue: 'Description' })}
              value={expense?.description}
              colors={colors}
            />
          </>
        ) : null}
        {kind === 'harvest' ? (
          <>
            <Fact label={t('chronologio:mill')} value={harvest?.mill} colors={colors} />
            <Fact
              label={t('chronologio:drawer.quality', { defaultValue: 'Quality' })}
              value={harvest?.quality}
              colors={colors}
            />
            <Fact
              label={t('chronologio:workers')}
              value={harvest?.workers != null ? String(harvest.workers) : null}
              colors={colors}
            />
          </>
        ) : null}
      </View>

      {photos.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('chronologio:living.photos')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {viewerItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => setViewerIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={t('photos:viewer.expand')}
              >
                <Image source={{ uri: item.uri }} style={styles.photo} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <PhotoViewer
        open={viewerIndex != null}
        items={viewerItems}
        index={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
};

export type EventPeekFooterAction = {
  label: string;
  onPress: () => void;
  primary?: boolean;
};

export const eventPeekFooterActions = (
  entry: ChronologioEntry,
  t: (key: string, opts?: Record<string, unknown>) => string,
  navigate: {
    openTask: () => void;
    openMoney: () => void;
    openHarvest: () => void;
    openWeather: () => void;
    openField: () => void;
    openPhoto?: () => void;
    createTask?: () => void;
  }
): EventPeekFooterAction[] => {
  const kind = chronologioDetailKind(entry);
  const actions: EventPeekFooterAction[] = [];
  if (entry.sourceType === 'Photo' && navigate.openPhoto) {
    actions.push({
      label: t('chronologio:drawer.openPhoto', { defaultValue: 'Open photo' }),
      onPress: navigate.openPhoto,
      primary: true,
    });
    return actions;
  }
  if (kind === 'task') {
    actions.push({
      label: t('chronologio:drawer.openTask', { defaultValue: 'Open task' }),
      onPress: navigate.openTask,
      primary: true,
    });
  } else if (kind === 'money') {
    actions.push({
      label: t('chronologio:drawer.openMoney', { defaultValue: 'Open in Money' }),
      onPress: navigate.openMoney,
      primary: true,
    });
  } else if (kind === 'harvest') {
    actions.push({
      label: t('chronologio:living.openFull'),
      onPress: navigate.openHarvest,
      primary: true,
    });
  } else if (kind === 'weatherPeriod') {
    actions.push({
      label: t('chronologio:weatherReview.openCharts'),
      onPress: navigate.openWeather,
      primary: true,
    });
  } else if (kind === 'observation') {
    if (navigate.createTask) {
      actions.push({
        label: t('chronologio:drawer.createTask', {
          defaultValue: 'Create work from this observation',
        }),
        onPress: navigate.createTask,
        primary: true,
      });
    }
    actions.push({
      label: t('chronologio:living.openFull'),
      onPress: navigate.openField,
      primary: !navigate.createTask,
    });
  } else {
    actions.push({
      label: t('chronologio:living.openFull'),
      onPress: navigate.openField,
      primary: true,
    });
  }
  return actions;
};

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  fieldDot: { width: 8, height: 8, borderRadius: 99 },
  kindPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  heroPanel: {
    borderRadius: radii.card,
    padding: spacing.base,
    marginBottom: 12,
  },
  harvestRow: { flexDirection: 'row', gap: 16 },
  harvestStat: { gap: 2 },
  heroValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  heroLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moneyHero: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  section: { gap: 8, marginBottom: 14 },
  sectionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  bodyText: { fontSize: 16, lineHeight: 24 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warningPanel: {
    borderRadius: radii.card,
    padding: 14,
    borderLeftWidth: 2,
    marginBottom: 12,
  },
  facts: { gap: 12, marginBottom: 8 },
  fact: { gap: 2 },
  factLabel: { ...typography.styles.overline },
  factValue: { fontSize: 15, fontWeight: '600' },
  photo: { width: 140, height: 100, borderRadius: radii.card, marginRight: 8 },
});

export default ChronologioEventPeekBody;
