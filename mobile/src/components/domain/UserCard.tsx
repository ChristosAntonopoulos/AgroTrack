import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { typography, spacing, radii } from '../../theme';
import { loginTheme } from '../../theme/loginTheme';

export interface UserCardProps {
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ title, subtitle, onPress, disabled }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[styles.card, disabled && styles.cardDisabled]}
    >
      <Text style={styles.icon}>👤</Text>
      <View style={styles.textWrap}>
        <Text style={styles.userName} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.userSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: loginTheme.inputBorder,
    backgroundColor: loginTheme.inputBg,
    minHeight: 56,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  icon: {
    fontSize: 18,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    ...typography.styles.bodySmall,
    color: loginTheme.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  userSubtitle: {
    ...typography.styles.caption,
    color: loginTheme.textSecondary,
    marginTop: 2,
  },
});

export default UserCard;
