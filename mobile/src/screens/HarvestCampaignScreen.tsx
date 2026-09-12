import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useHarvestCampaign } from '../context/HarvestCampaignContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { getHarvestService } from '../services/serviceFactory';
import { reportsService, type HarvestReportRecord } from '../services/reportsService';
import { weatherService } from '../services/weatherService';
import type { FieldWeather } from '../services/geospatialService';
import type { Field } from '../services/fieldService';
import { overlappingCalendarYears } from '../ravdos/season';
import { formatSeasonLabel, getSeasonBounds, isDateInSeason } from '../utils/harvestSeason';
import { athensCalendarDateKey } from '../utils/athensDate';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatFieldArea } from '../utils/fieldGeo';
import { formatKg } from '../utils/harvestUtils';
import { nextGroveId, logForDate, skipReasons } from '../harvestCampaign/storage';
import { buildWeekStrip, type HarvestDayRank } from '../harvestCampaign/weatherRank';
import type { HarvestSkipReason } from '../harvestCampaign/types';
import { RootStackParamList } from '../navigation/types';
import { spacing, radii, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const rankColor = (
  rank: HarvestDayRank,
  colors: { success: string; warning: string; error: string; textTertiary: string }
) => {
  if (rank === 'good') return colors.success;
  if (rank === 'caution') return colors.warning;
  if (rank === 'unsuitable') return colors.error;
  return colors.textTertiary;
};

const HarvestCampaignScreen = () => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common', 'capture']);
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const capture = useCaptureOptional();
  const { fields, loading: fieldsLoading, refresh: refreshFields } = useFields();
  const { campaign, seasonStartYear, isLive, isActive, start, stop, pause, resume, reorder, markGroveDone, logDay } =
    useHarvestCampaign();

  const [harvests, setHarvests] = useState<HarvestReportRecord[]>([]);
  const [weather, setWeather] = useState<FieldWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [millName, setMillName] = useState('');
  const [expectedLitres, setExpectedLitres] = useState('');
  const [oliveKg, setOliveKg] = useState('');
  const [people, setPeople] = useState('');
  const [hours, setHours] = useState('');
  const [logFieldId, setLogFieldId] = useState('');
  const [wentToMill, setWentToMill] = useState(false);
  const [oilLitres, setOilLitres] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [skipReason, setSkipReason] = useState<HarvestSkipReason>('rain');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bounds = useMemo(() => getSeasonBounds(seasonStartYear), [seasonStartYear]);
  const today = athensCalendarDateKey(new Date());
  const localeTag = i18n.language?.startsWith('el') ? 'el-GR' : 'en-US';
  const isClosed = campaign.status === 'closed';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const years = overlappingCalendarYears(seasonStartYear);
      const harvestChunks = await Promise.all(
        years.map((y) => reportsService.getHarvestRecords({ season: y }).catch(() => [] as HarvestReportRecord[]))
      );
      setHarvests(harvestChunks.flat());
      const weatherField = campaign.fieldOrder[0] || fields[0]?.id;
      if (weatherField) {
        const snapshot = await weatherService.getFieldWeather(weatherField).catch(() => null);
        setWeather(snapshot);
      } else {
        setWeather(null);
      }
    } finally {
      setLoading(false);
    }
  }, [campaign.fieldOrder, seasonStartYear, fields]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      void load();
    });
    return () => sub.remove();
  }, [load]);

  const { refreshing, onRefresh } = useRefresh(async () => {
    await Promise.all([refreshFields(), load()]);
  });

  const harvestableFields = useMemo(() => {
    const usable = fields.filter((field) => field.status !== 'Draft' && field.status !== 'Archived');
    return usable.length > 0 ? usable : fields.filter((field) => field.status !== 'Archived');
  }, [fields]);

  const harvestableById = useMemo(
    () => new Map(harvestableFields.map((field) => [field.id, field])),
    [harvestableFields]
  );

  const pickedFields = pickedIds
    .map((id) => harvestableById.get(id))
    .filter((field): field is Field => Boolean(field));
  const restFields = harvestableFields.filter((field) => !pickedIds.includes(field.id));

  useEffect(() => {
    if (!setupOpen) return;
    const allowed = new Set(harvestableFields.map((field) => field.id));
    const previous = campaign.fieldOrder.filter((id) => allowed.has(id));
    setPickedIds(previous.length ? previous : harvestableFields.map((field) => field.id));
    setMillName(campaign.millName || '');
    setExpectedLitres(
      campaign.expectedOilLitres != null && Number.isFinite(campaign.expectedOilLitres)
        ? String(campaign.expectedOilLitres)
        : ''
    );
  }, [setupOpen, harvestableFields, campaign.fieldOrder, campaign.millName, campaign.expectedOilLitres]);

  const toggleGrove = (id: string) => {
    setPickedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    setError(null);
  };

  const movePicked = (id: string, direction: -1 | 1) => {
    setPickedIds((prev) => {
      const index = prev.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  };

  const nextId = nextGroveId(campaign);
  useEffect(() => {
    if (nextId) setLogFieldId(nextId);
  }, [nextId]);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of fields) map.set(field.id, friendlyFieldLabel(field.name));
    return map;
  }, [fields]);

  const seasonHarvests = useMemo(
    () => harvests.filter((row) => isDateInSeason(row.harvestDate, bounds)),
    [harvests, bounds]
  );
  const oliveTotal = seasonHarvests.reduce((sum, row) => sum + (row.oliveKg || 0), 0);
  const oilTotal = seasonHarvests.reduce((sum, row) => sum + (row.oilKg || 0), 0);
  const millHarvests = seasonHarvests.filter((row) => row.millName || row.oilKg);
  const grovesDone = campaign.groveDoneIds.filter((id) => campaign.fieldOrder.includes(id)).length;
  const grovesTotal = campaign.fieldOrder.length || fields.length;
  const todayLog = logForDate(campaign, today);
  const week = useMemo(
    () =>
      buildWeekStrip({
        rain24: weather?.rain?.forecast24hMm,
        rain48: weather?.rain?.forecast48hMm,
        rain72: weather?.rain?.forecast72hMm,
        wind24: weather?.wind?.maxNext24hKmh,
        wind72: weather?.wind?.maxNext72hKmh,
      }),
    [weather]
  );
  const nextName = (nextId && labels.get(nextId)) || t('fields:harvestCampaign.anyGrove');
  const expected = campaign.expectedOilLitres;
  const litresShown = millHarvests.reduce((sum, row) => sum + (row.oilKg || 0), 0);

  const weekday = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(localeTag, { weekday: 'short' });
  };

  const openSetup = () => {
    setError(null);
    setSetupOpen(true);
  };

  const beginHarvest = () => {
    if (pickedIds.length === 0) {
      setError(t('fields:harvestCampaign.needGrove'));
      return;
    }
    const litres = expectedLitres.trim() ? Number(expectedLitres.replace(',', '.')) : null;
    void start({
      fieldOrder: pickedIds,
      millName,
      expectedOilLitres: litres && Number.isFinite(litres) && litres > 0 ? litres : null,
    });
    setSetupOpen(false);
  };

  const confirmStop = () => {
    Alert.alert(t('fields:harvestCampaign.stop'), t('fields:harvestCampaign.stopConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('fields:harvestCampaign.stop'), style: 'destructive', onPress: () => void stop() },
    ]);
  };

  const saveToday = async () => {
    const kg = Number(oliveKg.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) {
      setError(t('capture:errors.oliveRequired'));
      return;
    }
    const fieldId = logFieldId || nextId || fields[0]?.id;
    if (!fieldId) {
      setError(t('fields:harvestCampaign.needGrove'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const litres = oilLitres.trim() ? Number(oilLitres.replace(',', '.')) : undefined;
      const oil = oilKg.trim() ? Number(oilKg.replace(',', '.')) : undefined;
      const peopleCount = people.trim() ? Number(people.replace(',', '.')) : undefined;
      const hoursCount = hours.trim() ? Number(hours.replace(',', '.')) : undefined;
      await getHarvestService().create({
        fieldId,
        harvestDate: new Date(`${today}T12:00:00`).toISOString(),
        oliveKg: kg,
        workersUsed: peopleCount && Number.isFinite(peopleCount) ? peopleCount : 0,
        millName: wentToMill ? millName || campaign.millName || undefined : undefined,
        oilLitres: wentToMill && litres && Number.isFinite(litres) ? litres : undefined,
        oilKg: wentToMill && oil && Number.isFinite(oil) ? oil : undefined,
        notes:
          [peopleCount ? `${peopleCount}` : '', hoursCount ? `${hoursCount}h` : ''].filter(Boolean).join(' · ') ||
          undefined,
      });
      await logDay({
        date: today,
        fieldId,
        oliveKg: kg,
        people: peopleCount && Number.isFinite(peopleCount) ? peopleCount : undefined,
        hours: hoursCount && Number.isFinite(hoursCount) ? hoursCount : undefined,
        millVisit: wentToMill,
      });
      setOliveKg('');
      setPeople('');
      setHours('');
      setOilLitres('');
      setOilKg('');
      setWentToMill(false);
      await load();
    } catch {
      setError(t('capture:errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const skipToday = () => {
    void logDay({ date: today, skipped: true, skipReason });
  };

  const openSpend = (chip: 'wages' | 'mill' | 'transport' | 'fuel') => {
    const fieldId = logFieldId || nextId;
    if (chip === 'mill') {
      capture?.openCapture({ preferredType: 'harvest', fieldId });
    } else {
      capture?.openCapture({ preferredType: 'expense', fieldId });
    }
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      minHeight: Math.max(44, tapMin),
    },
  ];

  if ((loading || fieldsLoading) && fields.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const statusPillBg =
    campaign.status === 'active'
      ? colors.success + '22'
      : campaign.status === 'paused'
        ? colors.warning + '22'
        : colors.surfaceMuted;
  const statusPillFg =
    campaign.status === 'active'
      ? colors.success
      : campaign.status === 'paused'
        ? colors.warning
        : colors.textSecondary;

  const groveOptions = campaign.fieldOrder.length ? campaign.fieldOrder : fields.map((f) => f.id);

  return (
    <ScreenLayout
      scroll
      padded
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader
        title={t('fields:harvestCampaign.title')}
        subtitle={
          isLive
            ? t('fields:harvestCampaign.leadLive', { grove: nextName })
            : t('fields:harvestCampaign.leadIdle')
        }
        context={
          <View style={styles.heroMeta}>
            <Text style={[styles.season, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
              {formatSeasonLabel(seasonStartYear)}
            </Text>
            <View style={[styles.pill, { backgroundColor: statusPillBg }]}>
              <Text style={{ color: statusPillFg, fontWeight: '700', fontSize: 12 * fontScaleMultiplier }}>
                {t(`fields:harvestCampaign.status.${campaign.status}`)}
              </Text>
            </View>
            {campaign.startedAt ? (
              <Text style={{ color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }}>
                {t('fields:harvestCampaign.since', {
                  date: new Date(campaign.startedAt).toLocaleDateString(localeTag, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                })}
              </Text>
            ) : null}
          </View>
        }
      />

      <View style={styles.actions}>
        {!isLive ? (
          <Button title={t('fields:harvestCampaign.start')} onPress={openSetup} fullWidth />
        ) : (
          <>
            {isActive ? (
              <Button title={t('fields:harvestCampaign.pause')} variant="outline" onPress={() => void pause()} fullWidth />
            ) : (
              <Button title={t('fields:harvestCampaign.resume')} onPress={() => void resume()} fullWidth />
            )}
            <Button
              title={t('fields:harvestCampaign.stop')}
              variant="error"
              onPress={confirmStop}
              fullWidth
            />
          </>
        )}
      </View>

      {setupOpen && !isLive ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
            {t('fields:harvestCampaign.setupTitle')}
          </Text>
          <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:harvestCampaign.setupHint')}</Text>

          {harvestableFields.length === 0 ? (
            <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:harvestCampaign.noFields')}</Text>
          ) : (
            pickedFields.map((field, index) => {
              const name = friendlyFieldLabel(field.name);
              const variety = field.variety || field.oliveVariety;
              const showVariety =
                Boolean(variety) && !name.toLowerCase().includes(String(variety).toLowerCase());
              const area = formatFieldArea(field);
              const meta = [showVariety ? variety : null, area !== '—' ? area : null].filter(Boolean).join(' · ');
              return (
                <View
                  key={field.id}
                  style={[styles.groveRow, { borderColor: colors.borderLight, minHeight: Math.max(48, tapMin) }]}
                >
                  <Text style={[styles.groveNum, { color: colors.textTertiary }]}>{index + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{name}</Text>
                    {index === 0 ? (
                      <Text style={{ color: colors.primary, fontSize: 12 * fontScaleMultiplier }}>
                        {t('fields:harvestCampaign.setupToday')}
                      </Text>
                    ) : null}
                    {meta ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }}>{meta}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => movePicked(field.id, -1)}
                    disabled={index === 0}
                    style={styles.iconBtn}
                    accessibilityLabel={t('fields:harvestCampaign.moveUp')}
                  >
                    <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.textTertiary : colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => movePicked(field.id, 1)}
                    disabled={index === pickedFields.length - 1}
                    style={styles.iconBtn}
                    accessibilityLabel={t('fields:harvestCampaign.moveDown')}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={index === pickedFields.length - 1 ? colors.textTertiary : colors.textPrimary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => toggleGrove(field.id)}
                    style={styles.iconBtn}
                    accessibilityLabel={t('fields:harvestCampaign.setupRemoveGrove')}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              );
            })
          )}

          {restFields.length > 0 ? (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                {t('fields:harvestCampaign.setupOtherTitle')}
              </Text>
              {restFields.map((field) => {
                const name = friendlyFieldLabel(field.name);
                const variety = field.variety || field.oliveVariety;
                const showVariety =
                  Boolean(variety) && !name.toLowerCase().includes(String(variety).toLowerCase());
                return (
                  <Pressable
                    key={field.id}
                    onPress={() => toggleGrove(field.id)}
                    style={[
                      styles.addRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceMuted,
                        minHeight: Math.max(44, tapMin),
                      },
                    ]}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={{ flex: 1, color: colors.textPrimary }}>
                      {name}
                      {showVariety ? ` · ${variety}` : ''}
                    </Text>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                      {t('fields:harvestCampaign.setupAddGrove')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <View style={styles.optionalHead}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}>
                {t('fields:harvestCampaign.setupOptionalTitle')}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }}>
                {t('fields:harvestCampaign.optional')}
              </Text>
            </View>
            <Text style={[styles.help, { color: colors.textSecondary }]}>
              {t('fields:harvestCampaign.setupOptionalHint')}
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('fields:harvestCampaign.millOptional')}
            </Text>
            <TextInput
              value={millName}
              onChangeText={setMillName}
              placeholder={t('fields:harvestCampaign.millPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
              autoCorrect={false}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('fields:harvestCampaign.expectedLitres')}
            </Text>
            <View style={styles.unitRow}>
              <TextInput
                value={expectedLitres}
                onChangeText={setExpectedLitres}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.textTertiary}
                style={[inputStyle, { flex: 1 }]}
                accessibilityLabel={t('fields:harvestCampaign.expectedLitres')}
              />
              <Text style={{ color: colors.textSecondary, paddingHorizontal: spacing.sm }}>
                {t('fields:harvestCampaign.litresSuffix')}
              </Text>
            </View>
          </View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button
              title={t('fields:harvestCampaign.begin')}
              onPress={beginHarvest}
              disabled={harvestableFields.length === 0 || pickedIds.length === 0}
              fullWidth
            />
            <Button title={t('common:cancel')} variant="ghost" onPress={() => setSetupOpen(false)} fullWidth />
          </View>
        </View>
      ) : null}

      {isLive ? (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
              {t('fields:harvestCampaign.todayTitle')}
            </Text>
            <Text style={[styles.help, { color: colors.textSecondary }]}>
              {t('fields:harvestCampaign.todayHint', { grove: nextName })}
            </Text>
            {weather ? (
              <View style={styles.week} accessibilityLabel={t('fields:harvestCampaign.weekLabel')}>
                {week.map((day) => (
                  <View
                    key={day.offset}
                    style={[styles.day, { borderColor: colors.borderLight, backgroundColor: colors.surfaceMuted }]}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier, fontWeight: '700' }}>
                      {weekday(day.offset)}
                    </Text>
                    <View style={[styles.dot, { backgroundColor: rankColor(day.rank, colors) }]} />
                    <Text style={{ color: colors.textPrimary, fontSize: 11 * fontScaleMultiplier }}>
                      {t(`fields:harvestCampaign.rank.${day.rank}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
              {t('fields:harvestCampaign.clocksTitle')}
            </Text>
            <View style={styles.meters}>
              <View style={[styles.meter, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.grovesMeter')}</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 22 * fontScaleMultiplier }}>
                  {grovesDone}/{grovesTotal || '—'}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${grovesTotal ? Math.min(100, (grovesDone / grovesTotal) * 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={[styles.meter, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.oilMeter')}</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18 * fontScaleMultiplier }}>
                  {oilTotal > 0
                    ? `${formatKg(oilTotal)} kg`
                    : oliveTotal > 0
                      ? `${formatKg(oliveTotal)} kg`
                      : t('fields:thisHarvest.notYet', { defaultValue: 'Not yet' })}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${
                          expected && expected > 0
                            ? Math.min(100, (litresShown / expected) * 100)
                            : oilTotal > 0
                              ? 55
                              : oliveTotal > 0
                                ? 28
                                : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
              {t('fields:harvestCampaign.logTitle')}
            </Text>
            {todayLog && !todayLog.skipped ? (
              <Text style={[styles.help, { color: colors.textSecondary }]}>
                {t('fields:harvestCampaign.alreadyLogged', { kg: formatKg(todayLog.oliveKg || 0) })}
              </Text>
            ) : todayLog?.skipped ? (
              <Text style={[styles.help, { color: colors.textSecondary }]}>
                {t(`fields:harvestCampaign.skipped.${todayLog.skipReason || 'other'}`)}
              </Text>
            ) : null}

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('fields:harvestCampaign.whichGrove')}
            </Text>
            <View style={styles.chipWrap}>
              {groveOptions.map((id) => {
                const selected = logFieldId === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setLogFieldId(id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary + '18' : colors.surfaceMuted,
                        minHeight: Math.max(40, tapMin - 4),
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? colors.primary : colors.textPrimary, fontWeight: '600' }}>
                      {labels.get(id) || id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('fields:harvest.oliveKg')}</Text>
            <TextInput
              value={oliveKg}
              onChangeText={setOliveKg}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('fields:harvestCampaign.people')}
                </Text>
                <TextInput
                  value={people}
                  onChangeText={setPeople}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textTertiary}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('fields:harvestCampaign.hours')}
                </Text>
                <TextInput
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textTertiary}
                  style={inputStyle}
                />
              </View>
            </View>

            <Pressable
              onPress={() => setWentToMill((v) => !v)}
              style={[styles.checkRow, { minHeight: Math.max(44, tapMin) }]}
            >
              <Ionicons
                name={wentToMill ? 'checkbox' : 'square-outline'}
                size={22}
                color={wentToMill ? colors.primary : colors.textSecondary}
              />
              <Text style={{ color: colors.textPrimary }}>{t('fields:harvestCampaign.wentToMill')}</Text>
            </Pressable>

            {wentToMill ? (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('fields:harvestCampaign.litres')}
                  </Text>
                  <TextInput
                    value={oilLitres}
                    onChangeText={setOilLitres}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textTertiary}
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('fields:harvest.oilKg')}</Text>
                  <TextInput
                    value={oilKg}
                    onChangeText={setOilKg}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textTertiary}
                    style={inputStyle}
                  />
                </View>
              </View>
            ) : null}

            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
            <Button
              title={saving ? t('capture:saving') : t('fields:harvestCampaign.saveToday')}
              onPress={() => void saveToday()}
              disabled={!isActive || saving}
              loading={saving}
              fullWidth
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {t('fields:harvestCampaign.skipWhy')}
            </Text>
            <View style={styles.chipWrap}>
              {skipReasons.map((reason) => {
                const selected = skipReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setSkipReason(reason)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary + '18' : colors.surfaceMuted,
                        minHeight: Math.max(40, tapMin - 4),
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? colors.primary : colors.textPrimary }}>
                      {t(`fields:harvestCampaign.skip.${reason}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              title={t('fields:harvestCampaign.skipToday')}
              variant="ghost"
              onPress={skipToday}
              disabled={!isActive}
              fullWidth
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
              {t('fields:harvestCampaign.orderTitle')}
            </Text>
            <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:harvestCampaign.orderHint')}</Text>
            {campaign.fieldOrder.map((id, index) => {
              const done = campaign.groveDoneIds.includes(id);
              return (
                <View
                  key={id}
                  style={[
                    styles.groveRow,
                    {
                      borderColor: colors.borderLight,
                      opacity: done ? 0.7 : 1,
                      minHeight: Math.max(48, tapMin),
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => void reorder(id, -1)}
                    disabled={index === 0}
                    style={styles.iconBtn}
                    accessibilityLabel={t('fields:harvestCampaign.moveUp')}
                  >
                    <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.textTertiary : colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => void reorder(id, 1)}
                    disabled={index === campaign.fieldOrder.length - 1}
                    style={styles.iconBtn}
                    accessibilityLabel={t('fields:harvestCampaign.moveDown')}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={index === campaign.fieldOrder.length - 1 ? colors.textTertiary : colors.textPrimary}
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontWeight: '600',
                        textDecorationLine: done ? 'line-through' : 'none',
                      }}
                    >
                      {index + 1}. {labels.get(id) || id}
                    </Text>
                    {id === nextId && !done ? (
                      <Text style={{ color: colors.primary, fontSize: 12 * fontScaleMultiplier }}>
                        {t('fields:harvestCampaign.upNext')}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    title={done ? t('fields:harvestCampaign.reopenGrove') : t('fields:harvestCampaign.groveDone')}
                    variant="ghost"
                    size="small"
                    onPress={() => void markGroveDone(id)}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
              {t('fields:harvestCampaign.spendTitle')}
            </Text>
            <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:harvestCampaign.spendHint')}</Text>
            <View style={styles.chipWrap}>
              {(['wages', 'mill', 'transport', 'fuel'] as const).map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => openSpend(chip)}
                  style={[
                    styles.chip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceMuted,
                      minHeight: Math.max(40, tapMin - 4),
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                    {t(`fields:harvestCampaign.chips.${chip}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
              {t('fields:thisHarvest.millTitle', { defaultValue: 'Mill visits' })}
            </Text>
            {millHarvests.length === 0 ? (
              <Text style={[styles.help, { color: colors.textSecondary }]}>
                {t('fields:thisHarvest.millEmpty', {
                  defaultValue: 'Date, grove, and kilos will appear after the first delivery.',
                })}
              </Text>
            ) : (
              millHarvests.slice(0, 8).map((visit, index) => (
                <View
                  key={visit.id || `${visit.fieldId}-${visit.harvestDate}-${index}`}
                  style={[styles.millRow, { borderColor: colors.borderLight }]}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }}>
                    {new Date(visit.harvestDate).toLocaleDateString(localeTag, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>
                    {visit.fieldName}
                    {visit.millName ? ` · ${visit.millName}` : ''}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {formatKg(visit.oliveKg)} kg
                    {visit.oilKg ? ` · ${formatKg(visit.oilKg)} kg` : ''}
                  </Text>
                </View>
              ))
            )}
            <Button
              title={t('fields:harvestCampaign.addMillTicket')}
              variant="outline"
              icon={<Ionicons name="add" size={16} color={colors.primary} />}
              onPress={() =>
                capture?.openCapture({ preferredType: 'harvest', fieldId: logFieldId || nextId })
              }
              fullWidth
            />
          </View>
        </>
      ) : null}

      {!isLive && !setupOpen ? (
        <View style={styles.section}>
          {isClosed ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
                {t('fields:thisHarvest.liveTitle')}
              </Text>
              <Text style={{ color: colors.textPrimary, marginBottom: spacing.xs }}>
                {t('fields:thisHarvest.olivesSoFar')}: {formatKg(oliveTotal)} kg
              </Text>
              <Text style={{ color: colors.textPrimary, marginBottom: spacing.md }}>
                {t('fields:harvestCampaign.oilMeter')}:{' '}
                {oilTotal > 0
                  ? `${formatKg(oilTotal)} kg`
                  : t('fields:thisHarvest.notYet', { defaultValue: 'Not yet' })}
              </Text>
              <Button
                title={t('fields:thisHarvest.reviewLink')}
                onPress={() => navigation.navigate('ThisHarvestReview')}
                fullWidth
              />
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
                {t('fields:harvestCampaign.whyTitle')}
              </Text>
              <Text style={[styles.help, { color: colors.textSecondary }]}>
                {t('fields:harvestCampaign.whyBody')}
              </Text>
              {oliveTotal > 0 ? (
                <Text style={[styles.help, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                  {t('fields:harvestCampaign.alreadyThisSeason', { olives: formatKg(oliveTotal) })}
                </Text>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {!isClosed ? (
        <View style={styles.footerLinks}>
          <Button
            title={t('fields:thisHarvest.reviewLink')}
            variant="ghost"
            onPress={() => navigation.navigate('ThisHarvestReview')}
            fullWidth
          />
          {user ? (
            <Button
              title={t('fields:thisHarvest.openMoney')}
              variant="ghost"
              onPress={() => navigation.navigate('Money')}
              fullWidth
            />
          ) : null}
        </View>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'], gap: spacing.md },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  season: { fontWeight: '600' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  actions: { gap: spacing.sm },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.sm,
  },
  section: { gap: spacing.xs },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.xs },
  help: { ...typography.styles.bodySmall, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  groveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  groveNum: { width: 22, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  optionalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  day: {
    width: '13%',
    minWidth: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meters: { flexDirection: 'row', gap: spacing.sm },
  meter: { flex: 1, borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: 6 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  millRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  error: { fontWeight: '600' },
  footerLinks: { gap: spacing.xs, marginTop: spacing.sm },
});

export default HarvestCampaignScreen;
