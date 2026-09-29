import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import type { GuideTargetId } from '../../onboarding/steps';

type Props = {
  id: GuideTargetId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Reports this control's window rect while it is the active navigation lesson. */
const GuideTarget: React.FC<Props> = ({ id, children, style }) => {
  const ref = useRef<View>(null);
  const activation = useOwnerActivationOptional();
  const beat = activation?.guideBeat;
  const report = activation?.reportGuideTarget;

  useEffect(() => {
    if (beat !== id || !report) return;
    let cancelled = false;

    const measure = () => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        report(id, { x, y, width, height });
      });
    };

    measure();
    const interval = setInterval(measure, 400);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [beat, id, report]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
};

export default GuideTarget;
