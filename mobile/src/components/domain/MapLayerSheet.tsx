import React from 'react';
import { View, Text, Modal, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.white }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('fields:mapLayers.title')}
          </Text>

          <ScrollView style={styles.scroll}>
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
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primaryDark : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={{ color: active ? colors.textInverse : colors.textPrimary }}>
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
              style={[styles.option, { borderColor: colors.border }]}
              onPress={() => onActiveLayerChange(undefined)}
              accessibilityRole="button"
              accessibilityState={{ selected: !activeLayerId }}
            >
              <Text style={{ color: colors.textPrimary }}>{t('fields:mapLayers.none')}</Text>
              <Text style={{ color: !activeLayerId ? colors.primary : colors.textSecondary }}>
                {!activeLayerId ? '✓' : ''}
              </Text>
            </Pressable>

            {overlays.map((definition) => {
              const active = activeLayerId === definition.id;
              return (
                <Pressable
                  key={definition.id}
                  style={[styles.option, { borderColor: colors.border }]}
                  onPress={() => onActiveLayerChange(definition.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.optionText}>
                    <Text style={{ color: colors.textPrimary }}>{layerName(definition)}</Text>
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
                        style={[
                          styles.chip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primaryDark : 'transparent',
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={{ color: active ? colors.textInverse : colors.textPrimary }}>
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
                        style={[styles.option, { borderColor: colors.border, opacity: date.isUsable ? 1 : 0.5 }]}
                        onPress={() => date.isUsable && onSelectDate(date.observationId)}
                        disabled={!date.isUsable}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: !date.isUsable }}
                      >
                        <View style={styles.optionText}>
                          <Text style={{ color: colors.textPrimary }}>
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
          </ScrollView>

          <View style={styles.actions}>
            <Button title={t('common:close')} onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.base,
  },
  title: { ...typography.styles.h3, fontWeight: '700', marginBottom: spacing.md },
  scroll: { maxHeight: 440 },
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
    borderBottomWidth: 1,
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
  actions: { marginTop: spacing.md },
});

export default MapLayerSheet;
