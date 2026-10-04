import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import type { RootStackParamList } from '../../navigation/types';
import { radii, spacing } from '../../theme';

type Props = {
  fieldId: string;
  resume?: boolean;
  quiet?: boolean;
  onDismiss?: () => void;
};

/**
 * Same “set up this field’s year” prompt as field details —
 * reusable on Chronologio / Tasks when a grove still needs work setup.
 */
const WorkSetupBanner: React.FC<Props> = ({ fieldId, resume = false, quiet = false, onDismiss }) => {
  const { t } = useTranslation('tasks');
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (quiet) {
    return (
      <View
        style={[
          styles.banner,
          styles.quiet,
          { borderColor: colors.border, backgroundColor: 'transparent' },
        ]}
        accessibilityRole="summary"
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('fieldWork.profile.title')}
        </Text>
        <Button
          title={t('fieldWork.profile.open')}
          variant="outline"
          fullWidth
          onPress={() => navigation.navigate('FieldWorkProfile', { fieldId })}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.banner,
        {
          borderColor: colors.oliveBorder,
          backgroundColor: colors.primaryLight,
        },
      ]}
      accessibilityRole="header"
      accessibilityLabel={t('fieldWork.onboarding.banner.title')}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('fieldWork.onboarding.banner.title')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('fieldWork.onboarding.banner.body')}
      </Text>
      <View style={styles.actions}>
        <Button
          title={
            resume
              ? t('fieldWork.onboarding.banner.resume')
              : t('fieldWork.onboarding.banner.start')
          }
          fullWidth
          onPress={() => navigation.navigate('FieldWorkSetup', { fieldId })}
        />
        {onDismiss ? (
          <Button
            title={t('fieldWork.onboarding.banner.later')}
            variant="outline"
            fullWidth
            onPress={onDismiss}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quiet: {
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: 2,
  },
});

export default WorkSetupBanner;
