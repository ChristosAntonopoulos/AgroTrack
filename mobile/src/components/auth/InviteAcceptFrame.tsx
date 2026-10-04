import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenLayout from '../layout/ScreenLayout';
import Button from '../ui/Button';
import LoadingSpinner from '../LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

type InviteAcceptFrameProps = {
  loading: boolean;
  error: string | null;
  loginLabel: string;
  onLogin: () => void;
  children?: React.ReactNode;
};

const InviteAcceptFrame: React.FC<InviteAcceptFrameProps> = ({
  loading,
  error,
  loginLabel,
  onLogin,
  children,
}) => {
  const { colors } = useTheme();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout padded>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {children ? (
        <View style={styles.body}>{children}</View>
      ) : (
        <Button title={loginLabel} onPress={onLogin} />
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  error: { ...typography.styles.body, marginBottom: spacing.md },
  body: { gap: spacing.md },
});

export default InviteAcceptFrame;
