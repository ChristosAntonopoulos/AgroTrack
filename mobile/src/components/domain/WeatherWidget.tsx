import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { typography, spacing, radii } from '../../theme';
import { WeatherData } from '../../services/weatherService';
import LoadingSpinner from '../LoadingSpinner';
import GroveWeatherCard from '../weather/GroveWeatherCard';
import WeatherPeekSheet, { type WeatherPeekField } from '../weather/WeatherPeekSheet';

export interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading?: boolean;
  high?: number;
  low?: number;
  namespace?: 'dashboard' | 'fields';
  /** Fields for the weather peek sheet (opens on press). */
  fields?: WeatherPeekField[];
  primaryFieldId?: string;
  fieldName?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  namespace = 'dashboard',
  fields = [],
  primaryFieldId,
  fieldName,
}) => {
  const { colors } = useTheme();
  const { isEveryday, fontScaleMultiplier, tapMin } = usePreferences();
  const { t } = useTranslation(namespace);
  const [showDetails, setShowDetails] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);

  const peekFields = useMemo(() => {
    if (fields.length) return fields;
    if (primaryFieldId && fieldName) return [{ id: primaryFieldId, name: fieldName }];
    return [];
  }, [fields, primaryFieldId, fieldName]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surfaceMuted }]}>
        <LoadingSpinner size="small" />
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
        <Text style={[styles.missingText, { color: colors.textSecondary }]}>
          {namespace === 'fields' ? t('weather.unavailable') : t('weatherUnavailable')}
        </Text>
      </View>
    );
  }

  const everydayCollapsed = isEveryday && namespace === 'fields' && !showDetails;

  return (
    <>
      {everydayCollapsed ? (
        <Pressable
          onPress={() => setShowDetails(true)}
          style={[
            styles.peekBtn,
            { backgroundColor: colors.primaryLight, minHeight: tapMin, borderColor: colors.oliveBorder },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 * fontScaleMultiplier }}>
            {t('weather.showDetails')}
          </Text>
        </Pressable>
      ) : (
        <GroveWeatherCard
          snapshot={weather}
          fieldName={fieldName}
          onPress={peekFields.length ? () => setPeekOpen(true) : undefined}
        />
      )}

      {peekFields.length > 0 ? (
        <WeatherPeekSheet
          open={peekOpen}
          onClose={() => setPeekOpen(false)}
          fields={peekFields}
          primaryFieldId={primaryFieldId || peekFields[0]?.id}
          seedSnapshot={weather}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  loading: {
    borderRadius: 20,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  missingText: { ...typography.styles.bodySmall, fontWeight: '600' },
  peekBtn: {
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});

export default WeatherWidget;
