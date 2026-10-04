import { Platform } from 'react-native';
import { touch } from '../theme';

/** How far the primary FAB sits above the home indicator. */
export const FOOTER_LIFT = 22;

/** Extra air so the last card can rest above the highest floating control. */
export const EXTRA_SCROLL_SPACE = 24;

/**
 * Shared dock geometry. `contentBottomInset` is the padding scroll content
 * needs so the final item clears the FAB: safe area + lift + FAB height + buffer.
 */
export const getDockMetrics = (tapMin: number, bottomSafe: number) => {
  const bottomInset = Math.max(bottomSafe, Platform.OS === 'ios' ? 10 : 8);
  const dockMargin = 12;
  const dockPadBottom = 10;
  const contentHeight = Math.max(54, tapMin);
  const dockHeight = contentHeight + dockPadBottom + 8;
  const fabSize = Math.round((touch?.fab ?? 56) * 1.2);
  const floatingActionHeight = fabSize;
  const contentBottomInset = bottomInset + FOOTER_LIFT + floatingActionHeight + EXTRA_SCROLL_SPACE;
  return {
    bottomInset,
    dockMargin,
    dockPadBottom,
    contentHeight,
    dockHeight,
    fabSize,
    floatingActionHeight,
    contentBottomInset,
  };
};
