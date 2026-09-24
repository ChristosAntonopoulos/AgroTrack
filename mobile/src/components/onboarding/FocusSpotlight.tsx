import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OwnerActivationStepId } from '../../onboarding/steps';
import { spacing } from '../../theme';

type Props = {
  step: OwnerActivationStepId;
  /** Optional — omitted on createGrove so growers must finish name/colour. */
  onSkip?: () => void;
  /** Within drawBoundary: search first, then map corners. */
  boundaryPhase?: 'locate' | 'draw';
  /** Within createGrove: name first, then colour. */
  createPhase?: 'name' | 'color';
};

/** Inline coach tip — fixed high-contrast cream card (readable on any map). */
const FocusSpotlight: React.FC<Props> = ({
  step,
  onSkip,
  boundaryPhase = 'draw',
  createPhase = 'name',
}) => {
  const { t } = useTranslation('onboarding');

  const isLocate = step === 'drawBoundary' && boundaryPhase === 'locate';
  const isCreateColor = step === 'createGrove' && createPhase === 'color';
  const title =
    step === 'createGrove'
      ? isCreateColor
        ? t('spotlight.createColor.title')
        : t('spotlight.createGrove.title')
      : isLocate
        ? t('spotlight.locatePlace.title')
        : t('spotlight.drawBoundary.title');
  const body =
    step === 'createGrove'
      ? isCreateColor
        ? t('spotlight.createColor.body')
        : t('spotlight.createGrove.body')
      : isLocate
        ? t('spotlight.locatePlace.body')
        : t('spotlight.drawBoundary.body');

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {onSkip ? (
        <Pressable onPress={onSkip} hitSlop={8}>
          <Text style={styles.skip}>{t('spotlight.skip')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.16)',
    backgroundColor: '#fffdf8',
    padding: spacing.md,
    gap: 6,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e261c',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3d4a38',
  },
  skip: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    color: '#2f5d38',
  },
});

export default FocusSpotlight;
