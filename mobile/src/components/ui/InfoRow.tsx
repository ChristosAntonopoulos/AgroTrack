import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface InfoRowProps {
  icon: IconName;
  label: string;
  value: string;
  showDivider?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, showDivider = true }) => {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '14' }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.borderLight }]} /> : null}
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.styles.bodySmall, flex: 1 },
  value: { ...typography.styles.bodySmall, fontWeight: '700', maxWidth: '45%', textAlign: 'right' },
  divider: { height: 1, marginLeft: 44 },
});

export default InfoRow;
