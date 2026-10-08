import React, { useCallback, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { measureViewInWindow } from '../../onboarding/measureSpotlight';
import type { CoachTargetId } from '../../onboarding/steps';

type Props = {
  id: CoachTargetId;
  children: React.ReactNode;
  /**
   * Must make this wrapper match the tappable control exactly — the reported
   * rect is this view, not the child. In a stretched flex slot, give the child
   * `flex: 1` so the two boxes stay identical.
   */
  style?: StyleProp<ViewStyle>;
};

/** Reports this control's window rect while it is the active navigation lesson. */
const GuideTarget: React.FC<Props> = ({ id, children, style }) => {
  const ref = useRef<View>(null);
  const activation = useOwnerActivationOptional();
  const report = activation?.reportGuideTarget;
  const active = activation?.guideBeat === id && Boolean(report);

  const publish = useCallback(() => {
    if (!active || !report) return;
    measureViewInWindow(ref.current, (rect) => {
      if (rect.width < 8 || rect.height < 8) return;
      report(id, rect);
    });
  }, [active, id, report]);

  useEffect(() => {
    if (!active) return;
    // Scroll offsets and header transitions move the control without firing
    // onLayout. Remeasure sparingly — frequent polls made the History ring walk.
    const frame = requestAnimationFrame(publish);
    const settle = setTimeout(publish, 120);
    const settle2 = setTimeout(publish, 400);
    const interval = setInterval(publish, 1200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      clearTimeout(settle2);
      clearInterval(interval);
    };
  }, [active, publish]);

  return (
    <View ref={ref} collapsable={false} style={style} onLayout={publish}>
      {children}
    </View>
  );
};

export default GuideTarget;
