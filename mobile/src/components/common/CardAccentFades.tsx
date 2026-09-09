import React from 'react';
import { View, StyleSheet } from 'react-native';
import { hexToRgba } from '../../utils/hexToRgba';

type Props = {
  /** Field colour — soft wash from the left (hard left border stays on the card). */
  fieldColor?: string | null;
  /** System category / type colour — elegant multi-stop fade from the right. */
  endColor?: string | null;
};

/**
 * Shared AccentCard-style washes for mobile list cards.
 * No hard right border — soft layered opacity only.
 */
const CardAccentFades: React.FC<Props> = ({ fieldColor, endColor }) => (
  <>
    {fieldColor ? (
      <View pointerEvents="none" style={styles.startWashLayer}>
        <View style={[styles.band, styles.startWide, { backgroundColor: hexToRgba(fieldColor, 0.1) }]} />
        <View style={[styles.band, styles.startMid, { backgroundColor: hexToRgba(fieldColor, 0.05) }]} />
      </View>
    ) : null}
    {endColor ? (
      <View pointerEvents="none" style={styles.endFadeLayer}>
        <View style={[styles.band, styles.endWide, { backgroundColor: hexToRgba(endColor, 0.04) }]} />
        <View style={[styles.band, styles.endMid, { backgroundColor: hexToRgba(endColor, 0.1) }]} />
        <View style={[styles.band, styles.endEdge, { backgroundColor: hexToRgba(endColor, 0.18) }]} />
      </View>
    ) : null}
  </>
);

const styles = StyleSheet.create({
  startWashLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '42%',
    zIndex: 0,
  },
  endFadeLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '48%',
    zIndex: 0,
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  startWide: {
    left: 0,
    width: '100%',
  },
  startMid: {
    left: 0,
    width: '55%',
  },
  endWide: {
    right: 0,
    width: '100%',
  },
  endMid: {
    right: 0,
    width: '58%',
  },
  endEdge: {
    right: 0,
    width: '28%',
  },
});

export default CardAccentFades;
