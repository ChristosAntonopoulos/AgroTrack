import { Platform } from 'react-native';
import { touch } from '../theme';

/** Dock height shared by MainTabs and ScreenLayout bottom inset. */
export const getDockMetrics = (tapMin: number, bottomSafe: number) => {
  const bottomInset = Math.max(bottomSafe, Platform.OS === 'ios' ? 10 : 8);
  const dockMargin = 12;
  const dockPadBottom = 10;
  const contentHeight = Math.max(54, tapMin);
  const dockHeight = contentHeight + dockPadBottom + 8;
  return {
    bottomInset,
    dockMargin,
    dockPadBottom,
    contentHeight,
    dockHeight,
    fabSize: touch?.fab ?? 56,
  };
};
