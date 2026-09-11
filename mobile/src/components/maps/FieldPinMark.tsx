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

/** Teardrop grove pin — matches the web fields map mark. */
const FieldPinMark: React.FC<FieldPinMarkProps> = ({
  color,
  label,
  selected = false,
  compact = false,
}) => {
  const { colors } = useTheme();
  const size = selected ? 32 : compact ? 22 : 28;
  const inner = selected ? 12 : compact ? 8 : 10;
  const tail = Math.round(size * 0.42);

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
      <View style={[styles.pin, { width: size }]} collapsable={false}>
        <View
          style={[
            styles.head,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              borderColor: '#fff',
              shadowColor: color,
            },
          ]}
        >
          <View
            style={[
              styles.inner,
              {
                width: inner,
                height: inner,
                borderRadius: inner / 2,
              },
            ]}
          />
          <View
            style={[
              styles.dot,
              {
                width: inner * 0.42,
                height: inner * 0.42,
                borderRadius: inner,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.tail,
            {
              width: tail,
              height: tail,
              backgroundColor: color,
              marginTop: -tail * 0.62,
            },
          ]}
        />
      </View>
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
  pin: {
    alignItems: 'center',
  },
  head: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  inner: {
    backgroundColor: '#fff',
  },
  dot: {
    position: 'absolute',
  },
  tail: {
    zIndex: 1,
    transform: [{ rotate: '45deg' }],
  },
});

export default FieldPinMark;
