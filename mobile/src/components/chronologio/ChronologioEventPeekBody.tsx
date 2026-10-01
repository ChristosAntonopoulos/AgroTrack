import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import type { Field } from '../../services/fieldService';
import type { HarvestCampaign } from '../../harvestCampaign/types';
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
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import HarvestDayJourney from './HarvestDayJourney';
import { HarvestFlowView } from '../../harvestCampaign/components/HarvestFlowView';
import { campaignDayHasFlow, filterCampaignToDay } from '../../harvestCampaign/daySlice';
import {
  campaignFromHarvestRecords,
  fetchHarvestRecordsForFields,
} from '../../harvestCampaign/hydrateFromRecords';
import { getSeasonStartYear } from '../../utils/harvestSeason';
import { athensCalendarDateKey } from '../../utils/athensDate';
import { openHarvestCampaign } from '../../navigation/intents';
import type { RootStackParamList } from '../../navigation/types';
import { getFieldService } from '../../services/serviceFactory';
import { useAuth } from '../../context/AuthContext';
import PhotoViewer, { type PhotoViewerItem } from '../photos/PhotoViewer';
import { resolvePublicAssetUrl } from '../../config/env';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { radii, spacing, typography } from '../../theme';
import {
  extremeKindFromEventType,
  extremePalette,
  extremeVisualTone,
  formatExtremeDateRange,
} from '../../chronologio/weatherExtreme';

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

