import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion, createElevation } from '../../theme';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Optional leading visual (icon tile, illustration). */
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Thin accent strip along the top edge. */
  accent?: boolean;
  accentColor?: string;
  /** Allow backdrop / back button to dismiss (default true). */
  dismissible?: boolean;
  /** Max panel width; defaults to a compact alert size. */
  maxWidth?: number;
  testID?: string;
};

/**
 * Shared centered popup shell — theme-aware, rounded, animated.
 * Specialize via composition (see AlertDialog) rather than forking Modal chrome.
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  icon,
  title,
  subtitle,
  children,
  footer,
  accent = false,
  accentColor,
  dismissible = true,
  maxWidth = 340,
  testID,
}) => {
  const { colors, fontScaleMultiplier, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const stripColor = accentColor || colors.primary;
  const panelWidth = Math.min(maxWidth, width - spacing.xl * 2);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: motion.durationMs.ui,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const handleRequestClose = () => {
    if (dismissible) onClose();
  };

  return (
    <Modal
      visible={open}
      animationType="none"
      transparent
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          onPress={handleRequestClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={!dismissible}
        />
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View
            testID={testID}
            accessibilityRole="alert"
            style={[
              styles.panel,
              {
                width: panelWidth,
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                opacity: anim,
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
                ...createElevation(colors, isDark ? 'lg' : 'md'),
              },
            ]}
          >
            {accent ? (
              <View
                style={[styles.accentStrip, { backgroundColor: stripColor }]}
                pointerEvents="none"
              />
            ) : null}

            {(icon || title || subtitle) && (
              <View style={styles.header}>
                {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
                {typeof title === 'string' ? (
                  <Text
                    style={[
                      styles.title,
                      {
                        color: colors.textPrimary,
                        fontSize: 18 * fontScaleMultiplier,
                        lineHeight: 24 * fontScaleMultiplier,
                      },
                    ]}
                  >
                    {title}
                  </Text>
                ) : (
                  title
                )}
                {subtitle ? (
                  typeof subtitle === 'string' ? (
                    <Text
                      style={[
                        styles.subtitle,
                        {
                          color: colors.textSecondary,
                          fontSize: 14 * fontScaleMultiplier,
                          lineHeight: 20 * fontScaleMultiplier,
                        },
                      ]}
                    >
                      {subtitle}
                    </Text>
                  ) : (
                    subtitle
                  )
                ) : null}
              </View>
            )}

            {children ? <View style={styles.body}>{children}</View> : null}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconSlot: {
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.styles.h3,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.styles.bodySmall,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    gap: spacing.sm,
  },
});

export default Dialog;
