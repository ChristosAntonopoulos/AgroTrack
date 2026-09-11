import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { MapLayerData, MapLayerDefinition, SatelliteDate } from '../../services/geospatialService';
import { MapLayerType } from '../../utils/mapLayers';
import { typography, spacing } from '../../theme';

/**
 * Opacity presets, used instead of a slider so the app avoids another native
 * dependency for a control that only needs a few useful positions.
 */
const OPACITY_STEPS = [0.35, 0.55, 0.75, 1];

const BASE_OPTIONS: MapLayerType[] = ['satellite', 'standard'];

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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  const layerName = (definition: MapLayerDefinition) =>
    t(`fields:mapLayers.names.${definition.id}`, { defaultValue: definition.name });

  const activeDefinition = overlays.find((o) => o.id === activeLayerId);
  const legend = activeLayer?.legend;

  const softChip = (active: boolean) => ({
    borderColor: active ? colors.oliveBorder : colors.border,
    backgroundColor: active ? colors.primaryLight : colors.surface,
  });

  return (
    <Sheet
      open={visible}
      onClose={onClose}
      edge="end"
      title={t('fields:mapLayers.title')}
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
        {t('fields:mapLayers.dataOverlay')}
      </Text>

      <Pressable
        style={[
          styles.option,
          {
            borderColor: !activeLayerId ? colors.oliveBorder : colors.border,
            backgroundColor: !activeLayerId ? colors.primaryLight : colors.surface,
          },
        ]}
        onPress={() => onActiveLayerChange(undefined)}
        accessibilityRole="button"
        accessibilityState={{ selected: !activeLayerId }}
      >
        <Text style={{ color: !activeLayerId ? colors.primary : colors.textPrimary }}>
          {t('fields:mapLayers.none')}
        </Text>
        <Text style={{ color: !activeLayerId ? colors.primary : colors.textSecondary }}>
          {!activeLayerId ? '✓' : ''}
        </Text>
      </Pressable>

      {overlays.map((definition) => {
        const active = activeLayerId === definition.id;
        return (
          <Pressable
            key={definition.id}
            style={[
              styles.option,
              {
                borderColor: active ? colors.oliveBorder : colors.border,
                backgroundColor: active ? colors.primaryLight : colors.surface,
              },
            ]}
            onPress={() => onActiveLayerChange(definition.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <View style={styles.optionText}>
              <Text style={{ color: active ? colors.primary : colors.textPrimary }}>{layerName(definition)}</Text>
              {definition.spatialResolution ? (
                <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                  {definition.spatialResolution} · {definition.provider}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: active ? colors.primary : colors.textSecondary }}>
              {active ? '✓' : ''}
            </Text>
          </Pressable>
        );
      })}

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
  optionMeta: { ...typography.styles.caption, fontSize: 11 },
  note: { ...typography.styles.caption, marginTop: spacing.sm, lineHeight: 16 },
  legend: { marginTop: spacing.sm },
  legendRamp: { flexDirection: 'row', height: 10, borderRadius: 999, overflow: 'hidden' },
  legendSwatch: { flex: 1 },
  legendScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  attribution: { marginTop: spacing.md, gap: 2 },
});

export default MapLayerSheet;
