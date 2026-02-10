import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../ui/Card';
import LifecycleIndicator from '../LifecycleIndicator';
import { colors, typography, spacing } from '../../theme';
import { Field } from '../../services/fieldService';
import { WeatherData } from '../../services/weatherService';

export interface FieldCardProps {
  field: Field;
  onPress?: () => void;
  taskCount?: number;
  weather?: WeatherData;
}

const FieldCard: React.FC<FieldCardProps> = ({ field, onPress, taskCount, weather }) => {
  // fieldService already returns correct types, use directly
  const hasIrrigation: boolean = field.irrigationStatus ?? false;
  
  return (
    <Card onPress={onPress} variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.fieldName} numberOfLines={1}>
          {field.name}
        </Text>
        <LifecycleIndicator year={field.currentLifecycleYear} />
      </View>

      {weather ? (
        <View style={styles.weatherRow}>
          <Text style={styles.weatherIcon}>{weather.icon}</Text>
          <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
          <Text style={styles.weatherCondition}>{weather.condition}</Text>
          {weather.precipitation > 0 ? (
            <Text style={styles.weatherPrecip}>🌧️ {weather.precipitation}mm</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Area:</Text>
          <Text style={styles.value}>{field.area} hectares</Text>
        </View>

        {field.variety && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Variety:</Text>
            <Text style={styles.value}>{field.variety}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.label}>Irrigation:</Text>
          <Text style={styles.value}>{hasIrrigation ? 'Yes' : 'No'}</Text>
        </View>

        {taskCount !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Tasks:</Text>
            <Text style={styles.value}>{taskCount}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fieldName: {
    ...typography.styles.h4,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  weatherIcon: {
    fontSize: 20,
  },
  weatherTemp: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  weatherCondition: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    flex: 1,
  },
  weatherPrecip: {
    ...typography.styles.bodySmall,
    color: colors.info,
  },
  details: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.styles.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default FieldCard;
