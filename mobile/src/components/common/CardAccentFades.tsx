import React from 'react';
import { View, StyleSheet } from 'react-native';
import { hexToRgba } from '../../utils/hexToRgba';

type Props = {
  /** Soft left wash only — matches web AccentCard (“do not tint the whole card”). */
  fieldColor?: string | null;
  /**
   * @deprecated Ignored. Right-side stripe bands were removed; use AccentCard endColor if needed.
   */
  endColor?: string | null;
};

/**
 * Minimal left wash helper for legacy call sites.
 * Prefer composing `AccentCard` which owns accent bar + wash.
 */
const CardAccentFades: React.FC<Props> = ({ fieldColor }) => {
  if (!fieldColor) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.leftWash, { backgroundColor: hexToRgba(fieldColor, 0.11) }]}
    />
  );
};

const styles = StyleSheet.create({
  leftWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '28%',
    zIndex: 0,
  },
});

export default CardAccentFades;
