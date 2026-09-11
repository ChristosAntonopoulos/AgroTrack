import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Sheet from '../ui/Sheet';
import GroveWeatherCard from './GroveWeatherCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { geospatialService, type FieldWeather } from '../../services/geospatialService';
import type { WeatherData } from '../../services/weatherService';
import { presentGroveWeather } from '../../weather/presentGroveWeather';
import { presentGroveOutlook, mergeGroveOutlook } from '../../weather/presentGroveOutlook';
import { resolveFieldColor } from '../../utils/fieldColors';

export type WeatherPeekField = {
  id: string;
  name: string;
  color?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  fields: WeatherPeekField[];
  primaryFieldId?: string;
  /** Optional already-loaded snapshot for instant paint */
  seedSnapshot?: WeatherData | null;
};

/** Bottom/side weather peek — GroveWeatherCard + outlook, inspired by web ChronologioTodayWeatherDetail. */
const WeatherPeekSheet: React.FC<Props> = ({
  open,
  onClose,
  fields,
  primaryFieldId,
  seedSnapshot,
}) => {
  const { t } = useTranslation('chronologio');
  const { colors, tapMin, fontScaleMultiplier, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [byId, setById] = useState<Record<string, FieldWeather | null>>({});
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(primaryFieldId || fields[0]?.id);
  const fieldKey = fields.map(f => f.id).join(',');

  useEffect(() => {
    if (!open || !fields.length) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all(fields.map(f => geospatialService.getFieldWeather(f.id).catch(() => null))).then(
      rows => {
        if (cancelled) return;
        const next: Record<string, FieldWeather | null> = {};
        fields.forEach((f, i) => {
          next[f.id] = rows[i];
        });
        setById(next);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fieldKey]);

  useEffect(() => {
    if (primaryFieldId) setSelectedId(primaryFieldId);
    else if (fields[0]?.id) setSelectedId(fields[0].id);
  }, [primaryFieldId, fields]);

  const selected = fields.find(f => f.id === selectedId) || fields[0];
  const selectedWeather = (selected && byId[selected.id]) || null;

  const problems = useMemo(
    () =>
      mergeGroveOutlook(
        fields.map(f => ({
          fieldId: f.id,
          items: presentGroveOutlook(byId[f.id]),
        }))
      ),
    [byId, fields]
  );

  const footer =
    selected ? (
      <Pressable
        onPress={() => {
          onClose();
          navigation.navigate('FieldWeatherVegetation', { fieldId: selected.id });
        }}
        style={[
          styles.footerBtn,
          { backgroundColor: colors.weatherBlue, minHeight: Math.max(tapMin, 44) },
        ]}
      >
        <Ionicons name="analytics-outline" size={18} color={colors.onOlive} />
        <Text style={[styles.footerText, { color: colors.onOlive }]}>
          {t('weatherReview.openCharts')}
        </Text>
      </Pressable>
    ) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="end"
      size="lg"
      accent
      accentColor={colors.weatherBlue}
      kicker={t('weatherPeek.kicker')}
      title={t('weatherPeek.title')}
      icon={<Ionicons name="rainy-outline" size={22} color={colors.weatherBlue} />}
      footer={footer}
    >
      {!fields.length ? (
        <Text style={{ color: colors.textSecondary }}>{t('weatherPeek.empty')}</Text>
      ) : (
        <View style={styles.body}>
          {fields.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fieldTabs}
            >
              {fields.map(field => {
                const view = presentGroveWeather({ field: byId[field.id] });
                const active = field.id === selected?.id;
                const tint = resolveFieldColor(field.color, field.id);
                return (
                  <Pressable
                    key={field.id}
                    onPress={() => setSelectedId(field.id)}
                    style={[
                      styles.fieldTab,
                      {
                        borderColor: active ? tint : colors.borderLight,
                        backgroundColor: active ? colors.surface : colors.surfaceMuted,
                        minHeight: tapMin * 0.85,
                      },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: tint }]} />
                    <Text
                      style={[
                        styles.fieldName,
                        { color: colors.textPrimary, fontSize: 13 * fontScaleMultiplier },
                      ]}
                      numberOfLines={1}
                    >
                      {field.name}
                    </Text>
                    {view.temperature != null ? (
                      <Text style={[styles.fieldTemp, { color: colors.textSecondary }]}>
                        {view.temperature}°
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {loading && !selectedWeather ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.weatherBlue} />
              <Text style={{ color: colors.textSecondary }}>{t('weatherPeek.loading')}</Text>
            </View>
          ) : (
            <GroveWeatherCard
              fieldWeather={selectedWeather}
              snapshot={!selectedWeather ? seedSnapshot : null}
              fieldName={selected?.name}
              embedded
            />
          )}

          <View style={styles.outlook}>
            <Text
              style={[
                styles.outlookTitle,
                { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier },
              ]}
            >
              {t('weatherPeek.problems')}
            </Text>
            {problems.length === 0 ? (
              <Text style={[styles.calm, { color: colors.textSecondary }]}>{t('weatherPeek.calm')}</Text>
            ) : (
              problems.map(({ item, fieldIds }) => (
                <View
                  key={`${fieldIds.join('-')}-${item.id}-${item.window}`}
                  style={[
                    styles.problemRow,
                    {
                      backgroundColor: item.harsh
                        ? isDark
                          ? 'rgba(214,122,103,0.16)'
                          : 'rgba(214,122,103,0.12)'
                        : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.window,
                      { color: colors.textTertiary, fontSize: 11 * fontScaleMultiplier },
                    ]}
                  >
                    {t(`weatherPeek.window.${item.window}`)}
                  </Text>
                  <Text
                    style={[
                      styles.problemText,
                      {
                        color: item.harsh ? colors.errorDark : colors.textPrimary,
                        fontSize: 14 * fontScaleMultiplier,
                      },
                    ]}
                  >
                    {t(`weatherPeek.${item.labelKey}`, item.params as Record<string, unknown>)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  fieldTabs: { gap: spacing.sm, paddingBottom: 2 },
  fieldTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fieldName: { fontWeight: '600', flexShrink: 1 },
  fieldTemp: { fontWeight: '700', fontSize: 12 },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  outlook: { gap: spacing.sm },
  outlookTitle: {
    ...typography.styles.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  calm: { ...typography.styles.bodySmall, lineHeight: 20 },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  window: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    minWidth: 72,
    paddingTop: 2,
  },
  problemText: { flex: 1, fontWeight: '600', lineHeight: 20 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.full,
  },
  footerText: { fontWeight: '700', fontSize: 15 },
});

export default WeatherPeekSheet;
