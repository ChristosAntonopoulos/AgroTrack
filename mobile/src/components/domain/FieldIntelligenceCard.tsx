import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DataSourceMetadata, geospatialService } from '../../services/geospatialService';
import { useFieldSpatialDossier } from '../../hooks/useFieldSpatialDossier';
import { formatPassDay, nearbyFire, ndviBand } from '../../utils/fieldDetailsGeo';
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

/**
 * Compact map-tab snapshot. Same greenness and empty-state rules as field details.
 */
const FieldIntelligenceCard: React.FC<Props> = ({ fieldId }) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { intel, collecting, terrain, soil, landCover, environment, green } =
    useFieldSpatialDossier(fieldId);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const refreshIntelligence = async () => {
    setRefreshing(true);
    try {
      await geospatialService.refreshIntelligence(fieldId);
    } finally {
      setRefreshing(false);
    }
  };

  const blocks = useMemo<Block[]>(() => {
    const vegetationMetrics: Metric[] = [];
    if (green.fresh && green.ndvi != null) {
      vegetationMetrics.push({
        label: t('fields:intelligence.ndviMean'),
        value: green.ndvi.toFixed(2),
      });
      if (green.ndmi != null) {
        vegetationMetrics.push({
          label: t('fields:intelligence.ndmiMean'),
          value: green.ndmi.toFixed(2),
        });
      }
    }
    const meaningKey = green.fresh ? ndviBand(green.ndvi) : null;

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
    if (landCover?.dominantClass) {
      groundMetrics.push({
        label: t('fields:intelligence.landCover'),
        value: t(`fields:intelligence.landCoverClasses.${landCover.dominantClass}`, {
          defaultValue: landCover.dominantClass,
        }),
      });
    }
    if (soil?.ph != null) {
      groundMetrics.push({ label: t('fields:intelligence.soilPh'), value: soil.ph.toFixed(1) });
    }
    if (soil?.clayPercent != null && soil?.sandPercent != null) {
      groundMetrics.push({
        label: t('fields:intelligence.soilTexture'),
        value: t('fields:intelligence.soilTextureValue', {
          clay: soil.clayPercent.toFixed(0),
          sand: soil.sandPercent.toFixed(0),
        }),
      });
    }
    if (soil?.organicCarbonPercent != null) {
      groundMetrics.push({
        label: t('fields:intelligence.organicCarbon'),
        value: `${soil.organicCarbonPercent.toFixed(1)}%`,
      });
    }

    const fire = nearbyFire(environment);
    const environmentMetrics: Metric[] = [];
    if (environment?.intersectsNatura) {
      environmentMetrics.push({
        label: t('fields:intelligence.natura'),
        value: t('fields:intelligence.naturaInside'),
        hint: environment.nearestNaturaSite,
      });
    }
    if (fire) {
      environmentMetrics.push({
        label: t('fields:intelligence.fire'),
        value: t('fields:intelligence.fireDistance', {
          distance: fire.distanceKm.toFixed(1),
          direction: fire.direction ?? '',
        }).trim(),
      });
    }

    const vegetationFootnote = green.fresh && green.date
      ? t('fields:intelligence.observed', { date: formatPassDay(green.date, numberLocale) })
      : green.stale && green.date
        ? t('fields:details.greenStale', {
            when: formatPassDay(green.date, numberLocale),
            days: green.ageDays ?? '—',
          })
        : t('fields:details.greenNone');

    const next: Block[] = [
      {
        key: 'vegetation',
        title: t('fields:intelligence.vegetation'),
        metrics: vegetationMetrics,
        metadata: green.metadata,
        meaning: meaningKey ? t(`fields:intelligence.meaning.${meaningKey}`) : undefined,
        footnote: vegetationFootnote,
      },
    ];
    if (terrainMetrics.length) {
      next.push({
        key: 'terrain',
        title: t('fields:intelligence.terrain'),
        metrics: terrainMetrics,
        metadata: terrain?.metadata,
      });
    }
    if (groundMetrics.length) {
      next.push({
        key: 'ground',
        title: t('fields:intelligence.ground'),
        metrics: groundMetrics,
        metadata: soil?.metadata ?? landCover?.metadata,
      });
    }
    if (environmentMetrics.length) {
      next.push({
        key: 'environment',
        title: t('fields:intelligence.environment'),
        metrics: environmentMetrics,
        metadata: environment?.metadata,
      });
    }
    return next;
  }, [environment, green, landCover, numberLocale, soil, t, terrain]);

  if (!intel && collecting) {
    return (
      <View style={[styles.card, styles.centered, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!intel && !terrain && !soil) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('fields:intelligence.unavailable')}
        </Text>
      </View>
    );
  }

  const vegetationBlock = blocks.find((block) => block.key === 'vegetation');
  const meaningKey = green.fresh ? ndviBand(green.ndvi) : null;
  const verdictColor =
    meaningKey === 'high' ? colors.success : meaningKey === 'medium' ? colors.warning : colors.error;
  const verdictBg =
    meaningKey === 'high' ? colors.successLight : meaningKey === 'medium' ? colors.warningLight : colors.errorLight;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('fields:intelligence.title')}
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
            size={18}
            color={refreshing ? colors.textTertiary : colors.textSecondary}
          />
        </Pressable>
      </View>
      {meaningKey && vegetationBlock?.meaning ? (
        <View style={[styles.verdict, { backgroundColor: verdictBg }]}>
          <Text style={[styles.verdictText, { color: verdictColor }]}>{vegetationBlock.meaning}</Text>
        </View>
      ) : null}
      <Text style={[styles.status, { color: colors.textSecondary }]}>
        {t(`fields:intelligence.status.${intel?.processingStatus ?? 'pending'}`, {
          defaultValue: intel?.processingStatus ?? 'pending',
        })}
      </Text>

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
              <View style={block.key === 'vegetation' ? styles.tiles : styles.rows}>
                {block.metrics.map((metric, index) => (
                  <View
                    key={metric.label}
                    style={
                      block.key === 'vegetation' && index < 2
                        ? [styles.tile, { backgroundColor: colors.surfaceMuted }]
                        : styles.row
                    }
                  >
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      {metric.label}
                    </Text>
                    <Text
                      style={[
                        block.key === 'vegetation' && index < 2 ? styles.tileValue : styles.metricValue,
                        { color: colors.textPrimary },
                      ]}
                    >
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
            ) : null}

            {block.footnote ? (
              <Text style={[styles.metricHint, { color: colors.textSecondary }]}>{block.footnote}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.styles.bodySmall, fontWeight: '700', fontSize: 16, flex: 1 },
  refresh: { padding: 6 },
  verdict: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  verdictText: { ...typography.styles.bodySmall, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  status: { ...typography.styles.caption, fontSize: 12 },
  note: { ...typography.styles.caption, lineHeight: 16 },
  block: { paddingTop: spacing.sm, borderTopWidth: 1, gap: 6 },
  blockTitle: { ...typography.styles.bodySmall, fontWeight: '700', fontSize: 14 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, minWidth: 120, borderRadius: 10, padding: 10, gap: 2 },
  tileValue: { ...typography.styles.h2, fontWeight: '800', fontSize: 22 },
  rows: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  metricLabel: { ...typography.styles.caption, fontSize: 13, flex: 1 },
  metricValue: { ...typography.styles.bodySmall, fontWeight: '700', fontSize: 14 },
  metricHint: { ...typography.styles.caption, fontSize: 11, lineHeight: 15, width: '100%' },
  source: { marginTop: 2, gap: 2 },
});

export default FieldIntelligenceCard;
