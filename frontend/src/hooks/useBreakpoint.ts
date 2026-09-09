import { breakpoints, BreakpointKey, media } from '../styles/breakpoints';
import { useMediaQuery } from './useMediaQuery';

/**
 * Returns true when viewport is at or below the named breakpoint.
 * sm = 480, md = 768, lg = 1024
 */
export function useBreakpoint(key: BreakpointKey): boolean {
  const query =
    key === 'sm' ? media.maxSm : key === 'md' ? media.maxMd : media.maxLg;
  return useMediaQuery(query);
}

export function useIsMobile(): boolean {
  return useBreakpoint('md');
}

export { breakpoints };
