import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

/**
 * Legacy linger caption (older installs may still hold navCoachPhase=linger).
 * Fresh runs skip linger and coach the home mark directly after spatial welcome.
 */
const MapExploreCue: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const { colors, tapMin } = useTheme();
  const activation = useOwnerActivationOptional();

  if (!activation || activation.navCoachPhase !== 'linger') return null;
  if (activation.awaitingFirstObservation || activation.completion.firstObservation) return null;

  const goHome = () => {
    activation.continueToHome();
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      pointerEvents="box-none"
    >
      <Text style={[styles.caption, { color: colors.textPrimary }]}>{t('mapExplore.caption')}</Text>
      <Pressable
        style={[styles.cta, { backgroundColor: colors.primary, minHeight: tapMin }]}
        onPress={goHome}
      >
        <Text style={styles.ctaText}>{t('mapExplore.cta')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    zIndex: 20,
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    maxWidth: 280,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    shadowColor: '#080c0a',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  caption: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  cta: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default MapExploreCue;
