import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface QuickActionItem {
  id: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  accentColor?: string;
}

interface QuickActionRowProps {
  actions: QuickActionItem[];
}

const QuickActionRow: React.FC<QuickActionRowProps> = ({ actions }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {actions.map(action => {
        const accent = action.accentColor ?? colors.primaryDark;
        return (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.action,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderLight,
                ...createElevation(colors, 'sm'),
              },
            ]}
            onPress={action.onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
              <Ionicons name={action.icon} size={22} color={accent} />
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={2}>
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 88,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default QuickActionRow;
