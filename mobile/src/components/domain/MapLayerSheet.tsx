import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { MapLayerData, MapLayerDefinition, SatelliteDate } from '../../services/geospatialService';
import { MapLayerType } from '../../utils/mapLayers';
import { typography, spacing } from '../../theme';

const OPACITY_STEPS = [0.35, 0.55, 0.75, 1];
const BASE_OPTIONS: MapLayerType[] = ['satellite', 'standard'];
const PRIMARY_IDS = ['truecolor', 'ndvi', 'ndmi', 'ndwi', 'savi'];
const MORE_IDS = ['ndvi-change', 'ndre'];

const LAYER_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  truecolor: 'image-outline',
  ndvi: 'leaf-outline',
  ndmi: 'water-outline',
  ndwi: 'rainy-outline',
  savi: 'flower-outline',
  'ndvi-change': 'git-compare-outline',
  ndre: 'color-filter-outline',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  baseLayer: MapLayerType;
  onBaseLayerChange: (layer: MapLayerType) => void;
  overlays: MapLayerDefinition[];
  activeLayerId?: string;
  onActiveLayerChange: (layerId?: string) => void;
  activeLayer?: MapLayerData;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  dates: SatelliteDate[];
  selectedDateId?: string;
  onSelectDate: (observationId: string) => void;
  satelliteLayerActive: boolean;
}

/**
 * Bottom sheet for choosing what the field map shows. Only one data overlay can be
 * active at a time, because stacked index rasters hide each other and would make the
 * colours unreadable.
 */
