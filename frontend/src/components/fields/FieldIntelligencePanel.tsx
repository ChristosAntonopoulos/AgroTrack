import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, RefreshCw } from 'lucide-react';
import {
  DataSourceMetadata,
  FieldIntelligenceSummary,
  geospatialService,
} from '../../services/geospatialService';
import DataSourceInfoModal, { DataSourceInfo } from '../Common/DataSourceInfoModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import './FieldIntelligencePanel.css';

interface Props {
  fieldId: string;
}

interface Metric {
  id: string;
  label: string;
  value: string;
  hint?: string;
  featured?: boolean;
  tone?: 'good' | 'ok' | 'warn';
}

const formatNumber = (value: number | undefined, digits = 1, suffix = ''): string | undefined =>
  value == null ? undefined : `${value.toFixed(digits)}${suffix}`;

const vegetationMeaningKey = (ndvi?: number): 'high' | 'medium' | 'low' | undefined => {
  if (ndvi == null) return undefined;
  if (ndvi >= 0.6) return 'high';
  if (ndvi >= 0.35) return 'medium';
  return 'low';
};

/**
 * Field-level summary of everything the geospatial pipeline knows: vegetation,
 * terrain, land cover, soil and environmental context. Every block carries its own
 * provenance, because the numbers come from sources with very different precision.
 */
