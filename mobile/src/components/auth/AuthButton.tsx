import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { loginTheme } from '../../theme/loginTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: IconName;
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
  style,
}) => {
  const isPrimary = variant === 'primary';
  const foreground = isPrimary ? loginTheme.buttonText : loginTheme.link;

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
    minHeight: 52,
    elevation: 0,
    shadowOpacity: 0,
  },
  primary: {
    backgroundColor: loginTheme.buttonBg,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: loginTheme.googleBg,
    borderWidth: 1,
    borderColor: loginTheme.googleBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});

export default AuthButton;
