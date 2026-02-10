import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Card from '../ui/Card';
import { Field } from '../../services/mockDataService';
import { locationService } from '../../services/locationService';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';
import EmptyState from '../EmptyState';

export interface FieldsMapProps {
  fields: Field[];
  onFieldPress?: (fieldId: string) => void;
  showWeather?: boolean;
  compact?: boolean;
  height?: number;
}

// Try to import MapView, but handle gracefully if not available
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch (error) {
  if (__DEV__) {
    console.log('[FieldsMap] react-native-maps not available, using fallback view');
  }
}

const FieldsMap: React.FC<FieldsMapProps> = ({
  fields,
  onFieldPress,
  showWeather = false,
  compact = false,
  height = 250,
}) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Error loading current location:', error);
    } finally {
      setLoading(false);
    }
  };

  const fieldsWithGPS = fields.filter(f => f.latitude && f.longitude);

  if (fieldsWithGPS.length === 0) {
    return (
      <Card variant="elevated" style={styles.container}>
        <Text style={styles.title}>My Fields</Text>
        <EmptyState
          icon="🗺️"
          title="No Fields with GPS"
          description="Add GPS coordinates to your fields to see them on the map."
        />
      </Card>
    );
  }

  const safeCompact = toBoolean(compact, 'FieldsMap.compact');

  // Calculate map region to show all fields
  const latitudes = fieldsWithGPS.map(f => f.latitude!);
  const longitudes = fieldsWithGPS.map(f => f.longitude!);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
  };

  // Fallback view if MapView is not available
  if (!MapView) {
    return (
      <Card variant="elevated" style={styles.container}>
        <Text style={styles.title}>My Fields ({fieldsWithGPS.length})</Text>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>🗺️</Text>
          <Text style={styles.fallbackMessage}>
            Map view requires react-native-maps. Install it to see fields on a map.
          </Text>
          <View style={styles.fieldsList}>
            {fieldsWithGPS.map((field) => (
              <TouchableOpacity
                key={field.id}
                style={styles.fieldItem}
                onPress={() => onFieldPress?.(field.id)}
              >
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldCoordinates}>
                  {field.latitude?.toFixed(4)}, {field.longitude?.toFixed(4)}
                </Text>
                {currentLocation ? (
                  <Text style={styles.fieldDistance}>
                    {Math.round(locationService.calculateDistance(
                      currentLocation.lat,
                      currentLocation.lng,
                      field.latitude!,
                      field.longitude!
                    ) * 10) / 10} km away
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
    );
  }

  const getLifecycleColor = (lifecycleYear: string) => {
    return lifecycleYear === 'high' ? colors.lifecycleHigh : colors.lifecycleLow;
  };

  return (
    <Card variant="elevated" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Fields ({fieldsWithGPS.length})</Text>
        {currentLocation ? (
          <Text style={styles.locationText}>📍 Current Location</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={[styles.mapContainer, { height }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.mapContainer, { height }]}>
          <MapView
            style={styles.map}
            // Use default provider (OpenStreetMap) - no API key needed, completely free
            // To use Google Maps, set provider={PROVIDER_GOOGLE} and add API key in app.json
            initialRegion={region}
            showsUserLocation={!!currentLocation}
            showsMyLocationButton={false}
            mapType="standard"
          >
            {fieldsWithGPS.map((field) => {
              const lifecycleColor = getLifecycleColor(field.currentLifecycleYear);
              return (
                <Marker
                  key={field.id}
                  coordinate={{
                    latitude: field.latitude!,
                    longitude: field.longitude!,
                  }}
                  title={field.name}
                  description={`${field.area} ha - ${field.currentLifecycleYear} year`}
                  onPress={() => onFieldPress?.(field.id)}
                >
                  <View style={[styles.markerContainer, { backgroundColor: lifecycleColor }]}>
                    <Text style={styles.markerText}>🏡</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>
      )}

      {!safeCompact ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.lifecycleHigh }]} />
            <Text style={styles.legendText}>High Year</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.lifecycleLow }]} />
            <Text style={styles.legendText}>Low Year</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  locationText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  mapContainer: {
    borderRadius: spacingPatterns.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...spacingPatterns.shadow.md,
  },
  markerText: {
    fontSize: 20,
  },
  legend: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  fallbackContainer: {
    alignItems: 'center',
    padding: spacing.base,
  },
  fallbackText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  fallbackMessage: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  fieldsList: {
    width: '100%',
    gap: spacing.sm,
  },
  fieldItem: {
    padding: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: spacingPatterns.borderRadius.md,
  },
  fieldName: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  fieldCoordinates: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  fieldDistance: {
    ...typography.styles.caption,
    color: colors.primary,
    fontSize: 11,
    marginTop: spacing.xs / 2,
  },
});

export default FieldsMap;
