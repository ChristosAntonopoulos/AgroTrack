import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { typography, spacing } from '../theme';
import Button from '../components/ui/Button';

export interface TutorialStep {
  id: string;
  titleKey: string;
  bodyKey: string;
  targetArea?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface TutorialOverlayProps {
  visible: boolean;
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ visible, steps, onComplete, onSkip }) => {
  const { t } = useTranslation('tutorial');
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

  const targetArea = currentStep.targetArea;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        {/* Dimmed backdrop with cutout for highlighted area */}
        <View style={StyleSheet.absoluteFill}>
          {targetArea ? (
            <>
              {/* Top */}
              <View
                style={[
                  styles.backdrop,
                  {
                    backgroundColor: colors.shadow + 'E6',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: targetArea.top,
                  },
                ]}
              />
              {/* Left */}
              <View
                style={[
                  styles.backdrop,
                  {
                    backgroundColor: colors.shadow + 'E6',
                    top: targetArea.top,
                    left: 0,
                    width: targetArea.left,
                    height: targetArea.height,
                  },
                ]}
              />
              {/* Right */}
              <View
                style={[
                  styles.backdrop,
                  {
                    backgroundColor: colors.shadow + 'E6',
                    top: targetArea.top,
                    left: targetArea.left + targetArea.width,
                    right: 0,
                    height: targetArea.height,
                  },
                ]}
              />
              {/* Bottom */}
              <View
                style={[
                  styles.backdrop,
                  {
                    backgroundColor: colors.shadow + 'E6',
                    top: targetArea.top + targetArea.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              />
              {/* Highlight border */}
              <View
                style={[
                  styles.highlight,
                  {
                    top: targetArea.top - 4,
                    left: targetArea.left - 4,
                    width: targetArea.width + 8,
                    height: targetArea.height + 8,
                    borderColor: colors.primary,
                  },
                ]}
              />
            </>
          ) : (
            <View
              style={[
                styles.backdrop,
                {
                  backgroundColor: colors.shadow + 'E6',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
          )}
        </View>

        {/* Coach card */}
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
                {t(currentStep.titleKey, { defaultValue: currentStep.id })}
              </Text>
              <Pressable
                style={[styles.skipButton, { minHeight: tapMin * 0.7 }]}
                onPress={onSkip}
                hitSlop={8}
              >
                <Text style={[styles.skipText, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
                  {t('common:skip', { defaultValue: 'Skip' })}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.cardBody, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
              {t(currentStep.bodyKey, { defaultValue: '' })}
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
                title={isLastStep ? t('common:done', { defaultValue: 'Done' }) : t('common:next', { defaultValue: 'Next' })}
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
    position: 'absolute',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 12,
    borderStyle: 'dashed',
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
    lineHeight: 24,
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
