import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary,
  fullScreen = false,
}) => {
  // Log fullScreen prop to catch any non-boolean values
  if (__DEV__) {
    console.log('[LoadingSpinner] Rendering');
    console.log('[LoadingSpinner] fullScreen prop - type:', typeof fullScreen, 'value:', fullScreen);
    
    if (typeof fullScreen !== 'boolean') {
      console.error('[LoadingSpinner] ⚠️ fullScreen is NOT boolean! Type:', typeof fullScreen, 'Value:', fullScreen);
    }
  }
  
  // Prop is already correct type, use directly
  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default LoadingSpinner;
