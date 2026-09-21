import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import {
  geospatialService,
  type DataSourceMetadata,
  type FieldIntelligenceSummary,
  type FieldSatelliteObservation,
  type FieldSpatialProfile,
  type LandCoverSummary,
  type SatelliteDate,
  type SatelliteSummary,
  type SoilSummary,
  type TerrainSummary,
} from '../../services/geospatialService';
import type { FieldPhenology, FieldWorkProfile } from '../../services/fieldWorkService';
import { formatAreaFromSqm, hectaresFromSqm, stremmataFromSqm } from '../../utils/area';
import { formatFieldArea, resolveFieldAreaSqm, resolveFieldCenter } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import { resolveFieldStageLabel } from '../../utils/fieldStage';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { buildWorkProfileAnswerRows } from '../../utils/fieldWorkProfileAnswers';
import {
  pickLatestUsableSatellite,
  resolveSentinelStatus,
} from '../../utils/sentinelStatus';
import DataSourceInfoModal, { type DataSourceInfo } from '../Common/DataSourceInfoModal';
import type { SupportedLocale } from '../../i18n/config';
import './FieldDetailsTab.css';

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
  workProfile?: FieldWorkProfile | null;
  phenology?: FieldPhenology | null;
  onDelete?: () => void;
};

type SourceEntry = {
  id: string;
  title: string;
  provider: string;
  updated?: string;
  kind?: string;
  note?: string;
  info?: DataSourceInfo;
};

const CLAY = '#8b5a3c';
const SILT = '#c4a574';
const SAND = '#d9c48a';
const COVER = ['#4f7d4a', '#8aa85a', '#c4a574', '#6d92b3', '#8c7cae', '#b4845a'];

const optionLabel = (
  t: (key: string, opts?: Record<string, unknown>) => string,
  prefix: string,
  value?: string | null
): string | null => {
  if (!value) return null;
  return t(`${prefix}${value}`, { defaultValue: value });
};

const metadataInfo = (title: string, meta?: DataSourceMetadata, note?: string): DataSourceInfo | undefined => {
  if (!meta?.source) return undefined;
  return {
    title,
    source: meta.source,
    sourceUrl: meta.sourceUrl,
    attribution: meta.attribution,
    licence: meta.licence,
    spatialResolution: meta.spatialResolution,
    temporalResolution: meta.temporalResolution,
    valueType: meta.valueType,
    sourceDate: meta.sourceDate,
    lastUpdatedAt: meta.lastUpdatedAt,
    note: note || meta.confidenceNote,
  };
};

const metadataUpdated = (meta?: DataSourceMetadata): string | undefined =>
  meta?.lastUpdatedAt || meta?.sourceDate;

