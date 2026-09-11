import React, { useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion, createElevation } from '../../theme';

const TABLET_BREAKPOINT = 768;

export type SheetEdge = 'left' | 'end' | 'bottom';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  kicker?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** left = More overlay; end = right on tablet / bottom on phone; bottom = always bottom */
  edge?: SheetEdge;
  size?: 'sm' | 'md' | 'lg';
  accent?: boolean;
  accentColor?: string;
  hideClose?: boolean;
  /** Flush body (no padding) */
  flush?: boolean;
  /** Wrap body in ScrollView (default true). Set false when children scroll themselves. */
  scrollable?: boolean;
  maxHeightPercent?: number;
};

/**
 * Shared overlay — mirrors web RightDrawer + phone More sidebar.
 * - edge="left": always slides from the left
 * - edge="end": right drawer on tablet (≥768), bottom sheet on phone
 * - edge="bottom": always bottom sheet
 */
const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  kicker,
  icon,
  footer,
  children,
  edge = 'end',
  size = 'md',
  accent = false,
  accentColor,
  hideClose = false,
  flush = false,
  scrollable = true,
  maxHeightPercent = 92,
}) => {
  const { colors, tapMin, fontScaleMultiplier, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const anim = useRef(new Animated.Value(0)).current;

  const placement = useMemo(() => {
    if (edge === 'left') return 'left' as const;
    if (edge === 'bottom') return 'bottom' as const;
    return isTablet ? ('right' as const) : ('bottom' as const);
  }, [edge, isTablet]);

  const panelWidth = useMemo(() => {
    const caps = { sm: 320, md: 380, lg: 440 };
    return Math.min(caps[size], width * 0.92);
  }, [size, width]);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: motion.durationMs.ui,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const drawerAccent = accentColor || (accent ? colors.primary : colors.accentGold);
  const mixAccent = accent
    ? drawerAccent
    : // olive 70% + gold 30% approximation
      colors.primary;

  const translate = useMemo(() => {
    if (placement === 'left') {
      return {
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-panelWidth, 0],
            }),
          },
        ],
      };
    }
    if (placement === 'right') {
      return {
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [panelWidth, 0],
            }),
          },
        ],
      };
    }
    return {
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [height * 0.4, 0],
          }),
        },
      ],
    };
  }, [placement, anim, panelWidth, height]);

  const panelStyle = useMemo(() => {
    if (placement === 'left') {
      return {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
        width: panelWidth,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        borderTopRightRadius: radii.xl,
        borderBottomRightRadius: radii.xl,
      };
    }
    if (placement === 'right') {
      return {
        position: 'absolute' as const,
        right: 0,
        top: 0,
        bottom: 0,
        width: panelWidth,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingRight: insets.right,
        borderTopLeftRadius: radii.xl,
        borderBottomLeftRadius: radii.xl,
      };
    }
    return {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: `${maxHeightPercent}%` as unknown as number,
      paddingBottom: Math.max(insets.bottom, spacing.base),
      borderTopLeftRadius: radii.sheet,
      borderTopRightRadius: radii.sheet,
    };
  }, [placement, panelWidth, insets, maxHeightPercent]);

  const accentBarStyle =
    placement === 'bottom'
      ? {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          backgroundColor: mixAccent,
          zIndex: 4,
        }
      : placement === 'left'
        ? {
            position: 'absolute' as const,
            top: 0,
            right: 0,
            bottom: 0,
            width: 3,
            backgroundColor: mixAccent,
            zIndex: 4,
          }
        : {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            backgroundColor: mixAccent,
            zIndex: 4,
          };

  return (
    <Modal visible={open} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...createElevation(colors, isDark ? 'xl' : 'lg'),
            },
            translate,
          ]}
        >
          <View style={accentBarStyle} pointerEvents="none" />
          {placement === 'bottom' ? (
            <View style={[styles.handle, { backgroundColor: colors.textTertiary + '6A' }]} />
          ) : null}

          {(title || !hideClose) && (
            <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.headerMain}>
                {icon ? (
                  <View
                    style={[
                      styles.iconTile,
                      {
                        backgroundColor: (accentColor || colors.primary) + '22',
                        borderColor: (accentColor || colors.primary) + '20',
                      },
                    ]}
                  >
                    {icon}
                  </View>
                ) : null}
                <View style={styles.copy}>
                  {kicker ? (
                    <Text
                      style={[
                        styles.kicker,
                        {
                          color: accentColor || colors.primary,
                          fontSize: 11 * fontScaleMultiplier,
                        },
                      ]}
                    >
                      {kicker}
                    </Text>
                  ) : null}
                  {typeof title === 'string' ? (
                    <Text
                      style={[
                        styles.title,
                        { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier },
                      ]}
                      numberOfLines={2}
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
                          { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier },
                        ]}
                      >
                        {subtitle}
                      </Text>
                    ) : (
                      subtitle
                    )
                  ) : null}
                </View>
              </View>
              {!hideClose ? (
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.closeBtn,
                    {
                      minWidth: tapMin,
                      minHeight: tapMin,
                      borderColor: colors.borderLight,
                      backgroundColor: colors.surfaceMuted,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              ) : null}
            </View>
          )}

          {scrollable ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={flush ? undefined : styles.bodyPad}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.bodyFlex, flush ? undefined : styles.bodyPad]}>{children}</View>
          )}

          {footer ? (
            <View
              style={[
                styles.footer,
                {
                  borderTopColor: colors.borderLight,
                  backgroundColor: colors.surfaceMuted,
                  paddingBottom: Math.max(insets.bottom, spacing.md),
                },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minWidth: 0,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: { flex: 1, minWidth: 0, paddingTop: 2 },
  kicker: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontWeight: '750' as unknown as '700',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  subtitle: {
    marginTop: 4,
    lineHeight: 20,
  },
  closeBtn: {
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyFlex: { flex: 1, minHeight: 0 },
  bodyPad: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});

export default Sheet;
