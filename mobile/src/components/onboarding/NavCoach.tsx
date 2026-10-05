import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { measureViewInWindow, sameRect, type WindowRect } from '../../onboarding/measureSpotlight';
import { ONBOARDING_JOURNEY, type CoachTargetId, type OnboardingJourneyId } from '../../onboarding/steps';
import OnboardingStepLabel from './OnboardingStepLabel';

/** Breathing room between the control and the cut-out edge. */
const PAD = 8;
/** Space the tip card needs below the hole before it flips above it. */
const TIP_CLEARANCE = 120;

/**
 * Dims the screen around one control and names the tap.
 *
 * Geometry contract: GuideTarget reports the control in window space, and this
 * overlay measures its own frame in the same space, so `target - host` is the
 * exact local position regardless of safe-area padding, headers or banners
 * above us. Dim cut-out and ring are driven by one rect — never two.
 */
const NavCoach: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('onboarding');
  const hostRef = useRef<View>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const [host, setHost] = useState<WindowRect | null>(null);
  const beat = activation?.guideBeat ?? null;
  const journeyId = beat ? journeyStep(beat) : null;
  const rect = activation?.guideRect ?? null;
  const armed = Boolean(beat && rect);

  const syncHost = useCallback(() => {
    measureViewInWindow(hostRef.current, (next) => {
      if (next.width < 1 || next.height < 1) return;
      setHost((prev) => (sameRect(prev, next) ? prev : next));
    });
  }, []);

  useEffect(() => {
    if (!armed) return;
    const frame = requestAnimationFrame(syncHost);
    const interval = setInterval(syncHost, 300);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [armed, syncHost]);

  useEffect(() => {
    if (!armed) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [armed, pulse]);

  // The host stays mounted so its frame is known before the first lesson paints.
  // Drawing owns the whole map. The cue sits in the bottom sheet, not over the pins.
  const hole =
    beat && beat !== 'drawBoundary' && rect && host ? cutOut(rect, host) : null;

  // Opacity only: a scaled ring would leave its border outside the cut-out edge
  // and read as a second, ghost outline.
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });

  return (
    <View
      ref={hostRef}
      pointerEvents="box-none"
      collapsable={false}
      style={styles.host}
      onLayout={syncHost}
    >
      {hole && host ? (
        <>
          {/* Dim blocks taps; the hole holds no view so the real control stays tappable. */}
          <Dim style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <Dim style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <Dim
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          <Dim style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                left: hole.left,
                top: hole.top,
                width: hole.width,
                height: hole.height,
                borderRadius: beat === 'createField' ? Math.max(hole.width, hole.height) / 2 : 18,
                opacity: ringOpacity,
              },
            ]}
          />

          <View pointerEvents="none" style={[styles.card, tipPlacement(hole, host)]}>
            {journeyId ? <OnboardingStepLabel id={journeyId} /> : null}
            <Text style={styles.title}>{beat ? cueFor(beat, t) : ''}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
};

type Hole = { left: number; top: number; width: number; height: number };

/** Target window rect → overlay-local cut-out, clamped to the overlay frame. */
const cutOut = (target: WindowRect, host: WindowRect): Hole | null => {
  const left = Math.max(0, target.x - host.x - PAD);
  const top = Math.max(0, target.y - host.y - PAD);
  const right = Math.min(host.width, target.x - host.x + target.width + PAD);
  const bottom = Math.min(host.height, target.y - host.y + target.height + PAD);
  const width = right - left;
  const height = bottom - top;
  // Scrolled out of view, or measured before layout settled.
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
};

const FORM_CUES = new Set<CoachTargetId>([
  'createGrove',
  'locatePlace',
  'drawBoundary',
  'saveBoundary',
]);

const JOURNEY_IDS = new Set<string>(ONBOARDING_JOURNEY);

const journeyStep = (id: CoachTargetId): OnboardingJourneyId | null =>
  JOURNEY_IDS.has(id) ? (id as OnboardingJourneyId) : null;

const cueFor = (beat: CoachTargetId, t: (key: string) => string): string =>
  FORM_CUES.has(beat) ? t(`spotlight.${beat}.cue`) : t(`coach.${beat}.cue`);

const tipPlacement = (hole: Hole, host: WindowRect) => {
  const holeBottom = hole.top + hole.height;
  const below = holeBottom + TIP_CLEARANCE <= host.height;
  return {
    left: 20,
    right: 20,
    top: below ? holeBottom + 14 : undefined,
    bottom: below ? undefined : Math.max(14, host.height - hole.top + 14),
  };
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
    elevation: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e261c',
  },
});

export default NavCoach;
