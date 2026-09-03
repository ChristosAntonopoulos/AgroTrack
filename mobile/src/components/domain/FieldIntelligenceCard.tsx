import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  DataSourceMetadata,
  FieldIntelligenceSummary,
  geospatialService,
} from '../../services/geospatialService';
import { typography, spacing } from '../../theme';

interface Props {
  fieldId: string;
}

interface Metric {
  label: string;
  value: string;
  hint?: string;
}

interface Block {
  key: string;
  title: string;
  metrics: Metric[];
  metadata?: DataSourceMetadata;
  footnote?: string;
  meaning?: string;
}

const vegetationMeaningKey = (ndvi?: number): 'high' | 'medium' | 'low' | undefined => {
  if (ndvi == null) return undefined;
  if (ndvi >= 0.6) return 'high';
  if (ndvi >= 0.35) return 'medium';
  return 'low';
};

/**
 * Field snapshot for the phone: vegetation, land, soil and nearby risks in
 * everyday language, with the caveat that belongs to each source.
 */
const FieldIntelligenceCard: React.FC<Props> = ({ fieldId }) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common']);
  const [summary, setSummary] = useState<FieldIntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setSummary(await geospatialService.getIntelligence(fieldId));
    setLoading(false);
  }, [fieldId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!summary || summary.vegetation) return;
    void geospatialService.refreshIntelligence(fieldId);
  }, [fieldId, summary]);

  const formatDate = useCallback(
    (value?: string) =>
      value
        ? new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
        : undefined,
    [i18n.language]
  );

  const refreshIntelligence = async () => {
    setRefreshing(true);
    try {
      await geospatialService.refreshIntelligence(fieldId);
      setTimeout(() => {
        void load();
      }, 8000);
    } finally {
      setRefreshing(false);
    }
  };

  const blocks = useMemo<Block[]>(() => {
    if (!summary) return [];

    const vegetation = summary.vegetation;
    const vegetationMetrics: Metric[] = [];
    if (vegetation?.ndviMean != null) {
      vegetationMetrics.push({ label: t('fields:intelligence.ndviMean'), value: vegetation.ndviMean.toFixed(2) });
    }
    if (vegetation?.ndviTrendLabel) {
      vegetationMetrics.push({ label: t('fields:intelligence.ndviTrend'), value: vegetation.ndviTrendLabel });
    }
    if (vegetation?.ndviChangePercent != null) {
      vegetationMetrics.push({
        label: t('fields:intelligence.ndviChange'),
        value: `${vegetation.ndviChangePercent > 0 ? '+' : ''}${vegetation.ndviChangePercent.toFixed(1)}%`,
      });
    }
    if (vegetation?.areaBelowBaselinePercent != null) {
      vegetationMetrics.push({
        label: t('fields:intelligence.areaDeclining'),
        value: `${vegetation.areaBelowBaselinePercent.toFixed(0)}%`,
      });
    }
    if (vegetation?.ndmiMean != null) {
      vegetationMetrics.push({ label: t('fields:intelligence.ndmiMean'), value: vegetation.ndmiMean.toFixed(2) });
    }
    if (vegetation?.ndreMean != null) {
      vegetationMetrics.push({ label: t('fields:intelligence.ndreMean'), value: vegetation.ndreMean.toFixed(2) });
    }
    if (vegetation?.ndwiMean != null) {
      vegetationMetrics.push({ label: t('fields:intelligence.ndwiMean'), value: vegetation.ndwiMean.toFixed(2) });
    }
    if (vegetation?.saviMean != null) {
      vegetationMetrics.push({ label: t('fields:intelligence.saviMean'), value: vegetation.saviMean.toFixed(2) });
    }
    const meaningKey = vegetationMeaningKey(vegetation?.ndviMean);

    const terrain = summary.terrain;
    const terrainMetrics: Metric[] = [];
    if (terrain?.averageElevationM != null) {
      terrainMetrics.push({
        label: t('fields:intelligence.elevation'),
        value: `${terrain.averageElevationM.toFixed(0)} m`,
      });
    }
    if (terrain?.averageSlopePercent != null) {
      terrainMetrics.push({
        label: t('fields:intelligence.slope'),
        value: `${terrain.averageSlopePercent.toFixed(1)}%`,
        hint: terrain.dominantSlopeClass
          ? t(`fields:intelligence.slopeClasses.${terrain.dominantSlopeClass}`, {
              defaultValue: terrain.dominantSlopeClass,
            })
          : undefined,
      });
    }
    if (terrain?.dominantAspect) {
      terrainMetrics.push({
        label: t('fields:intelligence.aspect'),
        value: t(`fields:intelligence.aspects.${terrain.dominantAspect}`, {
          defaultValue: terrain.dominantAspect,
        }),
      });
    }

    const groundMetrics: Metric[] = [];
    if (summary.landCover?.dominantClass) {
      groundMetrics.push({
        label: t('fields:intelligence.landCover'),
        value: t(`fields:intelligence.landCoverClasses.${summary.landCover.dominantClass}`, {
          defaultValue: summary.landCover.dominantClass,
        }),
      });
    } else {
      groundMetrics.push({
        label: t('fields:intelligence.landCover'),
        value: t('fields:intelligence.landCoverUnknown'),
      });
    }
    if (summary.soil?.ph != null) {
      groundMetrics.push({ label: t('fields:intelligence.soilPh'), value: summary.soil.ph.toFixed(1) });
    }
    if (summary.soil?.clayPercent != null && summary.soil?.sandPercent != null) {
      groundMetrics.push({
        label: t('fields:intelligence.soilTexture'),
        value: t('fields:intelligence.soilTextureValue', {
          clay: summary.soil.clayPercent.toFixed(0),
          sand: summary.soil.sandPercent.toFixed(0),
        }),
      });
    }
    if (summary.soil?.organicCarbonPercent != null) {
      groundMetrics.push({
        label: t('fields:intelligence.organicCarbon'),
        value: `${summary.soil.organicCarbonPercent.toFixed(1)}%`,
      });
    }

    const environment = summary.environment;
    const environmentMetrics: Metric[] = [];
    if (environment?.intersectsNatura) {
      environmentMetrics.push({
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaInside'),
        hint: environment.nearestNaturaSite,
      });
    } else if (environment?.distanceToNearestNaturaKm != null) {
      environmentMetrics.push({
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaDistance', {
          distance: environment.distanceToNearestNaturaKm.toFixed(1),
        }),
        hint: environment.nearestNaturaSite,
      });
    } else {
      environmentMetrics.push({
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaUnknown'),
      });
    }
    if (environment?.closestFire) {
      environmentMetrics.push({
        label: t('fields:intelligence.fire'),
        value: t('fields:intelligence.fireDistance', {
          distance: environment.closestFire.distanceKm.toFixed(1),
          direction: environment.closestFire.direction ?? '',
        }).trim(),
        hint: formatDate(environment.closestFire.detectedAt),
      });
    } else {
      environmentMetrics.push({
        label: t('fields:intelligence.fire'),
        value: t('fields:intelligence.fireNone'),
      });
    }

    return [
      {
        key: 'vegetation',
        title: t('fields:intelligence.vegetation'),
        metrics: vegetationMetrics,
        metadata: vegetation?.metadata,
        meaning: meaningKey ? t(`fields:intelligence.meaning.${meaningKey}`) : undefined,
        footnote: vegetation?.observationDate
          ? t('fields:intelligence.observed', { date: formatDate(vegetation.observationDate) })
          : undefined,
      },
      {
        key: 'terrain',
        title: t('fields:intelligence.terrain'),
        metrics: terrainMetrics,
        metadata: terrain?.metadata,
      },
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
        metadata: environment?.metadata,
      },
    ];
  }, [summary, t, formatDate]);

  if (loading) {
    return (
      <View style={[styles.card, styles.centered, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('fields:intelligence.unavailable')}
        </Text>
      </View>
    );
  }

  const hasAnyData = blocks.some((block) => block.metrics.some((metric) => metric.value !== t('fields:intelligence.notAvailable')));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.header}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {t('fields:intelligence.intro')}
        </Text>
        <Pressable
          onPress={refreshIntelligence}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel={t('fields:intelligence.refresh')}
          style={styles.refresh}
        >
          <Ionicons
            name="refresh"
            size={16}
            color={refreshing ? colors.textTertiary : colors.textSecondary}
          />
        </Pressable>
      </View>
      <Text style={[styles.status, { color: colors.textSecondary }]}>
        {t(`fields:intelligence.status.${summary.processingStatus}`, {
          defaultValue: summary.processingStatus,
        })}
      </Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        {t('fields:intelligence.sourceHint')}
      </Text>

      {!hasAnyData ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {summary.processingStatus === 'failed'
            ? t('fields:intelligence.failed')
            : t('fields:intelligence.processing')}
        </Text>
      ) : null}

      {blocks.map((block) => {
        const showSource = expanded === block.key;
        return (
          <Pressable
            key={block.key}
            style={[styles.block, { borderTopColor: colors.borderLight }]}
            onPress={() => setExpanded(showSource ? undefined : block.key)}
            accessibilityRole="button"
            accessibilityLabel={t('fields:intelligence.aboutSource', { section: block.title })}
          >
            <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>{block.title}</Text>

            {block.metrics.length > 0 ? (
              <View style={styles.metrics}>
                {block.metrics.map((metric) => (
                  <View key={metric.label} style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      {metric.label}
                    </Text>
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                      {metric.value}
                    </Text>
                    {metric.hint ? (
                      <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
                        {metric.hint}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
                {t('fields:intelligence.notAvailable')}
              </Text>
            )}

            {block.meaning ? (
              <Text style={[styles.meaning, { color: colors.textPrimary }]}>{block.meaning}</Text>
            ) : null}

            {block.footnote ? (
              <Text style={[styles.metricHint, { color: colors.textSecondary }]}>{block.footnote}</Text>
            ) : null}

            {block.metadata?.confidenceNote ? (
              <Text style={[styles.metricHint, { color: colors.warning }]}>
                {block.metadata.confidenceNote}
              </Text>
            ) : null}

            {showSource && block.metadata ? (
              <View style={styles.source}>
                <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
                  {block.metadata.source}
                  {block.metadata.spatialResolution ? ` · ${block.metadata.spatialResolution}` : ''}
                  {block.metadata.valueType ? ` · ${block.metadata.valueType}` : ''}
                </Text>
                {block.metadata.attribution ? (
                  <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
                    {block.metadata.attribution}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.sm,
  },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  intro: { ...typography.styles.caption, fontSize: 12, lineHeight: 17, flex: 1 },
  refresh: { padding: 4 },
  status: { ...typography.styles.caption, fontSize: 11 },
  hint: { ...typography.styles.caption, fontSize: 11 },
  note: { ...typography.styles.caption, lineHeight: 16 },
  block: { paddingTop: spacing.sm, borderTopWidth: 1, gap: 4 },
  blockTitle: { ...typography.styles.caption, fontWeight: '700', fontSize: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { minWidth: 90 },
  metricLabel: { ...typography.styles.caption, fontSize: 11 },
  metricValue: { ...typography.styles.bodySmall, fontWeight: '600' },
  metricHint: { ...typography.styles.caption, fontSize: 10, lineHeight: 14 },
  meaning: { ...typography.styles.caption, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  source: { marginTop: 2, gap: 2 },
});

export default FieldIntelligenceCard;
