import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import LifecycleIndicator from '../LifecycleIndicator';
import { colors, typography, spacing } from '../../theme';
import { Lifecycle } from '../../services/lifecycleService';
import { Field } from '../../services/fieldService';
import { formatDate } from '../../utils/formatters';

export interface LifecycleCardProps {
  lifecycle: Lifecycle;
  field?: Field;
  onPress?: () => void;
}

const LifecycleCard: React.FC<LifecycleCardProps> = ({
  lifecycle,
  field,
  onPress,
}) => {
  const cycleStartDate = new Date(lifecycle.cycleStartDate);
  const daysSinceStart = Math.floor(
    (Date.now() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card onPress={onPress} variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.fieldName} numberOfLines={1}>
          {field?.name || `Field ${lifecycle.fieldId}`}
        </Text>
        <LifecycleIndicator year={lifecycle.currentYear} />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Current Year</Text>
          <LifecycleIndicator year={lifecycle.currentYear} />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Cycle Start</Text>
          <Text style={styles.value}>{formatDate(lifecycle.cycleStartDate)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Days Since Start</Text>
          <Text style={styles.value}>{daysSinceStart} days</Text>
        </View>

        {lifecycle.lastProgressionDate && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Last Progression</Text>
            <Text style={styles.value}>
              {formatDate(lifecycle.lastProgressionDate)}
            </Text>
          </View>
        )}

        {field && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Field Area</Text>
              <Text style={styles.value}>{field.area} hectares</Text>
            </View>
            {field.variety && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Variety</Text>
                <Text style={styles.value}>{field.variety}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {field && (
        <View style={styles.viewFieldButton}>
          <Text style={styles.viewFieldText}>View Field Details →</Text>
        </View>
      )}
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
  details: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: {
    ...typography.styles.body,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  viewFieldButton: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  viewFieldText: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default LifecycleCard;
