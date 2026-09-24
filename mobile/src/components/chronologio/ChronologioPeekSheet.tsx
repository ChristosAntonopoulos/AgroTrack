import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useAuth } from '../../context/AuthContext';
import { spacing, radii } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { openHarvestCampaign } from '../../navigation/intents';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import {
  majorMonthsForYear,
  monthChapterFacts,
  periodEventCount,
  weatherFactBits,
  yearFixedMetrics,
} from '../../utils/summaryFacts';
import { harvestHasResult } from '../../chronologio/monthPresentation';
import {
  harvestYearCopyKey,
  yearComparison,
  yearComparisonCopyKey,
  yearHeadline,
} from '../../chronologio/yearPresentation';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
import type { DayWeatherInput } from '../../chronologio/dayWeather';
import { resolveFieldColor } from '../../utils/fieldColors';
import { accentColorsForToken } from '../../utils/chronologioCategoryAccents';
import { detailAccentToken, chronologioDetailKind } from '../../chronologio/detailKind';
import {
  chronologioEntryCapabilities,
  chronologioHarvestId,
  chronologioMobileDestination,
  chronologioMoneyTxId,
  chronologioNoteId,
  chronologioPhotoId,
  chronologioTaskId,
} from '../../chronologio/entryDestination';
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import ChronologioDayWeatherDetail from './ChronologioDayWeatherDetail';
import ChronologioRecentList from './ChronologioRecentList';
import ChronologioEventPeekBody, {
  eventPeekFooterActions,
} from './ChronologioEventPeekBody';
import { presentChronologioEvent } from '../../chronologio/eventPresentation';
import Sheet from '../ui/Sheet';
import NoteSheet from '../dashboard/NoteSheet';
import type { Note } from '../../services/noteService';
import {
  getFieldWorkService,
  getFinancialTransactionService,
  getHarvestService,
  getNoteService,
  getPhotoService,
} from '../../services/serviceFactory';
import { CAPTURE_SAVED_EVENT } from '../../capture/types';

export type ChronologioPeekTarget =
  | { mode: 'event'; entry: ChronologioEntry }
  | {
      mode: 'month';
      summary: ChronologioMonthSummary;
      recent: ChronologioEntry[];
      loadingRecent?: boolean;
      focus?: 'work' | 'money' | 'harvest' | 'observation';
    }
  | {
      mode: 'year';
      summary: ChronologioPeriodSummary;
      months: ChronologioMonthSummary[];
      previous?: ChronologioPeriodSummary | null;
      previousMonths?: ChronologioMonthSummary[];
    }
  | {
      mode: 'monthWeather';
      year: number;
      month: number;
      reviews: ChronologioEntry[];
      loading?: boolean;
    }
  | {
      mode: 'dayWeather';
      year: number;
      month: number;
      dateKey: string;
      weather: DayWeatherInput | null;
      events: ChronologioEntry[];
      relatedFieldNames?: string[];
      sharedWeatherGrid?: boolean;
    };

type FieldOption = { id: string; name: string; color?: string | null };

type Props = {
  peek: ChronologioPeekTarget | null;
  numberLocale: string;
  fieldOptions?: FieldOption[];
  onClose: () => void;
  onMutated?: () => void;
  onDrillToMonths?: (periodYear: number) => void;
  onDrillToDays?: (year: number, month: number) => void;
  onSelectRecent?: (entry: ChronologioEntry) => void;
  onOpenMonthWeather?: (year: number, month: number) => void;
};

