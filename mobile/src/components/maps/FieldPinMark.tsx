import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { hexToRgba } from '../../utils/hexToRgba';
import { typography } from '../../theme';

export type FieldPinMarkProps = {
  color: string;
  label?: string;
  selected?: boolean;
  compact?: boolean;
};

/** Circular grove mark — matches the web fields map. */
const FieldPinMark: React.FC<FieldPinMarkProps> = ({
  color,
  label,
  selected = false,
  compact = false,
}) => {
  const { colors } = useTheme();
  const size = selected ? 22 : compact ? 14 : 16;

  return (
    <View style={styles.wrap} collapsable={false} pointerEvents="box-none">
      {label ? (
        <View
          style={[
            styles.label,
            {
              backgroundColor: selected ? colors.surfaceElevated : hexToRgba(colors.surfaceElevated, 0.94),
              borderColor: selected ? color : colors.borderLight,
            },
          ]}
        >
          <Text
            style={[styles.labelText, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      ) : null}
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    maxWidth: 148,
  },
  label: {
    maxWidth: 148,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  labelText: {
    ...typography.styles.caption,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 14,
  },
  dot: {
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default FieldPinMark;
