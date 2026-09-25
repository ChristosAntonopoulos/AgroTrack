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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import { getDockMetrics } from '../../navigation/dockMetrics';
import { useDock } from '../../navigation/DockContext';
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
  /** Extra bottom padding for floating dock (tab roots). Default false — enable on tab screens. */
  tabBarInset?: boolean;
  /**
   * Clear the persistent dock. Defaults on.
   * Turn off when the screen already pads its own scroll content.
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
  const { colors, tapMin } = useTheme();
  const insets = useSafeAreaInsets();
  const dock = useDock();
  const { bottomInset, dockHeight } = getDockMetrics(tapMin, insets.bottom);
  const clearDock = tabBarInset || (dockInset && dock.visible);
  const bottomPad = clearDock ? dockHeight + bottomInset + spacing.md : spacing['3xl'];

  const body = scroll ? (
    <ScrollView
      style={[styles.flex, styles.transparent, style]}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: bottomPad },
        contentContainerStyle,
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
        clearDock && { paddingBottom: bottomPad },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (plain) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {body}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppCanvas opacity={canvasOpacity} />
      {body}
    </View>
  );
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
