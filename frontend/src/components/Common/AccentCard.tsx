import React, { ReactNode, CSSProperties } from 'react';
import './AccentCard.css';

export type AccentCardProps = {
  children: ReactNode;
  /** Primary accent (usually field color) — left edge + soft wash. */
  accentColor?: string | null;
  /** Secondary accent (e.g. weather mood) — top hairline / icon tint. */
  secondaryColor?: string | null;
  /** End accent — soft right-side fade (system category / type color). */
  endColor?: string | null;
  className?: string;
  as?: 'button' | 'div' | 'article';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  compact?: boolean;
  /** Force interactive chrome when wrapped in a Link (no onClick on the card). */
  interactive?: boolean;
};

/**
 * Reusable accent shell for Chronologio, field lists, and similar cards.
 * Uses CSS variables so callers stay free of inline border hacks.
 */
const AccentCard: React.FC<AccentCardProps> = ({
  children,
  accentColor,
  secondaryColor,
  endColor,
  className = '',
  as = 'div',
  onClick,
  type = 'button',
  style,
  compact = false,
  interactive = false,
}) => {
  const classes = [
    'accent-card',
    compact && 'accent-card--compact',
    (onClick || interactive) && 'accent-card--interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const cssVars = {
    ...style,
    ...(accentColor
      ? {
          ['--accent-color' as string]: accentColor,
          ['--accent-wash' as string]: `color-mix(in srgb, ${accentColor} 11%, transparent)`,
        }
      : {}),
    ...(secondaryColor
      ? {
          ['--accent-secondary' as string]: secondaryColor,
          ['--accent-secondary-wash' as string]: `color-mix(in srgb, ${secondaryColor} 12%, transparent)`,
        }
      : {}),
    ...(endColor
      ? {
          ['--accent-end' as string]: endColor,
          ['--accent-end-edge' as string]: `color-mix(in srgb, ${endColor} 20%, transparent)`,
          ['--accent-end-soft' as string]: `color-mix(in srgb, ${endColor} 11%, transparent)`,
          ['--accent-end-mid' as string]: `color-mix(in srgb, ${endColor} 5%, transparent)`,
        }
      : {}),
  } as CSSProperties;

  if (as === 'button') {
    return (
      <button type={type} className={classes} style={cssVars} onClick={onClick}>
        {children}
      </button>
    );
  }

  const Tag = as;
  return (
    <Tag className={classes} style={cssVars} onClick={onClick}>
      {children}
    </Tag>
  );
};

export default AccentCard;