const FieldIntelligencePanel: React.FC<Props> = ({ fieldId }) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const [summary, setSummary] = useState<FieldIntelligenceSummary>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSummary(await geospatialService.getIntelligence(fieldId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!summary || summary.vegetation) return;
    void geospatialService.refreshIntelligence(fieldId).catch(() => undefined);
  }, [fieldId, summary]);

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;

  const openInfo = (title: string, metadata?: DataSourceMetadata, calculation?: string) => {
    if (!metadata) return;
    setSourceInfo({
      title,
      source: metadata.source,
      sourceUrl: metadata.sourceUrl,
      attribution: metadata.attribution,
      licence: metadata.licence,
      spatialResolution: metadata.spatialResolution,
      temporalResolution: metadata.temporalResolution,
      valueType: metadata.valueType,
      sourceDate: metadata.sourceDate,
      lastUpdatedAt: metadata.lastUpdatedAt,
      calculation,
      note: metadata.confidenceNote,
    });
  };

  const refreshIntelligence = async () => {
    setRefreshing(true);
    try {
      await geospatialService.refreshIntelligence(fieldId);
      window.setTimeout(() => {
        void load();
      }, 8000);
    } catch {
      // A failed queue request is not worth blocking the panel over.
    } finally {
      setRefreshing(false);
    }
  };

  const vegetationMetrics = useMemo<Metric[]>(() => {
    const vegetation = summary?.vegetation;
    if (!vegetation) return [];
    const metrics: Metric[] = [];

    if (vegetation.ndviMean != null) {
      const tone = vegetationMeaningKey(vegetation.ndviMean);
      metrics.push({
        id: 'ndvi',
        label: t('fields:intelligence.ndviMean'),
        value: vegetation.ndviMean.toFixed(2),
        featured: true,
        tone: tone === 'high' ? 'good' : tone === 'medium' ? 'ok' : 'warn',
      });
    }
    if (vegetation.ndmiMean != null) {
      metrics.push({
        id: 'ndmi',
        label: t('fields:intelligence.ndmiMean'),
        value: vegetation.ndmiMean.toFixed(2),
        featured: true,
      });
    }
    if (vegetation.ndviTrendLabel) {
      metrics.push({ id: 'trend', label: t('fields:intelligence.ndviTrend'), value: vegetation.ndviTrendLabel });
    }
    if (vegetation.ndviChangePercent != null) {
      metrics.push({
        id: 'change',
        label: t('fields:intelligence.ndviChange'),
        value: `${vegetation.ndviChangePercent > 0 ? '+' : ''}${vegetation.ndviChangePercent.toFixed(1)}%`,
        hint: vegetation.comparedToObservationDate
          ? t('fields:intelligence.comparedTo', { date: formatDate(vegetation.comparedToObservationDate) })
          : undefined,
      });
    }
    if (vegetation.areaBelowBaselinePercent != null) {
      metrics.push({
        id: 'declining',
        label: t('fields:intelligence.areaDeclining'),
        value: `${vegetation.areaBelowBaselinePercent.toFixed(0)}%`,
      });
    }
    if (vegetation.ndreMean != null) {
      metrics.push({ id: 'ndre', label: t('fields:intelligence.ndreMean'), value: vegetation.ndreMean.toFixed(2) });
    }
    if (vegetation.ndwiMean != null) {
      metrics.push({ id: 'ndwi', label: t('fields:intelligence.ndwiMean'), value: vegetation.ndwiMean.toFixed(2) });
    }
    if (vegetation.saviMean != null) {
      metrics.push({ id: 'savi', label: t('fields:intelligence.saviMean'), value: vegetation.saviMean.toFixed(2) });
    }
    return metrics;
  }, [summary?.vegetation, t, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const terrainMetrics = useMemo<Metric[]>(() => {
    const terrain = summary?.terrain;
    if (!terrain) return [];
    const metrics: Metric[] = [];

    const elevation = formatNumber(terrain.averageElevationM, 0, ' m');
    if (elevation) {
      metrics.push({
        id: 'elevation',
        label: t('fields:intelligence.elevation'),
        value: elevation,
        hint:
          terrain.minElevationM != null && terrain.maxElevationM != null
            ? `${terrain.minElevationM.toFixed(0)}–${terrain.maxElevationM.toFixed(0)} m`
            : undefined,
      });
    }
    const slope = formatNumber(terrain.averageSlopePercent, 1, '%');
    if (slope) {
      metrics.push({
        id: 'slope',
        label: t('fields:intelligence.slope'),
        value: slope,
        hint: terrain.dominantSlopeClass
          ? t(`fields:intelligence.slopeClasses.${terrain.dominantSlopeClass}`, terrain.dominantSlopeClass)
          : undefined,
      });
    }
    if (terrain.dominantAspect) {
      metrics.push({
        id: 'aspect',
        label: t('fields:intelligence.aspect'),
        value: t(`fields:intelligence.aspects.${terrain.dominantAspect}`, terrain.dominantAspect),
      });
    }
    return metrics;
  }, [summary?.terrain, t]);

  const groundMetrics = useMemo<Metric[]>(() => {
    const metrics: Metric[] = [];
    const landCover = summary?.landCover;
    const soil = summary?.soil;

    if (landCover?.dominantClass) {
      const share = landCover.percentByClass?.[landCover.dominantClass];
      metrics.push({
        id: 'landCover',
        label: t('fields:intelligence.landCover'),
        value: t(`fields:intelligence.landCoverClasses.${landCover.dominantClass}`, landCover.dominantClass),
        hint: share != null ? `${share.toFixed(0)}%` : undefined,
      });
    } else {
      metrics.push({
        id: 'landCover',
        label: t('fields:intelligence.landCover'),
        value: t('fields:intelligence.landCoverUnknown'),
      });
    }
    if (soil?.ph != null) {
      metrics.push({ id: 'ph', label: t('fields:intelligence.soilPh'), value: soil.ph.toFixed(1) });
    }
    if (soil?.clayPercent != null && soil?.sandPercent != null) {
      metrics.push({
        id: 'texture',
        label: t('fields:intelligence.soilTexture'),
        value: t('fields:intelligence.soilTextureValue', {
          clay: soil.clayPercent.toFixed(0),
          sand: soil.sandPercent.toFixed(0),
        }),
      });
    }
    if (soil?.organicCarbonPercent != null) {
      metrics.push({
        id: 'organic',
        label: t('fields:intelligence.organicCarbon'),
        value: `${soil.organicCarbonPercent.toFixed(1)}%`,
      });
    }
    return metrics;
  }, [summary?.landCover, summary?.soil, t]);

  const environmentMetrics = useMemo<Metric[]>(() => {
    const environment = summary?.environment;
    if (!environment) return [];
    const metrics: Metric[] = [];

    if (environment.intersectsNatura) {
      metrics.push({
        id: 'natura',
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaInside'),
        hint: environment.nearestNaturaSite,
      });
    } else if (environment.distanceToNearestNaturaKm != null) {
      metrics.push({
        id: 'natura',
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaDistance', {
          distance: environment.distanceToNearestNaturaKm.toFixed(1),
        }),
        hint: environment.nearestNaturaSite,
      });
    } else {
      metrics.push({
        id: 'natura',
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaUnknown'),
      });
    }

    if (environment.closestFire) {
      metrics.push({
        id: 'fire',
        label: t('fields:intelligence.fire'),
        value: t('fields:intelligence.fireDistance', {
          distance: environment.closestFire.distanceKm.toFixed(1),
          direction: environment.closestFire.direction ?? '',
        }).trim(),
        hint: formatDate(environment.closestFire.detectedAt),
      });
    } else {
      metrics.push({
        id: 'fire',
        label: t('fields:intelligence.fire'),
        value: t('fields:intelligence.fireNone'),
      });
    }
    return metrics;
  }, [summary?.environment, t, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="field-intel field-intel--loading">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (failed || !summary) {
    return (
      <div className="field-intel field-intel--empty">
        <p>{t('fields:intelligence.unavailable')}</p>
        <button type="button" onClick={load}>
          {t('common:retry')}
        </button>
      </div>
    );
  }

  const hasAnyData =
    vegetationMetrics.length > 0 ||
    terrainMetrics.length > 0 ||
    groundMetrics.length > 0 ||
    environmentMetrics.length > 0;

  const meaning = vegetationMeaningKey(summary.vegetation?.ndviMean);
  const featuredVegetation = vegetationMetrics.filter((metric) => metric.featured);
  const extraVegetation = vegetationMetrics.filter((metric) => !metric.featured);
  const compactSections: Array<{ key: string; title: string; metrics: Metric[]; metadata?: DataSourceMetadata }> = [
    { key: 'terrain', title: t('fields:intelligence.terrain'), metrics: terrainMetrics, metadata: summary.terrain?.metadata },
    {
      key: 'ground',
      title: t('fields:intelligence.ground'),
      metrics: groundMetrics,
      metadata: summary.soil?.metadata ?? summary.landCover?.metadata,
    },
    {
      key: 'environment',
      title: t('fields:intelligence.environment'),
      metrics: environmentMetrics,
      metadata: summary.environment?.metadata,
    },
  ];

  return (
    <div className="field-intel">
      <div className="field-intel-header">
        <h3>{t('fields:intelligence.title')}</h3>
        <div className="field-intel-header-actions">
          <span className={`field-intel-status field-intel-status--${summary.processingStatus}`}>
            {t(`fields:intelligence.status.${summary.processingStatus}`, summary.processingStatus)}
          </span>
          <button
            type="button"
            className="field-intel-refresh"
            onClick={refreshIntelligence}
            disabled={refreshing}
            aria-label={t('fields:intelligence.refresh')}
            title={t('fields:intelligence.refresh')}
          >
            <RefreshCw size={14} aria-hidden className={refreshing ? 'spinning' : undefined} />
          </button>
        </div>
      </div>

      {meaning ? (
        <p className={`field-intel-verdict field-intel-verdict--${meaning}`}>
          {t(`fields:intelligence.meaning.${meaning}`)}
        </p>
      ) : null}

      {!hasAnyData ? (
        <p className="field-intel-pending">
          {summary.processingStatus === 'failed'
            ? t('fields:intelligence.failed')
            : t('fields:intelligence.processing')}
        </p>
      ) : null}

      <div className="field-intel-grid">
      <section className="field-intel-section">
        <div className="field-intel-section-head">
          <h4>{t('fields:intelligence.vegetation')}</h4>
          {summary.vegetation?.metadata ? (
            <button
              type="button"
              className="field-intel-info"
              onClick={() => openInfo(t('fields:intelligence.vegetation'), summary.vegetation?.metadata)}
              aria-label={t('fields:intelligence.aboutSource', { section: t('fields:intelligence.vegetation') })}
            >
              <Info size={14} aria-hidden />
            </button>
          ) : null}
        </div>

        {featuredVegetation.length > 0 ? (
          <div className="field-intel-tiles">
            {featuredVegetation.map((metric) => (
              <div className={`field-intel-tile${metric.tone ? ` field-intel-tile--${metric.tone}` : ''}`} key={metric.id}>
                <span className="field-intel-tile-label">{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="field-intel-empty">{t('fields:intelligence.notAvailable')}</p>
        )}

        {extraVegetation.length > 0 ? (
          <dl className="field-intel-rows">
            {extraVegetation.map((metric) => (
              <div className="field-intel-row" key={metric.id}>
                <dt>{metric.label}</dt>
                <dd>
                  {metric.value}
                  {metric.hint ? <em>{metric.hint}</em> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {summary.vegetation?.observationDate ? (
          <span className="field-intel-observed">
            {t('fields:intelligence.observed', { date: formatDate(summary.vegetation.observationDate) })}
            {summary.vegetation.fieldCloudCoverPercent != null
              ? ` · ${t('fields:intelligence.cloudOverField', {
                  percent: Math.round(summary.vegetation.fieldCloudCoverPercent),
                })}`
              : ''}
          </span>
        ) : null}
      </section>

      {compactSections.map((section) => (
        <section className="field-intel-section" key={section.key}>
          <div className="field-intel-section-head">
            <h4>{section.title}</h4>
            {section.metadata ? (
              <button
                type="button"
                className="field-intel-info"
                onClick={() => openInfo(section.title, section.metadata)}
                aria-label={t('fields:intelligence.aboutSource', { section: section.title })}
              >
                <Info size={14} aria-hidden />
              </button>
            ) : null}
          </div>

          {section.metrics.length > 0 ? (
            <dl className="field-intel-rows">
              {section.metrics.map((metric) => (
                <div className="field-intel-row" key={metric.id}>
                  <dt>{metric.label}</dt>
                  <dd>
                    {metric.value}
                    {metric.hint ? <em>{metric.hint}</em> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="field-intel-empty">{t('fields:intelligence.notAvailable')}</p>
          )}
        </section>
      ))}
      </div>

      {sourceInfo ? <DataSourceInfoModal info={sourceInfo} onClose={() => setSourceInfo(undefined)} /> : null}
    </div>
  );
};

export default FieldIntelligencePanel;
