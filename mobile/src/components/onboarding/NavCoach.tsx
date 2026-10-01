import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';

const PAD = 8;

/** Dims the screen around one control and names the tap, like a game prompt. */
const NavCoach: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('onboarding');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const beat = activation?.guideBeat ?? null;
  const rect = activation?.guideRect ?? null;

  useEffect(() => {
    if (!beat || !rect) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [beat, pulse, rect]);

  if (!beat || !rect) return null;

  const hole = {
    left: Math.max(0, rect.x - PAD),
    top: Math.max(0, rect.y - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const holeBottom = hole.top + hole.height;
  const holeRight = hole.left + hole.width;
  const round = beat === 'homeButton' || beat === 'createField';
  const radius = round ? Math.max(hole.width, hole.height) / 2 : 18;

  const placeBelow = hole.top < windowHeight * 0.45 || holeBottom + 120 < windowHeight;
  const cardTop = placeBelow ? holeBottom + 14 : undefined;
  const cardBottom = placeBelow ? undefined : windowHeight - hole.top + 14;

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.35] });

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Dim style={{ top: 0, left: 0, right: 0, height: hole.top }} />
      <Dim style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
      <Dim style={{ top: hole.top, left: holeRight, right: 0, height: hole.height }} />
      <Dim style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: hole.left,
            top: hole.top,
            width: hole.width,
            height: hole.height,
            borderRadius: radius,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <View
        style={[
          styles.card,
          {
            top: cardTop,
            bottom: cardBottom,
            left: 20,
            right: 20,
            maxWidth: windowWidth - 40,
          },
        ]}
      >
        <Text style={styles.title}>{t(`coach.${beat}.cue`)}</Text>
      </View>
    </View>
  );
};

const Dim: React.FC<{ style: object }> = ({ style }) => <View style={[styles.dim, style]} />;

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(16, 20, 14, 0.62)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#e7f0df',
    shadowColor: '#e7f0df',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  card: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#2f5d38',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e261c',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3d4a38',
  },
});

export default NavCoach;
