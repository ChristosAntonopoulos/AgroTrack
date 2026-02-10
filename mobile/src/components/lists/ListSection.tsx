import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import Button from '../ui/Button';

export interface ListSectionProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children?: React.ReactNode;
}

const ListSection: React.FC<ListSectionProps> = ({
  title,
  actionLabel,
  onActionPress,
  children,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && onActionPress && (
          <Button
            title={actionLabel}
            onPress={onActionPress}
            variant="text"
            size="small"
          />
        )}
      </View>
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },
  title: {
    ...typography.styles.h4,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  content: {
    // Content styles
  },
});

export default ListSection;
