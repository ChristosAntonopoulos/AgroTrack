/** Central breakpoint values — keep in sync with responsive.css and theme.css docs. */
export const breakpoints = { sm: 480, md: 768, lg: 1024 } as const;

export type BreakpointKey = keyof typeof breakpoints;

export const media = {
  maxSm: `(max-width: ${breakpoints.sm}px)`,
  maxMd: `(max-width: ${breakpoints.md}px)`,
  maxLg: `(max-width: ${breakpoints.lg}px)`,
  minSm: `(min-width: ${breakpoints.sm + 1}px)`,
  minMd: `(min-width: ${breakpoints.md + 1}px)`,
  minLg: `(min-width: ${breakpoints.lg + 1}px)`,
} as const;
