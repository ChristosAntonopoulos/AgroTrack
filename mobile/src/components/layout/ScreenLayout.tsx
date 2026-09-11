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
}

/** Quiet limestone screen shell — padding owned here, not by competing headers. */
const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  scroll = false,
  scrollEnabled = true,
  refreshControl,
  contentContainerStyle,
  style,
  padded = false,
  tabBarInset = false,
}) => {
  const { colors, tapMin } = useTheme();
  const insets = useSafeAreaInsets();
  const { bottomInset, dockHeight } = getDockMetrics(tapMin, insets.bottom);
  const bottomPad = tabBarInset ? dockHeight + bottomInset + spacing.md : spacing['3xl'];

  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }, style]}
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
    );
  }

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: colors.background },
        padded && styles.paddedBody,
        tabBarInset && { paddingBottom: bottomPad },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  paddedBody: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
});

export default ScreenLayout;
