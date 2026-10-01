import React from 'react';
import './NavCoach.css';

type Props = {
  /** One short instruction. The highlighted control is the action. */
  line: string;
  /** Arrow points up when the cue sits under the target. */
  point?: 'up' | 'down';
  /** Horizontal center of the arrow, in pixels from the cue's left edge. */
  arrowX?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** Pointer cue: one sentence aimed at the control to tap. */
const OnboardingStepCard: React.FC<Props> = ({ line, point = 'up', arrowX, className, style }) => {
  return (
    <article
      className={`coach-cue${point === 'down' ? ' is-above' : ' is-below'}${className ? ` ${className}` : ''}`}
      style={{
        ...style,
        ['--cue-arrow' as string]: arrowX != null ? `${arrowX}px` : '28px',
      }}
    >
      <p className="coach-cue-line">{line}</p>
    </article>
  );
};

export default OnboardingStepCard;