const Fact: React.FC<{
  label: string;
  value?: string | null;
  colors: { textTertiary: string; textPrimary: string; surfaceMuted: string; borderLight?: string };
  wide?: boolean;
}> = ({ label, value, colors, wide }) => {
  if (!value) return null;
  return (
    <View
      style={[
        styles.factCard,
        wide ? styles.factWide : null,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight || colors.surfaceMuted },
      ]}
    >
      <Text style={[styles.factLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

/** Kind-aware Chronologio event peek body — mirrors web ChronologioEventDetail richness. */
const ChronologioEventPeekBody: React.FC<Props> = ({ entry, numberLocale }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'money', 'photos', 'fields']);
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const harvestCampaign = useHarvestCampaignOptional();
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

  const media = (entry.media || []).filter(m => isRealMedia(m.url || m.thumbnailUrl));
  const audio = media.filter(m => /audio|voice/i.test(m.type || ''));
  const documents = media.filter(m => /document/i.test(m.type || ''));
  const photos = media.filter(m => !/audio|voice|document/i.test(m.type || ''));
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
  const [fields, setFields] = useState<Field[]>([]);
  const [dayCampaign, setDayCampaign] = useState<HarvestCampaign | null>(null);
  const harvest = entry.details.harvest;
  const note = entry.details.note;
  const expense = entry.details.expense;
  const weather = entry.details.weather;
  const intelligence = entry.details.intelligence;
  const lifecycle = entry.details.lifecycle;
  const task = entry.details.task;
  const expenseChip = presentExpenseChip(entry, i18n.language);

  const isDay = /^Harvest:day:/i.test(entry.id);
  const dayKey = isDay
    ? entry.id.replace(/^Harvest:day:/i, '')
    : athensCalendarDateKey(entry.occurredAt);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id || '';
    if (!userId) {
      setFields([]);
      return;
    }
    void getFieldService()
      .getFields(userId, user?.role || '')
      .then((rows) => {
        if (!cancelled) setFields(rows);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!harvest || kind !== 'harvest') return;
    let cancelled = false;

    const fromLive =
      harvestCampaign && isDay
        ? filterCampaignToDay(harvestCampaign.campaign, dayKey)
        : null;
    if (fromLive && campaignDayHasFlow(fromLive)) {
      setDayCampaign(fromLive);
      return;
    }

    const fieldIds = entry.fieldId
      ? [entry.fieldId]
      : fields.map((f) => f.id).filter(Boolean);
    if (fieldIds.length === 0) {
      setDayCampaign(null);
      return;
    }

    void (async () => {
      try {
        const rows = await fetchHarvestRecordsForFields(fieldIds);
        if (cancelled) return;
        const season = getSeasonStartYear(`${dayKey}T12:00:00`);
        const built = campaignFromHarvestRecords(rows, season, { ignoreSeason: true });
        const slice = filterCampaignToDay(built, dayKey);
        setDayCampaign(campaignDayHasFlow(slice) ? slice : null);
      } catch {
        if (!cancelled) setDayCampaign(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dayKey, entry.fieldId, fields, harvest, harvestCampaign, isDay, kind]);

  const openFieldsTab = () => {
    openHarvestCampaign(navigation, {
      day: dayKey,
      fieldId: entry.fieldId || undefined,
      view: 'season',
    });
  };

  const flowFields =
    fields.length > 0
      ? fields
      : entry.field
        ? ([
            {
              id: entry.fieldId,
              name: entry.field.name,
              color: entry.field.color,
            },
          ] as Field[])
        : [];

  return (
    <View style={styles.wrap}>
      <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>{when}</Text>

      {entry.field?.name ? (
        <View style={[styles.fieldChip, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.fieldDot, { backgroundColor: fieldAccent }]} />
          <Text style={{ color: colors.textPrimary, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
            {friendlyFieldLabel(entry.field.name)}
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
        dayCampaign && flowFields.length > 0 ? (
          <View style={styles.flowEmbed}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
              {t('fields:harvestCampaign.flow.title')}
            </Text>
            <HarvestFlowView
              campaign={dayCampaign}
              fields={flowFields}
              onMarkDone={openFieldsTab}
              onOpenMill={openFieldsTab}
              onOpenOil={openFieldsTab}
            />
          </View>
        ) : (
          <HarvestDayJourney
            harvest={harvest}
            numberLocale={numberLocale}
            fieldName={entry.field?.name}
            fieldAccent={fieldAccent}
          />
        )
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
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: colors.surface }]}>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>
                {presented.shortLabel}
              </Text>
            </View>
            {expenseChip ? (
              <View style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {expenseChip}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {kind === 'weatherPeriod' && weather ? (
        <WeatherMonthSnapshot
          weather={weather}
          eventType={entry.eventType}
          numberLocale={numberLocale}
          locale={i18n.language}
          fieldId={entry.fieldId}
          variant="detail"
        />
      ) : null}

      {kind === 'weatherExtreme' ? (
        <View style={styles.section}>
          {(() => {
            const kindKey =
              weather?.extremeKind || extremeKindFromEventType(entry.eventType) || 'heatwave';
            const palette = extremePalette(extremeVisualTone(kindKey));
            const period = formatExtremeDateRange(
              weather?.extremeStartDate,
              weather?.extremeEndDate,
              i18n.language
            );
            return (
              <>
                <View
                  style={[
                    styles.extremeHero,
                    { backgroundColor: palette.fill },
                  ]}
                >
                  <Text style={[styles.extremeHeroKind, { color: palette.ink }]}>
                    {t(`chronologio:extremeWeather.kinds.${kindKey}`, {
                      defaultValue: entry.title,
                    })}
                  </Text>
                  {entry.summary ? (
                    <Text style={[styles.extremeHeroSummary, { color: palette.ink }]}>
                      {entry.summary}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.extremeFactGrid}>
                  {period ? (
                    <View style={[styles.extremeFact, { backgroundColor: colors.surfaceMuted }]}>
                      <Text style={[styles.extremeFactLabel, { color: colors.textTertiary }]}>
                        {t('chronologio:extremeWeather.period')}
                      </Text>
                      <Text style={[styles.extremeFactValue, { color: colors.textPrimary }]}>
                        {period}
                      </Text>
                    </View>
                  ) : null}
                  {weather?.streakDays != null ? (
                    <View style={[styles.extremeFact, { backgroundColor: colors.surfaceMuted }]}>
                      <Text style={[styles.extremeFactLabel, { color: colors.textTertiary }]}>
                        {t('chronologio:extremeWeather.streak')}
                      </Text>
                      <Text style={[styles.extremeFactValue, { color: colors.textPrimary }]}>
                        {t('chronologio:extremeWeather.days', { count: weather.streakDays })}
                      </Text>
                    </View>
                  ) : null}
                  {weather?.temperatureMin != null ? (
                    <View style={[styles.extremeFact, { backgroundColor: colors.surfaceMuted }]}>
                      <Text style={[styles.extremeFactLabel, { color: colors.textTertiary }]}>
                        {t('chronologio:extremeWeather.minTemp')}
                      </Text>
                      <Text style={[styles.extremeFactValue, { color: colors.textPrimary }]}>
                        {weather.temperatureMin.toLocaleString(numberLocale, {
                          maximumFractionDigits: 1,
                        })}
                        °C
                      </Text>
                    </View>
                  ) : null}
                  {weather?.temperatureMax != null ? (
                    <View style={[styles.extremeFact, { backgroundColor: colors.surfaceMuted }]}>
                      <Text style={[styles.extremeFactLabel, { color: colors.textTertiary }]}>
                        {t('chronologio:extremeWeather.maxTemp')}
                      </Text>
                      <Text style={[styles.extremeFactValue, { color: colors.textPrimary }]}>
                        {weather.temperatureMax.toLocaleString(numberLocale, {
                          maximumFractionDigits: 1,
                        })}
                        °C
                      </Text>
                    </View>
                  ) : null}
                  {weather?.rainfallMm != null ? (
                    <View style={[styles.extremeFact, { backgroundColor: colors.surfaceMuted }]}>
                      <Text style={[styles.extremeFactLabel, { color: colors.textTertiary }]}>
                        {t('chronologio:extremeWeather.rain')}
                      </Text>
                      <Text style={[styles.extremeFactValue, { color: colors.textPrimary }]}>
                        {weather.rainfallMm.toLocaleString(numberLocale, {
                          maximumFractionDigits: 1,
                        })}{' '}
                        mm
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            );
          })()}
        </View>
      ) : null}

      {kind === 'task' ? (
        <View style={styles.section}>
          <View style={styles.chipRow}>
            {task?.status ? (
              <View style={[styles.chip, { backgroundColor: soft }]}>
                <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>
                  {t(`common:taskStatus.${String(task.status).toLowerCase()}`, {
                    defaultValue: String(task.status),
                  })}
                </Text>
              </View>
            ) : null}
            {task?.taskType ? (
              <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {task.taskType}
                </Text>
              </View>
            ) : null}
          </View>
          {(task?.startDate || task?.endDate) ? (
            <View style={styles.factGrid}>
              {task.startDate ? (
                <Fact
                  label={t('chronologio:drawer.actualStart', { defaultValue: 'Started' })}
                  value={new Date(task.startDate).toLocaleString(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    hour12: false,
                  })}
                  colors={colors}
                />
              ) : null}
              {task.endDate ? (
                <Fact
                  label={t('chronologio:drawer.actualEnd', { defaultValue: 'Ended' })}
                  value={new Date(task.endDate).toLocaleString(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    hour12: false,
                  })}
                  colors={colors}
                />
              ) : null}
            </View>
          ) : null}
          {entry.summary ? (
            <View style={[styles.noteCard, { backgroundColor: soft, borderColor: accent }]}>
              <Text style={[styles.bodyText, { color: colors.textPrimary }]}>{entry.summary}</Text>
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
            <View style={[styles.pinRow, { backgroundColor: soft }]}>
              <Ionicons name="pin" size={14} color={accent} />
              <Text style={{ color: accent, fontWeight: '700' }}>
                {t('chronologio:pinned', { defaultValue: 'Pinned' })}
              </Text>
            </View>
          ) : null}
          <View style={[styles.noteCard, { backgroundColor: soft, borderColor: accent }]}>
            <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
              {note?.bodyPreview || entry.summary || presented.label}
            </Text>
          </View>
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
        {kind !== 'observation' && kind !== 'task' && kind !== 'money' ? (
          <Fact label={t('chronologio:living.actor')} value={actor} colors={colors} />
        ) : null}
        {kind === 'observation' ? (
          <>
            <Fact label={t('chronologio:living.actor')} value={actor} colors={colors} />
            <Fact
              label={t('chronologio:drawer.exactTime', { defaultValue: 'Time' })}
              value={when}
              colors={colors}
            />
          </>
        ) : null}
        {kind === 'task' && (task?.assigneeName || actor) ? (
          <Fact
            label={t('chronologio:drawer.personOnce', { defaultValue: t('chronologio:living.actor') })}
            value={task?.assigneeName || actor}
            colors={colors}
          />
        ) : null}
        {kind === 'money' ? (
          <>
            {expense?.description ? (
              <View style={[styles.noteCard, { backgroundColor: soft, borderColor: accent, marginBottom: 4, width: '100%' }]}>
                <Text style={[styles.bodyText, { color: colors.textPrimary }]}>{expense.description}</Text>
              </View>
            ) : null}
            <Fact
              label={t('chronologio:drawer.moneyCategory', { defaultValue: 'Category' })}
              value={expense?.expenseCategoryLabel || expense?.expenseCategory}
              colors={colors}
            />
            <Fact label={t('chronologio:living.actor')} value={actor} colors={colors} />
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
      {audio.map((m) => {
        const src = resolvePublicAssetUrl(m.url) || m.url;
        if (!src) return null;
        return (
          <Pressable
            key={m.id}
            style={[styles.docLink, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
            onPress={() => void Linking.openURL(src)}
          >
            <Ionicons name="mic-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>
              {t('chronologio:drawer.voice', { defaultValue: 'Voice message' })}
            </Text>
          </Pressable>
        );
      })}
      {documents.map((m) => {
        const src = resolvePublicAssetUrl(m.url) || m.url;
        if (!src) return null;
        return (
          <Pressable
            key={m.id}
            style={[styles.docLink, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
            onPress={() => void Linking.openURL(src)}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={2}>
              {entry.summary || t('chronologio:drawer.document', { defaultValue: 'Document' })}
            </Text>
          </Pressable>
        );
      })}
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
    addNote?: () => void;
    edit?: () => void;
    remove?: () => void;
  },
  caps?: { canEdit: boolean; removeAction: 'edit' | 'delete' | 'void' | 'cancel' | null }
): EventPeekFooterAction[] => {
  const kind = chronologioDetailKind(entry);
  const actions: EventPeekFooterAction[] = [];
  const removeLabel =
    caps?.removeAction === 'cancel'
      ? t('chronologio:drawer.cancelTask', { defaultValue: t('common:cancel') })
      : caps?.removeAction === 'void'
        ? t('chronologio:drawer.void', { defaultValue: 'Void' })
        : t('common:delete');

  if (entry.sourceType === 'Photo' && navigate.openPhoto) {
    actions.push({
      label: t('chronologio:drawer.openPhoto', { defaultValue: 'Open photo' }),
      onPress: navigate.openPhoto,
      primary: true,
    });
    if (caps?.canEdit && navigate.edit) {
      actions.push({ label: t('common:edit'), onPress: navigate.edit });
    }
    if (caps?.removeAction && navigate.remove) {
      actions.push({ label: removeLabel, onPress: navigate.remove });
    }
    return actions;
  }
  if (kind === 'task') {
    actions.push({
      label: t('chronologio:drawer.openTask', { defaultValue: 'Open task' }),
      onPress: navigate.openTask,
      primary: true,
    });
    if (caps?.canEdit && navigate.edit) {
      actions.push({ label: t('common:edit'), onPress: navigate.edit });
    }
    if (navigate.addNote) {
      actions.push({
        label: t('chronologio:drawer.addNote', { defaultValue: 'Add a note' }),
        onPress: navigate.addNote,
      });
    }
    if (caps?.removeAction && navigate.remove) {
      actions.push({ label: removeLabel, onPress: navigate.remove });
    }
  } else if (kind === 'money') {
    actions.push({
      label: t('chronologio:drawer.openMoney', { defaultValue: 'Open in Money' }),
      onPress: navigate.openMoney,
      primary: true,
    });
    if (caps?.canEdit && navigate.edit) {
      actions.push({ label: t('common:edit'), onPress: navigate.edit });
    }
    if (caps?.removeAction && navigate.remove) {
      actions.push({ label: removeLabel, onPress: navigate.remove });
    }
  } else if (kind === 'harvest') {
    actions.push({
      label: t('chronologio:living.openFull'),
      onPress: navigate.openHarvest,
      primary: true,
    });
    if (caps?.canEdit && navigate.edit) {
      actions.push({ label: t('common:edit'), onPress: navigate.edit });
    }
    if (caps?.removeAction && navigate.remove) {
      actions.push({ label: removeLabel, onPress: navigate.remove });
    }
  } else if (kind === 'weatherPeriod' || kind === 'weatherExtreme') {
    actions.push({
      label: t('chronologio:weatherReview.openCharts'),
      onPress: navigate.openWeather,
      primary: true,
    });
  } else if (kind === 'observation') {
    if (entry.sourceType === 'Note' || entry.category === 'note') {
      if (navigate.createTask) {
        actions.push({
          label: t('chronologio:drawer.createTask', {
            defaultValue: 'Create work from this observation',
          }),
          onPress: navigate.createTask,
          primary: true,
        });
      }
      if (caps?.canEdit && navigate.edit) {
        actions.push({
          label: t('common:edit'),
          onPress: navigate.edit,
          primary: !navigate.createTask,
        });
      }
      if (caps?.removeAction && navigate.remove) {
        actions.push({ label: removeLabel, onPress: navigate.remove });
      }
    } else {
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
    }
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
  flowEmbed: { marginBottom: 12 },
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
  extremeHero: {
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 10,
  },
  extremeHeroKind: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  extremeHeroSummary: { fontSize: 13, lineHeight: 18, opacity: 0.92 },
  extremeFactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extremeFact: {
    minWidth: '42%',
    flexGrow: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  extremeFactLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  extremeFactValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  moneyHero: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  section: { gap: 10, marginBottom: 14 },
  sectionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  bodyText: { fontSize: 16, lineHeight: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  warningPanel: {
    borderRadius: radii.card,
    padding: 14,
    borderLeftWidth: 2,
    marginBottom: 12,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factCard: {
    minWidth: '42%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  factWide: { minWidth: '100%', flexBasis: '100%' },
  fact: { gap: 2 },
  factLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  factValue: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  photo: { width: 140, height: 100, borderRadius: radii.card, marginRight: 8 },
  docLink: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ChronologioEventPeekBody;
