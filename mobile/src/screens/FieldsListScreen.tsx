import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import FieldCard from '../components/domain/FieldCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import WeatherWidget from '../components/domain/WeatherWidget';
import FieldsMap from '../components/domain/FieldsMap';
import Section from '../components/layout/Section';
import Card from '../components/ui/Card';
import { weatherService, WeatherData } from '../services/weatherService';
import { colors, spacing, typography } from '../theme';
import { toBoolean } from '../utils/booleanConverter';

interface FieldsListScreenProps {
  navigation: any;
}

// Calculate weather severity score (higher = worse)
const calculateWeatherSeverity = (weather: WeatherData, alerts: any[]): number => {
  let score = 0;
  
  // Storm conditions are worst
  if (weather.condition === 'stormy') score += 50;
  if (weather.condition === 'rainy' && weather.precipitation > 10) score += 30;
  
  // High wind
  if (weather.windSpeed > 30) score += 25;
  if (weather.windSpeed > 20) score += 15;
  
  // Extreme temperatures
  if (weather.temperature > 35) score += 20;
  if (weather.temperature < 5) score += 20;
  
  // Alerts add severity
  alerts.forEach(alert => {
    if (alert.severity === 'critical') score += 40;
    else if (alert.severity === 'high') score += 30;
    else if (alert.severity === 'medium') score += 20;
    else score += 10;
  });
  
  // Heavy precipitation
  if (weather.precipitation > 15) score += 20;
  
  return score;
};

const FieldsListScreen: React.FC<FieldsListScreenProps> = ({ navigation }) => {
  const { fields, loading, fieldTaskCounts, refresh } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const isRefreshing: boolean = toBoolean(refreshing);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [fieldsWithWeather, setFieldsWithWeather] = useState<Array<{
    field: any;
    weather: WeatherData;
    severity: number;
  }>>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    loadWeatherForFields();
  }, [fields]);

  const loadWeatherForFields = async () => {
    if (fields.length === 0) return;
    
    setLoadingWeather(true);
    try {
      const fieldsWithCoords = fields.filter(f => f.latitude && f.longitude);
      const weatherPromises = fieldsWithCoords.map(async (field) => {
        const weather = await weatherService.getCurrentWeather(field.latitude!, field.longitude!);
        const alerts = await weatherService.getWeatherAlerts(field.latitude!, field.longitude!);
        const severity = calculateWeatherSeverity(weather, alerts);
        return { field, weather, severity };
      });
      
      const results = await Promise.all(weatherPromises);
      setFieldsWithWeather(results);
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  const worstWeatherFields = useMemo(() => {
    return [...fieldsWithWeather]
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3);
  }, [fieldsWithWeather]);

  const handleFieldPress = (fieldId: string) => {
    if (navigation?.navigate) {
      navigation.navigate('FieldDetail', { fieldId });
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
      await loadWeatherForFields();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  if (loading && fields.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={fields}
        ListHeaderComponent={
          <>
            {worstWeatherFields.length > 0 ? (
              <Section title="⚠️ Fields with Worst Weather">
                {worstWeatherFields.map(({ field, weather, severity }) => (
                  <Card
                    key={field.id}
                    onPress={() => handleFieldPress(field.id)}
                    style={styles.worstWeatherCard}
                  >
                    <View style={styles.worstWeatherHeader}>
                      <Text style={styles.worstWeatherFieldName}>{field.name}</Text>
                      <Text style={styles.worstWeatherIcon}>{weather.icon}</Text>
                    </View>
                    <View style={styles.worstWeatherDetails}>
                      <Text style={styles.worstWeatherTemp}>{weather.temperature}°C</Text>
                      <Text style={styles.worstWeatherCondition}>{weather.condition}</Text>
                      {weather.precipitation > 0 ? (
                        <Text style={styles.worstWeatherPrecip}>🌧️ {weather.precipitation}mm</Text>
                      ) : null}
                      {weather.windSpeed > 20 ? (
                        <Text style={styles.worstWeatherWind}>💨 {weather.windSpeed} km/h</Text>
                      ) : null}
                    </View>
                  </Card>
                ))}
              </Section>
            ) : null}
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
                  📋 List
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggle, viewMode === 'map' && styles.viewToggleActive]}
                onPress={() => setViewMode('map')}
              >
                <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>
                  🗺️ Map
                </Text>
              </TouchableOpacity>
            </View>
            {viewMode === 'map' && fields.length > 0 ? (
              <View style={styles.mapContainer}>
                <FieldsMap
                  fields={fields}
                  onFieldPress={handleFieldPress}
                />
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          if (viewMode !== 'list') return null;
          
          const fieldWeather = fieldsWithWeather.find(fw => fw.field.id === item.id);
          
          return (
            <FieldCard
              field={item}
              taskCount={fieldTaskCounts[item.id]}
              weather={fieldWeather?.weather}
              onPress={() => handleFieldPress(item.id)}
            />
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          fields.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.emptyIcon}>🏡</Text>}
            title="No fields found"
            description="There are no fields available for your role"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  worstWeatherCard: {
    marginBottom: spacing.sm,
  },
  worstWeatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  worstWeatherFieldName: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  worstWeatherIcon: {
    fontSize: 24,
  },
  worstWeatherDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  worstWeatherTemp: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  worstWeatherCondition: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  worstWeatherPrecip: {
    ...typography.styles.bodySmall,
    color: colors.info,
  },
  worstWeatherWind: {
    ...typography.styles.bodySmall,
    color: colors.warning,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  viewToggle: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  viewToggleActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  viewToggleText: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listContent: {
    padding: spacing.base,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 64,
  },
});

export default FieldsListScreen;
