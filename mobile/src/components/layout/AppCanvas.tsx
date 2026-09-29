import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';

const canvasLight = require('../../../assets/images/app-canvas-light.jpg');
const canvasDark = require('../../../assets/images/app-canvas-dark.jpg');
const harvestCanvasLight = require('../../../assets/images/harvest-canvas-light.jpg');
const harvestCanvasDark = require('../../../assets/images/harvest-canvas-dark.jpg');

/**
 * Illustrated parchment — mirrors web `.app-canvas`.
 * Live harvest swaps to the wheat-gold harvest canvases (web harvest-mode).
 * Painted inside ScreenLayout so native-stack opaque scenes cannot hide it.
 */
type Props = {
  /** 1 = full parchment, ~0.45 quieter behind dense lists */
  opacity?: number;
  /**
   * Wash the lower parchment into the page color.
   * Line art can stay faintly visible up top without running under text and the FAB.
   */
  settle?: boolean;
};

const AppCanvas: React.FC<Props> = ({ opacity = 1, settle = false }) => {
  const { colors, isDark } = useTheme();
  const harvest = useHarvestCampaignOptional();
  const harvestLive = Boolean(harvest?.isLive);
  const source = harvestLive
    ? isDark
      ? harvestCanvasDark
      : harvestCanvasLight
    : isDark
      ? canvasDark
      : canvasLight;

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { backgroundColor: colors.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={source}
        style={[styles.image, { opacity }]}
        resizeMode="cover"
      />
      {settle ? (
        <View pointerEvents="none" style={styles.settle}>
          <View style={styles.settleTop} />
          <View style={[styles.settleMid, { backgroundColor: colors.background }]} />
          <View style={[styles.settleBottom, { backgroundColor: colors.background }]} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  settle: {
    ...StyleSheet.absoluteFillObject,
  },
  settleTop: { flex: 0.55 },
  settleMid: { flex: 1.4, opacity: 0.9 },
  settleBottom: { flex: 1.6, opacity: 0.94 },
});

export default AppCanvas;
