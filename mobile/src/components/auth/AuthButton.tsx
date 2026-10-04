import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { loginTheme } from '../../theme/loginTheme';
import { radii } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
};

/** Login-palette skin over the shared button. */
const AuthButton: React.FC<Props> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  style,
}) => {
  const isPrimary = variant === 'primary';
  const foreground =
    variant === 'primary'
      ? loginTheme.buttonText
      : variant === 'ghost'
        ? loginTheme.linkMuted
        : loginTheme.link;

  return (
    <Button
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      fullWidth
      size="large"
      variant={variant === 'primary' ? 'primary' : variant}
      textColor={foreground}
      iconPosition={iconPosition}
      icon={icon ? <Ionicons name={icon} size={18} color={foreground} /> : undefined}
      style={StyleSheet.flatten([
        styles.base,
        isPrimary && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        style,
      ])}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.lg,
    elevation: 0,
    shadowOpacity: 0,
  },
  primary: {
    backgroundColor: loginTheme.buttonBg,
    borderWidth: 0,
    shadowColor: loginTheme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 4,
  },
  outline: {
    backgroundColor: loginTheme.googleBg,
    borderWidth: 1,
    borderColor: loginTheme.googleBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 44,
  },
});

export default AuthButton;
