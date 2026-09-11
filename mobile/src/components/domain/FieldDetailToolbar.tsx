import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface FieldDetailToolbarAction {
  id: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
}

interface FieldDetailToolbarProps {
  actions: FieldDetailToolbarAction[];
}

const FieldDetailToolbar: React.FC<FieldDetailToolbarProps> = ({ actions }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {actions.map((action, index) => (
        <React.Fragment key={action.id}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.item,
              pressed && !action.disabled && { opacity: 0.7 },
              action.disabled && styles.itemDisabled,
            ]}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.disabled }}
          >
            <View style={styles.iconSlot}>
              <Ionicons
                name={action.icon}
                size={20}
                color={action.disabled ? colors.textTertiary : colors.primary}
              />
              {action.badge != null && action.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.onOlive }]}>
                    {action.badge > 9 ? '9+' : action.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                { color: action.disabled ? colors.textTertiary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    gap: 4,
    minHeight: 64,
  },
  itemDisabled: { opacity: 0.45 },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    ...typography.styles.caption,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
  },
});

export default FieldDetailToolbar;
