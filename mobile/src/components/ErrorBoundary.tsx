import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../theme';
import Button from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced logging for boolean casting errors
    const isBooleanError = error.message?.includes('cannot be cast') || 
                          error.message?.includes('Boolean') ||
                          error.message?.includes('String cannot be cast') ||
                          error.message?.includes('java.lang.String') ||
                          error.message?.includes('java.lang.Boolean');
    
    if (isBooleanError) {
      console.error('\n🚨🚨🚨 BOOLEAN CASTING ERROR DETECTED 🚨🚨🚨');
      console.error('===========================================');
      console.error('ERROR MESSAGE:', error.message);
      console.error('ERROR NAME:', error.name);
      console.error('ERROR TYPE:', typeof error);
      console.error('\n--- FULL ERROR OBJECT ---');
      console.error(error);
      console.error('\n--- ERROR STACK TRACE ---');
      console.error(error.stack || 'No stack trace available');
      console.error('\n--- COMPONENT STACK ---');
      console.error(errorInfo.componentStack || 'No component stack available');
      console.error('\n--- ERROR INFO ---');
      console.error(JSON.stringify(errorInfo, null, 2));
      console.error('\n--- ERROR CONTEXT ---');
      console.error('  - This error occurs when a non-boolean value is passed to a native component');
      console.error('  - Common culprits: TouchableOpacity.disabled, RefreshControl.refreshing, Modal.visible');
      console.error('  - Check the component stack above to find which component is causing the error');
      console.error('  - Look for recent logs with ⚠️ warnings about non-boolean props');
      console.error('===========================================\n');
    } else {
      console.error('\n⚠️ ErrorBoundary caught an error:');
      console.error('Message:', error.message);
      console.error('Name:', error.name);
      console.error('Stack:', error.stack);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('');
    }
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Error Details (Dev Mode):</Text>
                  <Text style={styles.debugText}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.error.stack && (
                    <>
                      <Text style={styles.debugTitle}>Stack Trace:</Text>
                      <Text style={styles.debugText}>
                        {this.state.error.stack}
                      </Text>
                    </>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <Text style={styles.debugTitle}>Component Stack:</Text>
                      <Text style={styles.debugText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </>
                  )}
                </View>
              )}

              <Button
                title="Try Again"
                onPress={this.handleReset}
                variant="primary"
                style={styles.resetButton}
              />
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.xl,
    ...spacingPatterns.shadow.lg,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.styles.h3,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  debugContainer: {
    width: '100%',
    backgroundColor: colors.gray100,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  debugTitle: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  debugText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  resetButton: {
    marginTop: spacing.md,
  },
});

export default ErrorBoundary;
