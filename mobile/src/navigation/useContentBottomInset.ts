import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDock } from './DockContext';
import { EXTRA_SCROLL_SPACE, getDockMetrics } from './dockMetrics';

/**
 * Bottom padding for scroll content.
 * With a floating dock: safe area + FAB height + 24px.
 * Without one: safe area + 24px.
 */
export const useContentBottomInset = (): number => {
  const dock = useDock();
  const insets = useSafeAreaInsets();
  const { tapMin } = useTheme();
  if (!dock.visible) return Math.max(insets.bottom, 0) + EXTRA_SCROLL_SPACE;
  return getDockMetrics(tapMin, insets.bottom).contentBottomInset;
};
