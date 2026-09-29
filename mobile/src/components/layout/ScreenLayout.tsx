import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControlProps,
  RefreshControl,
  Platform,
  StyleProp,
} from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import { EXTRA_SCROLL_SPACE } from '../../navigation/dockMetrics';
import { useDock } from '../../navigation/DockContext';
import { useContentBottomInset } from '../../navigation/useContentBottomInset';
import AppCanvas from './AppCanvas';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  refreshControl?: RefreshControlProps;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Horizontal inset + light top breathing room */
  padded?: boolean;
  /** Same as dockInset. Reserves space for the floating action dock. */
  tabBarInset?: boolean;
  /**
   * When the dock is visible, reserve safe area + FAB height + 24px
   * so the last item can scroll clear of the floating control. Defaults on.
   */
  dockInset?: boolean;
  /**
   * Skip parchment (map / camera / full-bleed photo surfaces).
   * Default false — post-login screens should show the journal canvas.
   */
  plain?: boolean;
  /** Soften illustrated parchment (0–1). Default 1. */
  canvasOpacity?: number;
}

/** Journal shell — parchment canvas behind paper islands (matches web PageContainer + app-canvas). */
const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  scroll = false,
  scrollEnabled = true,
  refreshControl,
  contentContainerStyle,
  style,
  padded = false,
  tabBarInset = false,
  dockInset = true,
  plain = false,
  canvasOpacity = 1,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = React.useContext(HeaderHeightContext) ?? 0;
  const dock = useDock();
  const contentInset = useContentBottomInset();
  const insetEnabled = tabBarInset || dockInset;
  const bottomPad = !insetEnabled
    ? 0
    : dock.visible
      ? contentInset
      : Math.max(insets.bottom, 0) + EXTRA_SCROLL_SPACE;

  const body = scroll ? (
    <ScrollView
      style={[styles.flex, styles.transparent, style]}
      contentContainerStyle={[
        padded && styles.padded,
        contentContainerStyle,
        { paddingBottom: resolvePaddingBottom(bottomPad, contentContainerStyle) },
      ]}
      scrollEnabled={scrollEnabled}
      nestedScrollEnabled={Platform.OS === 'android'}
      refreshControl={
        refreshControl ? <RefreshControl {...refreshControl} tintColor={colors.primary} /> : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.transparent,
        padded && styles.paddedBody,
        style,
        { paddingBottom: resolvePaddingBottom(bottomPad, style) },
      ]}
    >
      {children}
    </View>
  );

  if (plain) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: headerHeight }]}>
        {body}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppCanvas opacity={canvasOpacity} />
      <View style={[styles.flex, headerHeight > 0 ? { paddingTop: headerHeight } : null]}>{body}</View>
    </View>
  );
};

/** Callers may set their own paddingBottom. The dock clearance is a minimum, never replaced. */
const resolvePaddingBottom = (base: number, incoming?: StyleProp<ViewStyle>): number => {
  const flat = StyleSheet.flatten(incoming);
  const caller = typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : 0;
  return Math.max(base, caller);
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  padded: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
  paddedBody: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
});

export default ScreenLayout;