const formatM = (value: number | undefined, locale: string): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value).toLocaleString(locale)} m`;
};

const formatPct = (value: number | undefined, locale: string): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
};

/** FAO-ish label from SoilGrids fractions — only used when the API sent the parts. */
const textureFromFractions = (soil: SoilSummary): string | null => {
  const clay = soil.clayPercent;
  const sand = soil.sandPercent;
  const silt = soil.siltPercent;
  if (clay == null && sand == null && silt == null) return null;
  const c = clay ?? 0;
  const sa = sand ?? 0;
  const si = silt ?? 0;
  if (c >= 40) return 'clay';
  if (sa >= 70 && c < 20) return 'sand';
  if (si >= 50 && c < 27) return 'silt';
  if (c >= 27) return 'clayLoam';
  return 'loam';
};

const ndviBand = (value?: number): 'high' | 'medium' | 'low' | null => {
  if (value == null) return null;
  if (value >= 0.6) return 'high';
  if (value >= 0.35) return 'medium';
  return 'low';
};

const FIRE_NEAR_KM = 25;

const daysSince = (iso?: string): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((Date.now() - then) / 86_400_000);
};

const sameUtcDay = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  return a.slice(0, 10) === b.slice(0, 10);
};

const formatPassDay = (iso: string, locale: string): string =>
  new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value == null || value === '') return null;
  return (
    <div className="fd-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
};

const InfoButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" className="fd-info" aria-label={label} onClick={onClick}>
    <Info size={15} aria-hidden />
  </button>
);

const FieldDetailsTab: React.FC<Props> = ({ field, year, canOwn, workProfile, phenology, onDelete }) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { formatDateTime, formatRelativeTime, formatNumber } = useLocaleFormatters();
  const locale = (i18n.language?.startsWith('el')
    ? 'el'
    : i18n.language?.startsWith('it')
      ? 'it'
      : 'en') as SupportedLocale;
  const numberLocale = locale === 'el' ? 'el-GR' : locale === 'it' ? 'it-IT' : 'en-US';

  const [spatial, setSpatial] = useState<FieldSpatialProfile | null>(null);
  const [intel, setIntel] = useState<FieldIntelligenceSummary | null>(null);
  const [satelliteDates, setSatelliteDates] = useState<SatelliteDate[]>([]);
  const [greenObs, setGreenObs] = useState<FieldSatelliteObservation | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let didRefresh = false;
    let polls = 0;

    const landMissing = (profile: FieldSpatialProfile | null, summary: FieldIntelligenceSummary | null) =>
      !profile?.terrain && !summary?.terrain && !profile?.soil && !summary?.soil;

    const load = async () => {
      const [profile, summary, dates] = await Promise.all([
        geospatialService.getSpatialProfile(field.id).catch(() => null),
        geospatialService.getIntelligence(field.id).catch(() => null),
        geospatialService.getSatelliteDates(field.id).catch(() => [] as SatelliteDate[]),
      ]);
      if (cancelled) return;
      setSpatial(profile);
      setIntel(summary);
      setSatelliteDates(dates);
      const pass = pickLatestUsableSatellite(dates);
      if (pass?.observationId) {
        const obs = await geospatialService
          .getSatelliteObservation(field.id, pass.observationId)
          .catch(() => null);
        if (!cancelled) setGreenObs(obs);
      } else {
        setGreenObs(null);
      }
      if (cancelled) return;
      const pending =
        profile?.processingStatus === 'pending' ||
        profile?.processingStatus === 'processing' ||
        summary?.processingStatus === 'pending' ||
        summary?.processingStatus === 'processing';
      const waiting = landMissing(profile, summary) || pending;
      setCollecting(waiting);
      if (waiting && !didRefresh) {
        didRefresh = true;
        await geospatialService.refreshIntelligence(field.id).catch(() => undefined);
      }
      if (waiting && polls < 8) {
        polls += 1;
        timer = window.setTimeout(() => {
          void load();
        }, 4000);
      } else if (!waiting) {
        setCollecting(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [field.id]);

  const terrain: TerrainSummary | undefined = spatial?.terrain ?? intel?.terrain;
  const soil: SoilSummary | undefined = spatial?.soil ?? intel?.soil;
  const landCover: LandCoverSummary | undefined = spatial?.landCover ?? intel?.landCover;
  const environment = spatial?.environment ?? intel?.environment;
  const satellite: SatelliteSummary | undefined = spatial?.satellite ?? intel?.vegetation;
  const greenPass = useMemo(() => pickLatestUsableSatellite(satelliteDates), [satelliteDates]);
  const sentinelStatus = useMemo(
    () =>
      resolveSentinelStatus(satelliteDates, {
        processing: collecting,
        failed: spatial?.processingStatus === 'failed',
      }),
    [satelliteDates, collecting, spatial?.processingStatus]
  );
  const greenDate = greenObs?.observationDate ?? greenPass?.observationDate ?? satellite?.observationDate;
  const greenAgeDays = daysSince(greenDate);
  const greenNdvi =
    greenObs?.ndvi?.mean ?? greenPass?.ndviMean ?? (sentinelStatus.kind !== 'NoClearAcquisition' ? satellite?.ndviMean : undefined);
  const greenNdmi =
    greenObs?.ndmi?.mean ??
    (sameUtcDay(satellite?.observationDate, greenDate) ? satellite?.ndmiMean : undefined);
  const greenCloud =
    greenObs?.fieldCloudCoverPercent ??
    greenObs?.cloudCoverPercent ??
    greenPass?.fieldCloudCoverPercent ??
    greenPass?.cloudCoverPercent ??
    satellite?.fieldCloudCoverPercent ??
    satellite?.cloudCoverPercent;
  const greenMeta = greenObs?.metadata ?? (sameUtcDay(satellite?.observationDate, greenDate) ? satellite?.metadata : undefined);
  const geometry = spatial?.geometry;
  const cadastre = field.greekCadastre;

  const unknown = t('fields:details.unknown');
  const recordedInApp = t('fields:details.sources.declaredByUser');
  const sourceAria = t('fields:details.sourceAria');

  const varietyRaw = field.variety || field.oliveVariety;
  const variety = optionLabel(t, 'fields:addField.varietyOptions.', varietyRaw);
  const irrigationType = optionLabel(t, 'fields:addField.irrigationOptions.', field.irrigationType);
  const cropType = optionLabel(t, 'fields:addField.cropTypes.', field.cropType) || field.cropType;
  const stage = resolveFieldStageLabel({
    phenology,
    currentLifecycleStage: field.currentLifecycleStage,
    t,
  });
  const biennial =
    field.currentLifecycleYear === 'low' || field.currentLifecycleYear === 'high'
      ? t(`common:lifecycleYear.${field.currentLifecycleYear}`)
      : null;

  const areaSqm = geometry?.areaSqm || resolveFieldAreaSqm(field);
  const areaPrimary = areaSqm
    ? formatAreaFromSqm(areaSqm, { locale })
    : formatFieldArea(field, locale);
  const areaFull = areaSqm ? formatAreaFromSqm(areaSqm, { locale, style: 'withConversions' }) : null;
  const measured =
    field.appMeasuredAreaSqm != null
      ? formatAreaFromSqm(field.appMeasuredAreaSqm, { locale, style: 'withConversions' })
      : geometry?.areaSqm != null
        ? formatAreaFromSqm(geometry.areaSqm, { locale, style: 'withConversions' })
        : null;
  const official =
    cadastre?.officialAreaSqm != null
      ? formatAreaFromSqm(cadastre.officialAreaSqm, { locale, style: 'withConversions' })
      : null;
  const center = resolveFieldCenter(field);
  const lat = geometry?.centroidLat ?? center?.[0];
  const lng = geometry?.centroidLng ?? center?.[1];
  const stremmata = areaSqm != null ? stremmataFromSqm(areaSqm) : 0;
  const hectares = areaSqm != null ? hectaresFromSqm(areaSqm) : 0;
  const density =
    field.treeCount == null
      ? null
      : locale === 'el'
        ? stremmata > 0
          ? field.treeCount / stremmata
          : null
        : hectares > 0
          ? field.treeCount / hectares
          : null;

  const workAnswers = useMemo(
    () => buildWorkProfileAnswerRows(workProfile, (key, params) => t(key, params)),
    [workProfile, t]
  );
  const showWork = Boolean(workProfile) && workProfile?.status !== 'draft' && workAnswers.length > 0;

  const aspectLabel = terrain?.dominantAspect
    ? t(`fields:intelligence.aspects.${terrain.dominantAspect}`, { defaultValue: terrain.dominantAspect })
    : null;
  const slopeClassLabel = terrain?.dominantSlopeClass
    ? t(`fields:intelligence.slopeClasses.${terrain.dominantSlopeClass}`, {
        defaultValue: terrain.dominantSlopeClass,
      })
    : null;
  const landCoverLabel = landCover?.dominantClass
    ? t(`fields:intelligence.landCoverClasses.${landCover.dominantClass}`, {
        defaultValue: landCover.dominantClass,
      })
    : null;
  const textureKey = soil ? textureFromFractions(soil) : null;
  const textureLabel = textureKey ? t(`fields:details.texture.${textureKey}`) : null;
  const ndviHintKey = ndviBand(greenNdvi);
  const hasCover = Boolean(landCoverLabel);
  const naturaInside = Boolean(environment?.intersectsNatura);
  const nearbyFire =
    environment?.closestFire && environment.closestFire.distanceKm <= FIRE_NEAR_KM
      ? environment.closestFire
      : null;

  const cadastreSourceLabel = cadastre?.source
    ? t(`fields:details.cadastreSources.${cadastre.source}`, { defaultValue: cadastre.source })
    : t('fields:mapLayers.names.cadastre');

  const sourceKindLabel = (valueType?: string) => {
    if (!valueType) return undefined;
    const key = valueType.trim().toLowerCase().replace(/\s+/g, '_');
    return t(`fields:details.sourceType.${key}`, { defaultValue: valueType });
  };

  const openInfo = (info?: DataSourceInfo) => {
    if (info) setSourceInfo(info);
  };

  const sources = useMemo<SourceEntry[]>(() => {
    const rows: SourceEntry[] = [
      {
        id: 'record',
        title: t('fields:details.sources.fieldRecord'),
        provider: recordedInApp,
        updated: field.updatedAt,
        kind: t('fields:details.sourceType.recorded'),
        note: t('fields:details.sources.fieldRecordNote'),
      },
    ];
    if (cadastre) {
      rows.push({
        id: 'cadastre',
        title: t('fields:addField.cadastre.referenceTitle', {
          defaultValue: t('fields:mapLayers.names.cadastre'),
        }),
        provider: cadastreSourceLabel,
        updated: cadastre.extractPrintDate,
        kind: t('fields:details.sourceType.reference'),
        note: t('fields:addField.cadastre.referenceDisclaimer', { defaultValue: '' }) || undefined,
      });
    }
    const geo: Array<[string, DataSourceMetadata | undefined, string, boolean]> = [
      [t('fields:details.land'), terrain?.metadata, t('fields:details.sources.terrainNote'), true],
      [t('fields:details.soilTitle'), soil?.metadata, t('fields:details.sources.soilNote'), true],
      [t('fields:intelligence.landCover'), landCover?.metadata, t('fields:mapLayers.notes.land-cover'), hasCover],
      [
        t('fields:intelligence.environment'),
        environment?.metadata,
        '',
        Boolean(naturaInside || nearbyFire),
      ],
      [
        t('fields:intelligence.vegetation'),
        greenMeta ?? satellite?.metadata,
        t('fields:mapLayers.notes.ndvi'),
        Boolean(greenDate),
      ],
    ];
    geo.forEach(([title, meta, note, include]) => {
      if (!include || !meta?.source) return;
      rows.push({
        id: title,
        title,
        provider: meta.source,
        updated:
          title === t('fields:intelligence.vegetation') && greenDate
            ? greenDate
            : metadataUpdated(meta),
        kind: sourceKindLabel(meta.valueType),
        note:
          (meta.isRegionalEstimate || (soil?.isRegionalEstimate && title === t('fields:details.soilTitle')))
            ? t('fields:details.sources.regional')
            : note || undefined,
        info: metadataInfo(title, meta, note || undefined),
      });
    });
    if (greenDate && !rows.some((row) => row.id === t('fields:intelligence.vegetation'))) {
      rows.push({
        id: t('fields:intelligence.vegetation'),
        title: t('fields:intelligence.vegetation'),
        provider: greenObs?.source || t('fields:details.kickers.sentinel'),
        updated: greenDate,
        kind: t('fields:details.sourceType.satellite_derived'),
        note: t('fields:mapLayers.notes.ndvi'),
      });
    }
    return rows;
  }, [
    cadastre,
    cadastreSourceLabel,
    environment,
    field.updatedAt,
    greenDate,
    greenMeta,
    hasCover,
    landCover,
    naturaInside,
    nearbyFire,
    recordedInApp,
    greenObs,
    satellite,
    soil,
    t,
    terrain,
  ]);

  const coverParts = Object.entries(landCover?.percentByClass || {})
    .map(([name, pct]) => ({
      name: t(`fields:intelligence.landCoverClasses.${name}`, { defaultValue: name }),
      pct,
    }))
    .filter((part) => part.pct > 0.5)
    .sort((a, b) => b.pct - a.pct);

  const slopeZones = Object.entries(terrain?.slopeZonePercent || {})
    .map(([name, pct]) => ({
      name: t(`fields:intelligence.slopeClasses.${name}`, { defaultValue: name }),
      pct,
    }))
    .filter((part) => part.pct > 0.5);

  const coords =
    lat != null && lng != null
      ? `${lat.toLocaleString(numberLocale, { maximumFractionDigits: 5 })}, ${lng.toLocaleString(numberLocale, {
          maximumFractionDigits: 5,
        })}`
      : null;

  const elevationHero = formatM(terrain?.averageElevationM, numberLocale);
  const slopeHero = formatPct(terrain?.averageSlopePercent, numberLocale);

  return (
    <div className="fd">
      <header className="fd-lead">
        <div>
          <h2>{t('fields:page.details')}</h2>
          <p>
            {t('fields:details.leadApi')}
            {spatial?.calculatedAt
              ? ` ${t('fields:details.modelsUpdated', { when: formatRelativeTime(spatial.calculatedAt) })}`
              : collecting
                ? ` ${t('fields:details.collecting')}`
                : ''}
          </p>
        </div>
        {canOwn ? (
          <Link className="field-attention-secondary" to={`/fields/${field.id}/edit`}>
            {t('fields:page.editField')}
          </Link>
        ) : null}
      </header>

      <div className="fd-hero" aria-label={t('fields:details.factsAria')}>
        <div className="fd-hero-cell fd-hero-cell--area">
          <span>{t('fields:overview.area')}</span>
          <strong>{areaPrimary || unknown}</strong>
          <em>{t('fields:details.hero.areaFrom')}</em>
        </div>
        <div className="fd-hero-cell fd-hero-cell--land">
          <span>{t('fields:details.elevation')}</span>
          <strong>{elevationHero || (collecting ? '…' : '—')}</strong>
          <em>{terrain?.metadata?.source || t('fields:details.hero.dem')}</em>
        </div>
        <div className="fd-hero-cell fd-hero-cell--slope">
          <span>{t('fields:details.slope')}</span>
          <strong>{slopeHero || (collecting ? '…' : '—')}</strong>
          <em>{slopeClassLabel || t('fields:details.hero.dem')}</em>
        </div>
        <div className="fd-hero-cell fd-hero-cell--trees">
          <span>{t('fields:details.trees')}</span>
          <strong>{field.treeCount != null ? formatNumber(field.treeCount, 0) : '—'}</strong>
          <em>{t('fields:details.hero.groveRecord')}</em>
        </div>
      </div>

      <div className="fd-grid">
        <section className="fd-panel fd-panel--land">
          <div className="fd-panel-head">
            <div>
              <p className="fd-kicker">{t('fields:details.kickers.dem')}</p>
              <h3>{t('fields:details.land')}</h3>
            </div>
            <div className="fd-head-actions">
              {terrain?.metadata ? (
                <InfoButton
                  label={sourceAria}
                  onClick={() =>
                    openInfo(
                      metadataInfo(t('fields:details.land'), terrain.metadata, t('fields:details.sources.terrainNote'))
                    )
                  }
                />
              ) : null}
            </div>
          </div>
          {terrain ? (
            <>
              <div className="fd-stats fd-stats--3">
                <div className="fd-stat">
                  <span>{t('fields:details.average')}</span>
                  <strong>{elevationHero || '—'}</strong>
                  <small>
                    {terrain.minElevationM != null && terrain.maxElevationM != null
                      ? `${formatM(terrain.minElevationM, numberLocale)} – ${formatM(terrain.maxElevationM, numberLocale)}`
                      : null}
                  </small>
                </div>
                <div className="fd-stat">
                  <span>{t('fields:details.slope')}</span>
                  <strong>{slopeHero || '—'}</strong>
                  <small>{slopeClassLabel}</small>
                </div>
                <div className="fd-stat">
                  <span>{t('fields:intelligence.aspect')}</span>
                  <strong>{aspectLabel || '—'}</strong>
                  <small>
                    {terrain.maxSlopePercent != null
                      ? t('fields:details.maxSlope', { value: formatPct(terrain.maxSlopePercent, numberLocale) })
                      : null}
                  </small>
                </div>
              </div>
              {terrain.averageSlopePercent != null ? (
                <div className="fd-meter">
                  <div className="fd-meter-track">
                    <div
                      className="fd-meter-fill"
                      style={{ width: `${Math.min(100, (terrain.averageSlopePercent / 40) * 100)}%` }}
                    />
                  </div>
                  <div className="fd-meter-scale">
                    <span>0%</span>
                    <span>40%</span>
                  </div>
                </div>
              ) : null}
              {slopeZones.length > 0 ? (
                <>
                  <div className="fd-shares" aria-hidden>
                    {slopeZones.map((zone, index) => (
                      <i
                        key={zone.name}
                        style={{ width: `${zone.pct}%`, background: COVER[index % COVER.length] }}
                      />
                    ))}
                  </div>
                  <ul className="fd-share-legend">
                    {slopeZones.map((zone, index) => (
                      <li key={zone.name}>
                        <i style={{ background: COVER[index % COVER.length] }} />
                        {zone.name} {formatPct(zone.pct, numberLocale)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <p className="fd-empty">{collecting ? t('fields:details.collectingBody') : t('fields:details.noTerrain')}</p>
          )}
          {naturaInside || nearbyFire ? (
            <dl className="fd-rows">
              {naturaInside ? (
                <Row label={t('fields:intelligence.natura')} value={t('fields:intelligence.naturaInside')} />
              ) : null}
              {nearbyFire ? (
                <Row
                  label={t('fields:intelligence.fire')}
                  value={t('fields:intelligence.fireDistance', {
                    distance: formatNumber(nearbyFire.distanceKm, 1),
                    direction: nearbyFire.direction || '',
                  })}
                />
              ) : null}
            </dl>
          ) : null}
          <div className="fd-foot">
            <span>{terrain?.metadata?.source || t('fields:details.kickers.dem')}</span>
            <span>{terrain?.metadata?.spatialResolution}</span>
          </div>
        </section>

        <section className="fd-panel fd-panel--soil">
          <div className="fd-panel-head">
            <div>
              <p className="fd-kicker">{t('fields:details.kickers.soil')}</p>
              <h3>{t('fields:details.soilTitle')}</h3>
            </div>
            {soil?.metadata ? (
              <InfoButton
                label={sourceAria}
                onClick={() =>
                  openInfo(metadataInfo(t('fields:details.soilTitle'), soil.metadata, t('fields:details.sources.soilNote')))
                }
              />
            ) : null}
          </div>
          {soil ? (
            <>
              {soil.isRegionalEstimate || soil.metadata?.isRegionalEstimate ? (
                <p className="fd-banner">{t('fields:details.sources.regional')}</p>
              ) : null}
              <div className="fd-stats">
                <div className="fd-stat">
                  <span>{t('fields:intelligence.soilPh')}</span>
                  <strong>{soil.ph != null ? formatNumber(soil.ph, 1) : '—'}</strong>
                  <small>{textureLabel}</small>
                </div>
                <div className="fd-stat">
                  <span>{t('fields:intelligence.organicCarbon')}</span>
                  <strong>{formatPct(soil.organicCarbonPercent, numberLocale) || '—'}</strong>
                </div>
              </div>
              {soil.ph != null ? (
                <div className="fd-meter">
                  <div className="fd-meter-track">
                    <span className="fd-meter-mark" style={{ left: `${(soil.ph / 14) * 100}%` }} />
                  </div>
                  <div className="fd-meter-scale">
                    <span>0</span>
                    <span>7</span>
                    <span>14</span>
                  </div>
                </div>
              ) : null}
              {soil.clayPercent != null || soil.sandPercent != null ? (
                <>
                  <div className="fd-shares" aria-hidden>
                    <i style={{ width: `${soil.clayPercent ?? 0}%`, background: CLAY }} />
                    <i style={{ width: `${soil.siltPercent ?? 0}%`, background: SILT }} />
                    <i style={{ width: `${soil.sandPercent ?? 0}%`, background: SAND }} />
                  </div>
                  <ul className="fd-share-legend">
                    <li>
                      <i style={{ background: CLAY }} />
                      {t('fields:details.clay')} {formatPct(soil.clayPercent, numberLocale)}
                    </li>
                    <li>
                      <i style={{ background: SILT }} />
                      {t('fields:details.siltLabel')} {formatPct(soil.siltPercent, numberLocale)}
                    </li>
                    <li>
                      <i style={{ background: SAND }} />
                      {t('fields:details.sand')} {formatPct(soil.sandPercent, numberLocale)}
                    </li>
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <p className="fd-empty">{collecting ? t('fields:details.collectingBody') : t('fields:details.noSoil')}</p>
          )}
          <div className="fd-foot">
            <span>{soil?.metadata?.source || t('fields:details.kickers.soil')}</span>
            <span>{soil?.metadata?.spatialResolution}</span>
          </div>
        </section>

        {hasCover ? (
          <section className="fd-panel fd-panel--cover">
            <div className="fd-panel-head">
              <div>
                <p className="fd-kicker">{t('fields:details.kickers.cover')}</p>
                <h3>{t('fields:intelligence.landCover')}</h3>
              </div>
              {landCover?.metadata ? (
                <InfoButton
                  label={sourceAria}
                  onClick={() =>
                    openInfo(
                      metadataInfo(
                        t('fields:intelligence.landCover'),
                        landCover.metadata,
                        t('fields:mapLayers.notes.land-cover')
                      )
                    )
                  }
                />
              ) : null}
            </div>
            {landCoverLabel ? (
              <p className="fd-stat">
                <strong>{landCoverLabel}</strong>
              </p>
            ) : null}
            {coverParts.length > 0 ? (
              <>
                <div className="fd-shares" aria-hidden>
                  {coverParts.map((part, index) => (
                    <i key={part.name} style={{ width: `${part.pct}%`, background: COVER[index % COVER.length] }} />
                  ))}
                </div>
                <ul className="fd-share-legend">
                  {coverParts.map((part, index) => (
                    <li key={part.name}>
                      <i style={{ background: COVER[index % COVER.length] }} />
                      {part.name} {formatPct(part.pct, numberLocale)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="fd-foot">
              <span>{landCover?.metadata?.source}</span>
            </div>
          </section>
        ) : null}

        <section className="fd-panel fd-panel--space">
          <div className="fd-panel-head">
            <div>
              <p className="fd-kicker">{t('fields:details.kickers.sentinel')}</p>
              <h3>{t('fields:details.vegetationTitle')}</h3>
            </div>
            {greenMeta ? (
              <InfoButton
                label={sourceAria}
                onClick={() =>
                  openInfo(
                    metadataInfo(t('fields:intelligence.vegetation'), greenMeta, t('fields:mapLayers.notes.ndvi'))
                  )
                }
              />
            ) : null}
          </div>
          {greenNdvi != null ? (
            <>
              {sentinelStatus.isStale && greenDate ? (
                <p className="fd-banner fd-banner--stale">
                  {t('fields:details.greenStale', {
                    when: formatPassDay(greenDate, numberLocale),
                    days: greenAgeDays ?? '—',
                  })}
                </p>
              ) : null}
              <div className="fd-stats">
                <div className="fd-stat">
                  <span>{t('fields:intelligence.ndviMean')}</span>
                  <strong>{formatNumber(greenNdvi, 2)}</strong>
                  <small>{ndviHintKey ? t(`fields:intelligence.meaning.${ndviHintKey}`) : null}</small>
                </div>
                {greenNdmi != null ? (
                  <div className="fd-stat">
                    <span>{t('fields:intelligence.ndmiMean')}</span>
                    <strong>{formatNumber(greenNdmi, 2)}</strong>
                    <small>
                      {greenDate
                        ? t('fields:details.greenPass', { when: formatPassDay(greenDate, numberLocale) })
                        : null}
                    </small>
                  </div>
                ) : (
                  <div className="fd-stat">
                    <span>{t('fields:details.lastClearPass')}</span>
                    <strong>{greenDate ? formatPassDay(greenDate, numberLocale) : '—'}</strong>
                    {greenAgeDays != null ? (
                      <small>{formatRelativeTime(greenDate as string)}</small>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="fd-meter">
                <div className="fd-meter-track">
                  <div className="fd-meter-fill" style={{ width: `${Math.min(100, greenNdvi * 100)}%` }} />
                </div>
                <div className="fd-meter-scale">
                  <span>0</span>
                  <span>NDVI</span>
                  <span>1</span>
                </div>
              </div>
              <dl className="fd-rows">
                <Row label={t('fields:details.cloudCover')} value={formatPct(greenCloud, numberLocale)} />
                <Row
                  label={t('fields:details.sentinelStatusLabel')}
                  value={t(`fields:details.sentinelStatus.${sentinelStatus.kind}`)}
                />
              </dl>
            </>
          ) : sentinelStatus.kind === 'Processing' ? (
            <p className="fd-empty">{t('fields:details.collectingBody')}</p>
          ) : (
            <p className="fd-empty">{t('fields:details.greenNone')}</p>
          )}
          <div className="fd-foot">
            <span>
              {greenMeta?.source || greenObs?.source || t('fields:details.kickers.sentinel')}
              {greenDate ? ` · ${formatPassDay(greenDate, numberLocale)}` : ''}
            </span>
            <Link className="fd-link" to={`/fields/${field.id}?tab=map&year=${year}`}>
              {t('fields:details.openMap')}
            </Link>
          </div>
        </section>

        <section className="fd-panel fd-panel--grove">
          <div className="fd-panel-head">
            <div>
              <p className="fd-kicker">{t('fields:details.kickers.grove')}</p>
              <h3>{t('fields:details.grove')}</h3>
            </div>
          </div>
          <dl className="fd-rows">
            <Row label={t('fields:overview.variety')} value={variety} />
            <Row
              label={t('fields:form.treeAge')}
              value={field.treeAge != null ? t('fields:details.yearsOld', { count: field.treeAge }) : null}
            />
            <Row
              label={t('fields:details.trees')}
              value={field.treeCount != null ? formatNumber(field.treeCount, 0) : null}
            />
            <Row
              label={t('fields:details.density')}
              value={
                density != null
                  ? t('fields:details.densityValue', { value: formatNumber(density, density >= 10 ? 0 : 1) })
                  : null
              }
            />
            <Row
              label={t('fields:form.irrigationLabel')}
              value={
                field.irrigationStatus ? irrigationType || t('fields:card.irrigationYes') : t('fields:details.rainfed')
              }
            />
            <Row label={t('fields:details.stage')} value={stage} />
            <Row label={t('fields:details.fruiting')} value={biennial} />
          </dl>
          {showWork
            ? workAnswers.slice(0, 4).map((row) => (
                <div key={row.id} className="fd-row">
                  <dt>{t(row.titleKey)}</dt>
                  <dd>{row.lines[0]}</dd>
                </div>
              ))
            : null}
          <div className="fd-foot">
            <span>{recordedInApp}</span>
            {canOwn && showWork ? (
              <Link className="fd-link" to={`/fields/${field.id}/work-profile`}>
                {t('fields:details.openPractices')}
              </Link>
            ) : null}
          </div>
        </section>

        <section className="fd-panel fd-panel--place">
          <div className="fd-panel-head">
            <div>
              <p className="fd-kicker">{t('fields:details.kickers.place')}</p>
              <h3>{t('fields:details.identity')}</h3>
            </div>
          </div>
          <dl className="fd-rows">
            <Row label={t('fields:form.name')} value={field.name} />
            <Row label={t('fields:overview.status')} value={getFieldStatusLabel(field.status, t)} />
            <Row label={t('fields:addField.cropType')} value={cropType} />
            <Row label={t('fields:locationLabel')} value={getFieldShortLocation(field)} />
            <Row label={t('fields:overview.area')} value={areaFull || areaPrimary} />
            {field.capabilities?.canViewSensitiveIdentity !== false ? (
              <Row label={t('fields:details.coordinates')} value={coords} />
            ) : null}
            <Row
              label={t('fields:details.boundary')}
              value={field.boundary ? t('fields:details.hasBoundary') : t('fields:details.noBoundary')}
            />
            {field.capabilities?.canViewSensitiveIdentity !== false && cadastre ? (
              <Row label="KAEK" value={cadastre.normalizedKaek || cadastre.kaek} />
            ) : null}
            <Row label={t('fields:addField.officialArea')} value={official} />
            <Row label={t('fields:addField.measuredArea')} value={measured} />
            <Row label={t('fields:addField.municipality')} value={cadastre?.municipality} />
            <Row label={t('fields:addField.prefecture')} value={cadastre?.prefecture} />
            <Row
              label={t('fields:details.updated')}
              value={field.updatedAt ? formatDateTime(field.updatedAt) : null}
            />
          </dl>
          {field.capabilities?.canViewSensitiveIdentity !== false && field.accessNotes ? (
            <p className="fd-note">{field.accessNotes}</p>
          ) : null}
          {cadastre ? <p className="fd-note">{t('fields:details.cadastreNote')}</p> : null}
          <div className="fd-foot">
            <span>{cadastre ? cadastreSourceLabel : recordedInApp}</span>
          </div>
        </section>

        <section className="fd-panel fd-span" aria-labelledby="fd-sources">
          <div className="fd-panel-head">
            <div>
              <p className="fd-kicker">{t('fields:details.kickers.sources')}</p>
              <h3 id="fd-sources">{t('fields:details.sources.title')}</h3>
            </div>
          </div>
          <p className="fd-empty">{t('fields:details.sources.introApi')}</p>
          <ul className="fd-ledger">
            {sources.map((source) => (
              <li key={source.id}>
                <div>
                  <strong>{source.title}</strong>
                  <span>{source.provider}</span>
                  {source.note ? <em>{source.note}</em> : null}
                </div>
                <div className="fd-ledger-meta">
                  {source.kind ? <span>{source.kind}</span> : null}
                  {source.updated ? <time>{formatDateTime(source.updated)}</time> : null}
                  {source.info ? (
                    <InfoButton label={sourceAria} onClick={() => openInfo(source.info)} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {canOwn ? (
          <section className="fd-panel fd-span fd-danger-zone" aria-labelledby="fd-danger">
            <div className="fd-panel-head">
              <div>
                <p className="fd-kicker">{t('fields:details.danger.kicker')}</p>
                <h3 id="fd-danger">{t('fields:details.danger.title')}</h3>
              </div>
            </div>
            <p className="fd-empty">{t('fields:details.danger.body')}</p>
            <ul className="fd-danger-list">
              <li>{t('fields:details.danger.tasks')}</li>
              <li>{t('fields:details.danger.photos')}</li>
              <li>{t('fields:details.danger.money')}</li>
              <li>{t('fields:details.danger.harvest')}</li>
              <li>{t('fields:details.danger.notes')}</li>
              <li>{t('fields:details.danger.chronologio')}</li>
              <li>{t('fields:details.danger.collaborators')}</li>
            </ul>
            <div className="fd-danger-actions">
              <button type="button" className="btn btn-secondary" disabled title={t('fields:page.archiveUnavailable')}>
                {t('fields:page.archive')}
              </button>
              {onDelete ? (
                <button type="button" className="btn btn-error" onClick={onDelete}>
                  {t('fields:deleteField')}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {sourceInfo ? <DataSourceInfoModal info={sourceInfo} onClose={() => setSourceInfo(null)} /> : null}
    </div>
  );
};

export default FieldDetailsTab;
