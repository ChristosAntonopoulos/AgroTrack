import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';

interface PersonalizingScreenProps {
  onComplete: () => void;
}

interface Phase {
  key: string;
  labelKey: string;
  duration: number;
}

const PHASES: Phase[] = [
  { key: 'gathering', labelKey: 'onboarding.phases.gathering', duration: 800 },
  { key: 'applying', labelKey: 'onboarding.phases.applying', duration: 700 },
  { key: 'personalizing', labelKey: 'onboarding.phases.personalizing', duration: 600 },
  { key: 'ready', labelKey: 'onboarding.phases.ready', duration: 500 },
];

const PersonalizingScreen: React.FC<PersonalizingScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const { fontScaleMultiplier } = usePreferences();
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (currentPhase >= PHASES.length) {
      const timeout = setTimeout(onComplete, 300);
      return () => clearTimeout(timeout);
    }

    const phase = PHASES[currentPhase];
    const timeout = setTimeout(() => {
      setCurrentPhase(currentPhase + 1);
    }, phase.duration);

    return () => clearTimeout(timeout);
  }, [currentPhase, onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <LoadingSpinner size="large" />
        
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
          {t('onboarding.settingUp', { defaultValue: 'Setting things up' })}
        </Text>

        <View style={styles.phasesList}>
          {PHASES.map((phase, index) => {
            const isComplete = index < currentPhase;
            const isCurrent = index === currentPhase;
            const isPending = index > currentPhase;

            return (
              <View key={phase.key} style={styles.phaseRow}>
                <View
                  style={[
                    styles.phaseIcon,
                    {
                      backgroundColor: isComplete
                        ? colors.success
                        : isCurrent
                        ? colors.primary
                        : colors.surfaceMuted,
                      borderColor: isComplete || isCurrent ? 'transparent' : colors.border,
                    },
                  ]}
                >
                  {isComplete ? (
                    <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                  ) : (
                    <View
                      style={[
                        styles.phaseDot,
                        {
                          backgroundColor: isCurrent ? colors.textInverse : colors.textTertiary,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.phaseLabel,
                    {
                      color: isComplete || isCurrent ? colors.textPrimary : colors.textTertiary,
                      fontSize: 16 * fontScaleMultiplier,
                      fontWeight: isCurrent ? '700' : '400',
                    },
                  ]}
                >
                  {t(phase.labelKey, { defaultValue: phase.key })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.styles.h2,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  phasesList: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.md,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseLabel: {
    ...typography.styles.body,
    flex: 1,
  },
});

export default PersonalizingScreen;
