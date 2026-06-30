import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControlProps,
  RefreshControl,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  refreshControl?: RefreshControlProps;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  padded?: boolean;
}

/** Consistent olive-oil screen shell for all inner pages */
const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  scroll = false,
  scrollEnabled = true,
  refreshControl,
  contentContainerStyle,
  style,
  padded = false,
}) => {
  const { colors } = useTheme();

  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }, style]}
        contentContainerStyle={[
          padded && styles.padded,
          styles.scrollContent,
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
    <View style={[styles.flex, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.base },
  scrollContent: { paddingBottom: spacing['2xl'] },
});

export default ScreenLayout;
