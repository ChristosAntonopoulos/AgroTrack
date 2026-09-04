import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { typography, spacing } from '../theme';
import Button from './ui/Button';

export interface TutorialStep {
  id: string;
  titleKey: string;
  bodyKey: string;
}

interface TutorialOverlayProps {
  visible: boolean;
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ visible, steps, onComplete, onSkip }) => {
  const { t } = useTranslation(['tutorial', 'common']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
    }
  }, [visible]);

  if (!visible || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={[styles.backdrop, { backgroundColor: colors.shadow + 'E6' }]} />

        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier }]}>
                {t(currentStep.titleKey)}
              </Text>
              <Pressable style={[styles.skipButton, { minHeight: tapMin }]} onPress={onSkip} hitSlop={8}>
                <Text style={[styles.skipText, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
                  {t('common:skip')}
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.cardBody,
                {
                  color: colors.textSecondary,
                  fontSize: 16 * fontScaleMultiplier,
                  lineHeight: 24 * fontScaleMultiplier,
                },
              ]}
            >
              {t(currentStep.bodyKey)}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.pips}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.pip,
                      {
                        backgroundColor: index === currentStepIndex ? colors.primary : colors.borderLight,
                      },
                    ]}
                  />
                ))}
              </View>

              <Button
                title={isLastStep ? t('common:done') : t('common:next')}
                onPress={handleNext}
                size="medium"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrapper: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
  },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.styles.h3,
    fontWeight: '700',
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  skipText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  cardBody: {
    ...typography.styles.body,
    marginBottom: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default TutorialOverlay;