const MapLayerSheet: React.FC<Props> = ({
  visible,
  onClose,
  baseLayer,
  onBaseLayerChange,
  overlays,
  activeLayerId,
  onActiveLayerChange,
  activeLayer,
  opacity,
  onOpacityChange,
  dates,
  selectedDateId,
  onSelectDate,
  satelliteLayerActive,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common']);
  const [showMore, setShowMore] = useState(false);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  const layerName = (definition: MapLayerDefinition) =>
    t(`fields:mapLayers.looks.${definition.id}`, {
      defaultValue: t(`fields:mapLayers.names.${definition.id}`, { defaultValue: definition.name }),
    });

  const activeDefinition = overlays.find((o) => o.id === activeLayerId);
  const legend = activeLayer?.legend;

  const { primary, more } = useMemo(() => {
    const byId = new Map(overlays.map((layer) => [layer.id, layer]));
    const primaryLayers = PRIMARY_IDS.map((id) => byId.get(id)).filter(
      (layer): layer is MapLayerDefinition => Boolean(layer)
    );
    const moreLayers = [
      ...MORE_IDS.map((id) => byId.get(id)).filter((layer): layer is MapLayerDefinition => Boolean(layer)),
      ...overlays.filter((layer) => !PRIMARY_IDS.includes(layer.id) && !MORE_IDS.includes(layer.id)),
    ];
    return { primary: primaryLayers, more: moreLayers };
  }, [overlays]);

  const softChip = (active: boolean) => ({
    borderColor: active ? colors.oliveBorder : colors.border,
    backgroundColor: active ? colors.primaryLight : colors.surface,
  });

  const renderLayer = (definition: MapLayerDefinition | undefined, id: string) => {
    const active = definition ? activeLayerId === definition.id : !activeLayerId;
    const label = definition
      ? layerName(definition)
      : t('fields:mapLayers.looks.none', { defaultValue: t('fields:mapLayers.none') });
    const icon = definition ? LAYER_ICON[definition.id] || 'layers-outline' : 'map-outline';
    return (
      <Pressable
        key={id}
        style={[
          styles.option,
          {
            borderColor: active ? colors.oliveBorder : colors.border,
            backgroundColor: active ? colors.primaryLight : colors.surface,
          },
        ]}
        onPress={() => onActiveLayerChange(definition?.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <View style={styles.optionText}>
          <View style={styles.optionRow}>
            <Text style={{ color: active ? colors.primary : colors.textSecondary, width: 16 }}>
              {active ? '●' : '○'}
            </Text>
            <Ionicons name={icon} size={16} color={active ? colors.primary : colors.textSecondary} />
            <Text style={{ color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '500' }}>
              {label}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Sheet
      open={visible}
      onClose={onClose}
      edge="end"
      title={t('fields:mapWorkspace.whatToSee', { defaultValue: t('fields:mapLayers.title') })}
      footer={<Button title={t('common:close')} onPress={onClose} />}
    >
      <Text style={[styles.section, { color: colors.textSecondary }]}>
        {t('fields:mapLayers.baseLayer')}
      </Text>
      <View style={styles.chipRow}>
        {BASE_OPTIONS.map((option) => {
          const active = baseLayer === option;
          return (
            <Pressable
              key={option}
              onPress={() => onBaseLayerChange(option)}
              style={[styles.chip, softChip(active)]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={{ color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '600' : '500' }}>
                {option === 'satellite'
                  ? t('fields:mapLayerSatellite')
                  : t('fields:mapLayerStreet')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {t('fields:mapWorkspace.layers', { defaultValue: 'Επίπεδα' })}
      </Text>

      {renderLayer(undefined, 'none')}
      {primary.map((definition) => renderLayer(definition, definition.id))}
      {showMore ? more.map((definition) => renderLayer(definition, definition.id)) : null}
      {!showMore && more.length > 0 ? (
        <Pressable onPress={() => setShowMore(true)} style={styles.moreBtn} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {t('fields:mapWorkspace.moreLayers', { defaultValue: 'Περισσότερα' })}
          </Text>
        </Pressable>
      ) : null}

      {overlays.length === 0 ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('fields:mapLayers.noOverlays')}
        </Text>
      ) : null}

      {activeLayerId ? (
        <>
          <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.md }]}>
            {t('fields:mapLayers.opacity')}
          </Text>
          <View style={styles.chipRow}>
            {OPACITY_STEPS.map((step) => {
              const active = Math.abs(step - opacity) < 0.01;
              return (
                <Pressable
                  key={step}
                  onPress={() => onOpacityChange(step)}
                  style={[styles.chip, softChip(active)]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={{ color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '600' : '500' }}>
                    {Math.round(step * 100)}%
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {activeLayer && !activeLayer.available ? (
        <Text style={[styles.note, { color: colors.warning }]}>
          {activeLayer.unavailableReason ?? t('fields:mapLayers.unavailable')}
        </Text>
      ) : null}

      {legend?.stops?.length ? (
        <View style={styles.legend}>
          <View style={styles.legendRamp}>
            {legend.stops.map((stop) => (
              <View
                key={stop.position}
                style={[styles.legendSwatch, { backgroundColor: stop.colour }]}
              />
            ))}
          </View>
          <View style={styles.legendScale}>
            <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
              {legend.minimum.toFixed(2)}
            </Text>
            <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
              {legend.maximum.toFixed(2)}
            </Text>
          </View>
        </View>
      ) : null}

      {satelliteLayerActive ? (
        <>
          <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.md }]}>
            {t('fields:mapLayers.observationDate')}
          </Text>
          {dates.length === 0 ? (
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t('fields:mapLayers.noSatelliteDates')}
            </Text>
          ) : (
            dates.map((date) => {
              const active = date.observationId === selectedDateId;
              const cloud = Math.round(date.fieldCloudCoverPercent ?? date.cloudCoverPercent);
              return (
                <Pressable
                  key={date.observationId}
                  style={[
                    styles.option,
                    {
                      borderColor: active ? colors.oliveBorder : colors.border,
                      backgroundColor: active ? colors.primaryLight : colors.surface,
                      opacity: date.isUsable ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => date.isUsable && onSelectDate(date.observationId)}
                  disabled={!date.isUsable}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: !date.isUsable }}
                >
                  <View style={styles.optionText}>
                    <Text style={{ color: active ? colors.primary : colors.textPrimary }}>
                      {formatDate(date.observationDate)}
                    </Text>
                    <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                      {date.isUsable
                        ? t('fields:mapLayers.dateUsable', {
                            cloud,
                            usable: Math.round(date.usablePixelPercent ?? 0),
                          })
                        : t('fields:mapLayers.dateUnusable', { cloud })}
                    </Text>
                  </View>
                  <Text style={{ color: active ? colors.primary : colors.textSecondary }}>
                    {active ? '✓' : ''}
                  </Text>
                </Pressable>
              );
            })
          )}
        </>
      ) : null}

      {activeDefinition ? (
        <View style={styles.attribution}>
          <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
            {activeLayer?.attribution ?? activeDefinition.attribution}
          </Text>
          {t(`fields:mapLayers.notes.${activeDefinition.id}`, { defaultValue: '' }) ? (
            <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
              {t(`fields:mapLayers.notes.${activeDefinition.id}`, { defaultValue: '' })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  section: { ...typography.styles.caption, fontWeight: '700', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  optionText: { flex: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionMeta: { ...typography.styles.caption, fontSize: 11 },
  moreBtn: { paddingVertical: spacing.sm, paddingHorizontal: 4 },
  note: { ...typography.styles.caption, marginTop: spacing.sm, lineHeight: 16 },
  legend: { marginTop: spacing.sm },
  legendRamp: { flexDirection: 'row', height: 10, borderRadius: 999, overflow: 'hidden' },
  legendSwatch: { flex: 1 },
  legendScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  attribution: { marginTop: spacing.md, gap: 2 },
});

export default MapLayerSheet;
