import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { TestUser } from '../../services/mockUsers';

export interface UserCardProps {
  user: TestUser;
  selected?: boolean;
  onPress?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, selected = false, onPress }) => {
  // Prop is already correct type, use directly
  const getRoleColor = (role: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (role) {
      case 'FieldOwner':
        return 'primary';
      case 'Producer':
        return 'success';
      case 'Agronomist':
        return 'info';
      case 'Administrator':
        return 'error';
      case 'ServiceProvider':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'FieldOwner':
        return '🏡';
      case 'Producer':
        return '👨‍🌾';
      case 'Agronomist':
        return '🔬';
      case 'Administrator':
        return '👤';
      case 'ServiceProvider':
        return '🔧';
      default:
        return '👤';
    }
  };

  return (
    <Card
      onPress={onPress}
      variant="elevated"
      style={[
        styles.card,
        selected && styles.cardSelected,
        selected && { borderColor: colors.primary, borderWidth: 3 },
      ]}
    >
      <Text style={styles.icon}>{getRoleIcon(user.role)}</Text>
      <Text style={styles.userName} numberOfLines={1}>
        {user.displayName}
      </Text>
      <Badge
        label={user.role}
        variant={getRoleColor(user.role)}
        size="small"
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 120,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardSelected: {
    transform: [{ scale: 1.05 }],
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  userName: {
    ...typography.styles.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
});

export default UserCard;