const ChronologioPeekSheet: React.FC<Props> = ({
  peek,
  numberLocale,
  fieldOptions = [],
  onClose,
  onMutated,
  onDrillToMonths,
  onDrillToDays,
  onSelectRecent,
  onOpenMonthWeather,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'money']);
  const { colors, tapMin } = useTheme();
  const capture = useCaptureOptional();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tt = (key: string, opts?: Record<string, string | number>) =>
    t(key, opts as Record<string, unknown>);

  const entry = peek?.mode === 'event' ? peek.entry : null;
  const kind = entry ? chronologioDetailKind(entry) : null;
  const caps = entry
    ? chronologioEntryCapabilities(entry, { userId: user?.id, role: user?.role })
    : { canEdit: false, removeAction: null };
  const isPeriodReview = kind === 'weatherPeriod';
  const eventAccent = entry
    ? accentColorsForToken(colors, detailAccentToken(entry)).accent
    : colors.primary;

  const [weatherFieldId, setWeatherFieldId] = useState<string | undefined>();
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (peek?.mode === 'monthWeather' && peek.reviews[0]?.fieldId) {
      setWeatherFieldId(peek.reviews[0].fieldId);
    }
  }, [peek]);

  const selectedWeatherReview = useMemo(() => {
    if (peek?.mode !== 'monthWeather') return null;
    return (
      peek.reviews.find(r => r.fieldId === weatherFieldId) || peek.reviews[0] || null
    );
  }, [peek, weatherFieldId]);

  const monthTitle = (m: ChronologioMonthSummary) =>
    new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const weatherMonthTitle =
    peek?.mode === 'monthWeather'
      ? new Date(Date.UTC(peek.year, peek.month - 1, 1)).toLocaleDateString(i18n.language, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '';

  const eventPresentation =
    peek?.mode === 'event' ? presentChronologioEvent(peek.entry, i18n.language) : null;

  const headerTitle =
    peek?.mode === 'event'
      ? eventPresentation?.label || peek.entry.title
      : peek?.mode === 'month'
        ? peek.focus
          ? t(`monthView.focusTitle.${peek.focus}`, { month: monthTitle(peek.summary) })
          : monthTitle(peek.summary)
        : peek?.mode === 'year'
          ? t('drawer.agriYear', {
              year: peek.summary.periodYear,
              defaultValue: `Agricultural year ${peek.summary.periodYear}`,
            })
          : peek?.mode === 'monthWeather'
            ? weatherMonthTitle
            : peek?.mode === 'dayWeather'
              ? new Date(`${peek.dateKey}T12:00:00`).toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
            : '';

  const yearSubtitle =
    peek?.mode === 'year'
      ? agriculturalYearRangeLabel(peek.summary.periodYear, i18n.language)
      : undefined;

  const headerMeta =
    peek?.mode === 'event'
      ? isPeriodReview
        ? t('weatherPeek.kicker')
        : eventPresentation?.shortLabel || ''
      : peek?.mode === 'month'
        ? peek.focus
          ? t(`monthView.focusKicker.${peek.focus}`)
          : t('living.peekMonth')
        : peek?.mode === 'year'
          ? t('living.peekYear')
          : peek?.mode === 'monthWeather'
            ? t('weatherReview.pickGrove', { defaultValue: 'Choose a grove' })
            : peek?.mode === 'dayWeather'
              ? t('living.peekWeather')
            : '';

  const monthSubtitle =
    peek?.mode === 'month' && peek.summary.from && peek.summary.to
      ? `${new Date(peek.summary.from).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
        })} – ${new Date(peek.summary.to).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : undefined;

  const sheetAccent =
    peek?.mode === 'monthWeather' || peek?.mode === 'dayWeather' || isPeriodReview
      ? colors.weatherBlue
      : peek?.mode === 'event'
        ? eventAccent
        : colors.primary;

  const navigateFromEntry = (target: ChronologioEntry) => {
    const dest = chronologioMobileDestination(target);
    if (dest.kind === 'noteEdit') {
      void openNoteEditor(dest.noteId, dest.fieldId);
      return;
    }
    onClose();
    if (dest.kind === 'TaskDetail') {
      navigation.navigate('TaskDetail', { taskId: dest.taskId });
    } else if (dest.kind === 'Money') {
      navigation.navigate('Money', { fieldId: dest.fieldId, tx: dest.tx });
    } else if (dest.kind === 'Photos') {
      navigation.navigate('Photos', { photoId: dest.photoId, fieldId: dest.fieldId });
    } else if (dest.kind === 'HarvestCampaign') {
      openHarvestCampaign(navigation, {
        fieldId: dest.fieldId,
        harvestId: dest.harvestId,
        day: dest.day,
        view: dest.view,
      });
    } else if (dest.kind === 'FieldWeatherVegetation') {
      navigation.navigate('FieldWeatherVegetation', { fieldId: dest.fieldId });
    } else if (dest.kind === 'FieldDetail') {
      navigation.navigate('FieldDetail', { fieldId: dest.fieldId });
    }
  };

  const notifyMutated = () => {
    DeviceEventEmitter.emit(CAPTURE_SAVED_EVENT);
    onMutated?.();
  };

  const openNoteEditor = async (noteId: string, fieldId: string) => {
    try {
      const notes = await getNoteService().getNotes({ fieldId: fieldId || undefined });
      const note = notes.find((n) => n.id === noteId);
      if (note) setEditingNote(note);
    } catch {
      // keep peek
    }
  };

  const removeEntry = () => {
    if (!entry || !caps.removeAction) return;
    const action = caps.removeAction;
    const title =
      action === 'cancel'
        ? t('chronologio:drawer.cancelConfirm', { defaultValue: 'Cancel this work?' })
        : action === 'void'
          ? t('chronologio:drawer.voidConfirm', { defaultValue: 'Void this record?' })
          : t('chronologio:drawer.deleteConfirm', { defaultValue: 'Delete this record?' });

    Alert.alert(title, undefined, [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text:
          action === 'cancel'
            ? t('chronologio:drawer.cancelTask', { defaultValue: t('common:cancel') })
            : action === 'void'
              ? t('chronologio:drawer.void', { defaultValue: 'Void' })
              : t('common:delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              if (action === 'delete' && (entry.sourceType === 'Note' || entry.category === 'note')) {
                const id = chronologioNoteId(entry);
                if (id) await getNoteService().deleteNote(id);
              } else if (
                action === 'delete' &&
                (entry.sourceType === 'Photo' || entry.category === 'photo')
              ) {
                const id = chronologioPhotoId(entry);
                if (id) await getPhotoService().delete(id);
              } else if (action === 'void' && kind === 'money') {
                const id = chronologioMoneyTxId(entry);
                if (id) {
                  const tx = await getFinancialTransactionService().getById(id);
                  if (tx.status === 'draft') await getFinancialTransactionService().deleteDraft(id);
                  else if (tx.status === 'posted') {
                    await getFinancialTransactionService().void(
                      id,
                      t('money:voidReasonPrompt', { defaultValue: 'Voided from Chronologio' })
                    );
                  }
                }
              } else if (action === 'void' && kind === 'harvest') {
                const id = chronologioHarvestId(entry);
                if (id) await getHarvestService().void(id);
              } else if (action === 'cancel' && kind === 'task') {
                const id = chronologioTaskId(entry);
                if (id) await getFieldWorkService().cancelFieldTask(id);
              }
              notifyMutated();
              onClose();
            } catch {
              Alert.alert(
                t('chronologio:drawer.mutateFailed', { defaultValue: 'Could not update that record.' })
              );
            }
          })();
        },
      },
    ]);
  };

  const eventActions =
    entry && peek?.mode === 'event'
      ? eventPeekFooterActions(
          entry,
          t as (key: string, opts?: Record<string, unknown>) => string,
          {
            openTask: () => navigateFromEntry(entry),
            openMoney: () => navigateFromEntry(entry),
            openHarvest: () => navigateFromEntry(entry),
            openWeather: () => navigateFromEntry(entry),
            openField: () => navigateFromEntry(entry),
            openPhoto: () => navigateFromEntry(entry),
            edit: () => navigateFromEntry(entry),
            remove: removeEntry,
            createTask: () => {
              onClose();
              navigation.navigate('CreateTask', {
                fieldId: entry.fieldId,
                scheduledStart: entry.occurredAt,
              });
            },
            addNote: capture
              ? () => {
                  onClose();
                  capture.openCapture({
                    preferredType: 'observation',
                    fieldId: entry.fieldId,
                    taskId: entry.details.task?.taskId,
                    occurredAt: entry.occurredAt,
                  });
                }
              : undefined,
          },
          caps
        )
      : [];

  const footer =
    peek?.mode === 'event' && eventActions.length > 0 ? (
      <View style={{ gap: spacing.sm }}>
        {eventActions.map(action => (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: action.primary ? sheetAccent : colors.surface,
                borderWidth: action.primary ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.borderLight,
                minHeight: Math.max(tapMin, 44),
              },
            ]}
            onPress={action.onPress}
          >
            <Text
              style={[
                styles.primaryBtnText,
                { color: action.primary ? colors.onOlive : colors.textPrimary },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : peek?.mode === 'month' ? (
      <View style={{ gap: spacing.sm }}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
          ]}
          onPress={() => onDrillToDays?.(peek.summary.year, peek.summary.month)}
        >
          <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
            {t('living.drillToDays', { month: monthTitle(peek.summary) })}
          </Text>
        </TouchableOpacity>
        {onOpenMonthWeather &&
        (peek.summary.rainfallMm != null ||
          peek.summary.temperatureMin != null ||
          peek.summary.temperatureMax != null) ? (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.borderLight,
                minHeight: Math.max(tapMin, 44),
              },
            ]}
            onPress={() => onOpenMonthWeather(peek.summary.year, peek.summary.month)}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textPrimary }]}>
              {t('living.weatherButton')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ) : peek?.mode === 'year' ? (
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
        ]}
        onPress={() => onDrillToMonths?.(peek.summary.periodYear)}
      >
        <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
          {t('living.drillToMonths', { year: peek.summary.periodYear })}
        </Text>
      </TouchableOpacity>
    ) : peek?.mode === 'monthWeather' && selectedWeatherReview ? (
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.weatherBlue, minHeight: Math.max(tapMin, 44) },
        ]}
        onPress={() => {
          onClose();
          navigation.navigate('FieldWeatherVegetation', {
            fieldId: selectedWeatherReview.fieldId,
          });
        }}
      >
        <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
          {t('weatherReview.openCharts')}
        </Text>
      </TouchableOpacity>
    ) : null;

  return (
    <>
    <Sheet
      open={Boolean(peek)}
      onClose={onClose}
      edge="end"
      size={
        peek?.mode === 'monthWeather' ||
        peek?.mode === 'dayWeather' ||
        isPeriodReview ||
        peek?.mode === 'month' ||
        peek?.mode === 'year'
          ? 'lg'
          : 'md'
      }
      accent
      accentColor={sheetAccent}
      kicker={headerMeta}
      title={headerTitle || undefined}
      subtitle={monthSubtitle || yearSubtitle}
      icon={
        peek?.mode === 'monthWeather' || peek?.mode === 'dayWeather' || isPeriodReview ? (
          <Ionicons name="rainy-outline" size={22} color={colors.weatherBlue} />
        ) : peek?.mode === 'month' ? (
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        ) : peek?.mode === 'year' ? (
          <Ionicons name="book-outline" size={22} color={colors.primary} />
        ) : undefined
      }
      footer={footer}
    >
      {peek?.mode === 'event' ? (
        <ChronologioEventPeekBody entry={peek.entry} numberLocale={numberLocale} />
      ) : null}

      {peek?.mode === 'month' ? (
        <>
          {!peek.focus ? (
            <>
          <View style={styles.metricsRow}>
            {yearFixedMetrics(peek.summary, numberLocale, tt).map(m => (
              <View key={m.label} style={styles.metricCell}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('monthView.harvest')}
            </Text>
            {harvestHasResult(peek.summary) ? (
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
                {`${Math.round(peek.summary.oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`}
                {peek.summary.oilKg > 0
                  ? ` · ${peek.summary.oilKg.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })} ${t('oilUnit')}`
                  : ''}
                {peek.summary.oilYieldPercent != null
                  ? ` · ${peek.summary.oilYieldPercent.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })}%`
                  : ''}
              </Text>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                {peek.summary.harvestCount > 0
                  ? t('monthView.harvestNoResult')
                  : t('monthView.harvestNotStarted')}
              </Text>
            )}
          </View>

          {monthChapterFacts(peek.summary, numberLocale, tt).length > 0 ? (
            <Text style={[styles.factsLine, { color: colors.textSecondary }]}>
              {monthChapterFacts(peek.summary, numberLocale, tt).join(' · ')}
            </Text>
          ) : (
            <Text style={[styles.factsLine, { color: colors.textTertiary }]}>
              {t('living.emptyPeriod')}
            </Text>
          )}

          {weatherFactBits(peek.summary, tt).length > 0 ||
          peek.summary.temperatureMin != null ||
          peek.summary.temperatureMax != null ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekWeather')}
              </Text>
              {weatherFactBits(peek.summary, tt).length > 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  {weatherFactBits(peek.summary, tt).join(' · ')}
                </Text>
              ) : null}
              {peek.summary.temperatureMin != null || peek.summary.temperatureMax != null ? (
                <Text style={{ color: colors.textTertiary, marginTop: 4, fontVariant: ['tabular-nums'] }}>
                  {peek.summary.temperatureMin != null
                    ? `${Math.round(peek.summary.temperatureMin)}°`
                    : '—'}
                  {' – '}
                  {peek.summary.temperatureMax != null
                    ? `${Math.round(peek.summary.temperatureMax)}°`
                    : '—'}
                </Text>
              ) : null}
            </View>
          ) : null}

          {(peek.summary.highlightTitles?.length || peek.summary.observationHighlight) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekHighlights')}
              </Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 2).join(' · ') ||
                  peek.summary.observationHighlight}
              </Text>
              {peek.summary.observationHighlight && peek.summary.highlightTitles?.length ? (
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                  {peek.summary.observationHighlight}
                </Text>
              ) : null}
              {peek.summary.dominantWorkLabel ? (
                <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
                  {t('monthView.dominantWork')}: {peek.summary.dominantWorkLabel}
                </Text>
              ) : null}
            </View>
          )}
            </>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {peek.focus ? t(`monthView.focusKicker.${peek.focus}`) : t('living.peekRecent')}
            </Text>
            {peek.loadingRecent ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
            ) : (
              <ChronologioRecentList
                entries={peek.recent}
                limit={peek.focus ? 12 : 5}
                emptyLabel={t('living.emptyPeriod')}
                onPressEntry={e => onSelectRecent?.(e)}
              />
            )}
          </View>
        </>
      ) : null}

      {peek?.mode === 'year' ? (
        <>
          {(() => {
            const comparison = yearComparison(peek.summary, peek.previous, {
              currentMonths: peek.months,
              previousMonths: peek.previousMonths,
            });
            const harvestKey = harvestYearCopyKey(peek.summary);
            const headline = yearHeadline(peek.summary);
            return (
              <View style={[styles.section, { marginTop: 0 }]}>
                <Text style={[styles.heroLine, { color: colors.textPrimary }]}>
                  {comparison
                    ? t(yearComparisonCopyKey(comparison), {
                        context: comparison.scope === 'ytd' ? 'ytd' : undefined,
                        pct: Math.abs(comparison.percent),
                        points: comparison.percent.toLocaleString(numberLocale, {
                          signDisplay: 'exceptZero',
                          maximumFractionDigits: 1,
                        }),
                        year: comparison.previousYear,
                      })
                    : harvestKey === 'result'
                      ? t('yearView.mainResult')
                      : harvestKey === 'noResult'
                        ? t('monthView.harvestNoResult')
                        : t('yearView.harvestNotStarted')}
                </Text>
                {headline ? (
                  <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{headline}</Text>
                ) : null}
              </View>
            );
          })()}

          <View style={styles.metricsRow}>
            {yearFixedMetrics(peek.summary, numberLocale, tt).map(m => (
              <View key={m.label} style={styles.metricCell}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('monthView.harvest')}
            </Text>
            {harvestHasResult(peek.summary) ? (
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
                {`${Math.round(peek.summary.oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`}
                {peek.summary.oilKg > 0
                  ? ` · ${peek.summary.oilKg.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })} ${t('oilUnit')}`
                  : ''}
                {peek.summary.oilYieldPercent != null
                  ? ` · ${peek.summary.oilYieldPercent.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })}%`
                  : ''}
              </Text>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                {harvestYearCopyKey(peek.summary) === 'noResult'
                  ? t('monthView.harvestNoResult')
                  : t('yearView.harvestNotStarted')}
              </Text>
            )}
          </View>

          {weatherFactBits(peek.summary, tt).length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekWeather')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {weatherFactBits(peek.summary, tt).join(' · ')}
              </Text>
            </View>
          ) : null}

          {(peek.summary.highlightTitles?.length || peek.summary.observationHighlight) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekHighlights')}
              </Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 3).join(' · ') ||
                  peek.summary.observationHighlight}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('living.peekMajorMonths')}
            </Text>
            {majorMonthsForYear(peek.months).length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('living.emptyPeriod')}</Text>
            ) : (
              majorMonthsForYear(peek.months).map(m => (
                <Pressable
                  key={m.key}
                  onPress={() => onDrillToDays?.(m.year, m.month)}
                  style={({ pressed }) => [
                    styles.majorMonthRow,
                    {
                      backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }}>
                    {monthTitle(m)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {t('living.monthWorks', { count: periodEventCount(m) })}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </>
      ) : null}

      {peek?.mode === 'monthWeather' ? (
        <View style={{ gap: 14 }}>
          {peek.loading ? (
            <ActivityIndicator color={colors.weatherBlue} />
          ) : peek.reviews.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('living.emptyMonthWeather')}</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fieldTabs}
              >
                {peek.reviews.map(review => {
                  const selected = review.fieldId === selectedWeatherReview?.fieldId;
                  const fieldColor = resolveFieldColor(review.field?.color, review.fieldId);
                  return (
                    <Pressable
                      key={review.id}
                      onPress={() => setWeatherFieldId(review.fieldId)}
                      style={[
                        styles.fieldTab,
                        {
                          minHeight: Math.max(40, tapMin * 0.85),
                          backgroundColor: selected ? colors.eventWeatherSoft : colors.surface,
                          borderColor: selected ? colors.weatherBlue : colors.borderLight,
                        },
                      ]}
                    >
                      <View style={[styles.fieldDot, { backgroundColor: fieldColor }]} />
                      <Text
                        style={{
                          color: selected ? colors.eventWeather : colors.textSecondary,
                          fontWeight: selected ? '700' : '600',
                          fontSize: 13,
                        }}
                        numberOfLines={1}
                      >
                        {review.field?.name || '—'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedWeatherReview?.details.weather ? (
                <WeatherMonthSnapshot
                  weather={selectedWeatherReview.details.weather}
                  eventType={selectedWeatherReview.eventType}
                  numberLocale={numberLocale}
                  locale={i18n.language}
                  fieldId={selectedWeatherReview.fieldId}
                  variant="hero"
                  onOpen={() => selectedWeatherReview && onSelectRecent?.(selectedWeatherReview)}
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {peek?.mode === 'dayWeather' ? (
        <ChronologioDayWeatherDetail
          dateKey={peek.dateKey}
          weather={peek.weather}
          events={peek.events}
          numberLocale={numberLocale}
          sharedWeatherGrid={peek.sharedWeatherGrid}
          relatedFieldNames={peek.relatedFieldNames}
          onSelectEvent={onSelectRecent}
        />
      ) : null}
    </Sheet>
    <NoteSheet
      visible={Boolean(editingNote)}
      note={editingNote || undefined}
      fields={fieldOptions}
      onClose={() => setEditingNote(null)}
      onChanged={async () => {
        setEditingNote(null);
        notifyMutated();
        onClose();
      }}
    />
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 16, gap: 6 },
  sectionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metricCell: { minWidth: '28%', flexGrow: 1, gap: 2 },
  metricValue: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 11, fontWeight: '500' },
  factsLine: { marginTop: 12, fontSize: 13, lineHeight: 18 },
  heroLine: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  majorMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { fontWeight: '700' },
  fieldTabs: { gap: 8, paddingVertical: 2 },
  fieldTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  fieldDot: { width: 8, height: 8, borderRadius: 99 },
});

export default ChronologioPeekSheet;
