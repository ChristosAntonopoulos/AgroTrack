import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Dialog, { type DialogProps } from './Dialog';
import Button, { type ButtonProps } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../theme';

export type AlertDialogTone = 'default' | 'success' | 'warning' | 'error' | 'info';

export type AlertDialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AlertDialogProps = Omit<DialogProps, 'children' | 'footer' | 'icon' | 'subtitle'> & {
  message?: string;
  tone?: AlertDialogTone;
  buttons?: AlertDialogButton[];
};

const TONE_ICON: Record<AlertDialogTone, React.ComponentProps<typeof Ionicons>['name']> = {
  default: 'information-circle-outline',
  success: 'checkmark-circle',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  info: 'information-circle-outline',
};

/**
 * Themed alert / confirm popup built on Dialog.
 * Drop-in replacement shape for React Native Alert.alert(title, message, buttons).
 */
const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onClose,
  title,
  message,
  tone = 'default',
  buttons,
  dismissible = true,
  accent,
  accentColor,
  maxWidth,
  testID,
}) => {
  const { colors, fontScaleMultiplier } = useTheme();

  const toneColor =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warningDark
        : tone === 'error'
          ? colors.error
          : tone === 'info'
            ? colors.info
            : colors.primary;

  const toneBg =
    tone === 'success'
      ? colors.successLight
      : tone === 'warning'
        ? colors.warningLight
        : tone === 'error'
          ? colors.errorLight
          : tone === 'info'
            ? colors.infoLight
            : colors.primaryLight;

  const actions = buttons?.length
    ? buttons
    : [{ text: 'OK', style: 'default' as const, onPress: onClose }];

  const resolveVariant = (
    button: AlertDialogButton,
    index: number
  ): ButtonProps['variant'] => {
    if (button.style === 'destructive') return 'error';
    if (button.style === 'cancel') return 'ghost';
    if (index === actions.length - 1) return 'primary';
    return 'outline';
  };

  const handlePress = (button: AlertDialogButton) => {
    // Close first so stacked dialogs / reopen sheets aren't fighting this modal.
    onClose();
    // Defer action so the modal unmount settles before navigation / sheet reopen.
    requestAnimationFrame(() => {
      button.onPress?.();
    });
  };

  const showIcon = tone !== 'default' || Boolean(title || message);
  const bodyAsTitle = !title && Boolean(message);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      accent={accent ?? tone !== 'default'}
      accentColor={accentColor ?? (tone !== 'default' ? toneColor : undefined)}
      maxWidth={maxWidth}
      testID={testID}
      icon={
        showIcon ? (
          <View style={[styles.iconTile, { backgroundColor: toneBg, borderColor: toneColor + '33' }]}>
            <Ionicons name={TONE_ICON[tone]} size={28} color={toneColor} />
          </View>
        ) : undefined
      }
      title={bodyAsTitle ? message : title}
      footer={
        <View style={styles.actions}>
          {actions.map((button, index) => (
            <Button
              key={`${button.text}-${index}`}
              title={button.text}
              variant={resolveVariant(button, index)}
              onPress={() => handlePress(button)}
              fullWidth
              size="medium"
            />
          ))}
        </View>
      }
    >
      {!bodyAsTitle && message ? (
        <Text
          style={[
            styles.message,
            {
              color: colors.textSecondary,
              fontSize: 15 * fontScaleMultiplier,
              lineHeight: 22 * fontScaleMultiplier,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </Dialog>
  );
};

const styles = StyleSheet.create({
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  message: {
    ...typography.styles.body,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});

export default AlertDialog;
