import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, radii } from '../../theme';

type Props = {
  label: string;
  children: React.ReactNode;
  onRetry?: () => void;
  /** Optional fallback when a section fails — keeps the rest of the page usable. */
  fallback?: React.ReactNode;
};

type State = { error: Error | null };

/**
 * Catches render errors in one field-page section so a bad map/native import
 * cannot take down the whole screen with an opaque "prototype" redbox.
 */
export default class FieldPageErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[FieldPage] ${this.props.label} crashed:`, error);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <View style={styles.box}>
        <Text style={styles.title}>{this.props.label}</Text>
        <Text style={styles.body} numberOfLines={4}>
          {this.state.error.message}
        </Text>
        {this.props.onRetry ? (
          <Pressable
            onPress={() => {
              this.setState({ error: null });
              this.props.onRetry?.();
            }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    padding: spacing.md,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  title: { fontWeight: '700', fontSize: 14 },
  body: { fontSize: 12, lineHeight: 16, opacity: 0.7 },
  btn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#3A4420',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
