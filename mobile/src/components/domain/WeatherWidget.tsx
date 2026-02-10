import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Card from '../ui/Card';
import { weatherService, WeatherData, ForecastData, WeatherAlert, IrrigationRecommendation } from '../../services/weatherService';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

export interface WeatherWidgetProps {
  location: { lat: number; lng: number };
  fieldName?: string;
  compact?: boolean;
  showForecast?: boolean;
  onPress?: () => void;
  field?: { irrigationStatus: boolean; currentLifecycleYear: string };
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  location,
  fieldName,
  compact = false,
  showForecast = true,
  onPress,
  field,
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [irrigation, setIrrigation] = useState<IrrigationRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    loadWeatherData();
  }, [location]);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      const [currentWeather, forecastData, alertsData] = await Promise.all([
        weatherService.getCurrentWeather(location.lat, location.lng),
        showForecast ? weatherService.getForecast(location.lat, location.lng, 7) : Promise.resolve([]),
        weatherService.getWeatherAlerts(location.lat, location.lng),
      ]);

      setWeather(currentWeather);
      setForecast(forecastData);
      setAlerts(alertsData);

      if (field) {
        const irrigationRec = weatherService.getIrrigationRecommendation(field, currentWeather);
        setIrrigation(irrigationRec);
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !weather) {
    return (
      <Card variant="elevated" style={styles.container}>
        <Text style={styles.loadingText}>Loading weather...</Text>
      </Card>
    );
  }

  const isWorkable = weatherService.isWorkable(weather);
  const safeCompact = toBoolean(compact, 'WeatherWidget.compact');
  const safeExpanded = expanded && !safeCompact;

  return (
    <Card variant="elevated" style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{weather.icon}</Text>
          <View style={styles.headerText}>
            <Text style={styles.location}>{fieldName || 'Current Location'}</Text>
            <Text style={styles.temperature}>{Math.round(weather.temperature)}°C</Text>
          </View>
        </View>
        {!safeCompact ? (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandButton}>
            <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.currentWeather}>
        <Text style={styles.condition}>{weather.description}</Text>
        <View style={styles.details}>
          <Text style={styles.detailText}>💧 {weather.humidity}%</Text>
          <Text style={styles.detailText}>💨 {weather.windSpeed} km/h</Text>
          {weather.precipitation > 0 ? (
            <Text style={styles.detailText}>🌧️ {weather.precipitation}mm</Text>
          ) : null}
        </View>
        <View style={[styles.workabilityBadge, isWorkable ? styles.workable : styles.notWorkable]}>
          <Text style={styles.workabilityText}>
            {isWorkable ? '✓ Workable Today' : '⚠ Not Workable'}
          </Text>
        </View>
      </View>

      {alerts.length > 0 ? (
        <View style={styles.alertsContainer}>
          {alerts.map((alert, index) => (
            <View key={index} style={[styles.alert, styles[`alert${alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}`]]}>
              <Text style={styles.alertIcon}>
                {alert.type === 'frost' ? '❄️' : alert.type === 'storm' ? '⛈️' : '⚠️'}
              </Text>
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {irrigation && irrigation.recommended ? (
        <View style={[styles.irrigationCard, styles[`irrigation${irrigation.urgency.charAt(0).toUpperCase() + irrigation.urgency.slice(1)}`]]}>
          <Text style={styles.irrigationTitle}>💧 Irrigation Recommended</Text>
          <Text style={styles.irrigationText}>{irrigation.reason}</Text>
          {irrigation.amount ? (
            <Text style={styles.irrigationAmount}>Amount: {irrigation.amount}mm</Text>
          ) : null}
        </View>
      ) : null}

      {safeExpanded && showForecast && forecast.length > 0 ? (
        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>7-Day Forecast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
            {forecast.map((day, index) => (
              <View key={index} style={styles.forecastDay}>
                <Text style={styles.forecastDate}>
                  {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={styles.forecastIcon}>{day.icon}</Text>
                <Text style={styles.forecastHigh}>{day.high}°</Text>
                <Text style={styles.forecastLow}>{day.low}°</Text>
                {day.precipitation > 0 ? (
                  <Text style={styles.forecastPrecip}>🌧️ {day.precipitation}mm</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 48,
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  location: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  temperature: {
    ...typography.styles.h2,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
  },
  expandButton: {
    padding: spacing.xs,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  currentWeather: {
    marginBottom: spacing.sm,
  },
  condition: {
    ...typography.styles.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  workabilityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacingPatterns.borderRadius.md,
    alignSelf: 'flex-start',
  },
  workable: {
    backgroundColor: colors.success + '20',
  },
  notWorkable: {
    backgroundColor: colors.warning + '20',
  },
  workabilityText: {
    ...typography.styles.caption,
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
  },
  alertsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: spacingPatterns.borderRadius.md,
    marginBottom: spacing.xs,
  },
  alertCritical: {
    backgroundColor: colors.error + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  alertHigh: {
    backgroundColor: colors.warning + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  alertMedium: {
    backgroundColor: colors.info + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  alertLow: {
    backgroundColor: colors.gray200,
    borderLeftWidth: 3,
    borderLeftColor: colors.gray400,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  alertText: {
    ...typography.styles.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 12,
  },
  irrigationCard: {
    padding: spacing.sm,
    borderRadius: spacingPatterns.borderRadius.md,
    marginTop: spacing.sm,
  },
  irrigationHigh: {
    backgroundColor: colors.error + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  irrigationMedium: {
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  irrigationLow: {
    backgroundColor: colors.info + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  irrigationTitle: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  irrigationText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  irrigationAmount: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs / 2,
    fontSize: 11,
  },
  forecastContainer: {
    marginTop: spacing.sm,
  },
  forecastTitle: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  forecastScroll: {
    marginHorizontal: -spacing.base,
    paddingHorizontal: spacing.base,
  },
  forecastDay: {
    alignItems: 'center',
    marginRight: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: spacingPatterns.borderRadius.md,
    minWidth: 70,
  },
  forecastDate: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  forecastIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  forecastHigh: {
    ...typography.styles.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    fontSize: 14,
  },
  forecastLow: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  forecastPrecip: {
    ...typography.styles.caption,
    color: colors.info,
    fontSize: 10,
    marginTop: spacing.xs / 2,
  },
});

export default WeatherWidget;
