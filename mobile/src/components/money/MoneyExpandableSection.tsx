import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii, spacing, typography } from '../../theme';

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const MoneyExpandableSection: React.FC<Props> = ({ title, children, defaultOpen = false }) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'flat'),
        },
      ]}
    >
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={[styles.toggle, { minHeight: tapMin }]}
      >
        <Text
          style={[styles.title, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}
        >
          {title}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  title: { fontWeight: '700', flex: 1 },
  body: { paddingHorizontal: spacing.base, paddingBottom: spacing.base, gap: spacing.sm },
});

export default MoneyExpandableSection;
