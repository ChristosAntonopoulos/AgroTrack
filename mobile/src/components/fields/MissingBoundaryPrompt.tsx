import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Field } from '../../services/fieldService';
import { fieldHasBoundary, fieldHasLocation } from '../../utils/fieldDisplay';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import { RootStackParamList } from '../../navigation/types';
import { spacing, typography } from '../../theme';

type Props = {
  field: Field;
  canEdit?: boolean;
};

const snoozedIds = new Set<string>();

const MissingBoundaryPrompt: React.FC<Props> = ({ field, canEdit = true }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [snoozed, setSnoozed] = useState(() => snoozedIds.has(field.id));

  if (!canEdit || !fieldHasLocation(field) || fieldHasBoundary(field) || snoozed) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.primary + '14',
          borderColor: colors.primary + '55',
        },
      ]}
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('createGrove.mapPrompt.title')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('createGrove.mapPrompt.body')}
      </Text>
      <View style={styles.actions}>
        <Button
          title={t('createGrove.mapPrompt.action')}
          onPress={() => navigation.navigate('FieldMapBoundary', { fieldId: field.id })}
          size="small"
        />
        <Button
          title={t('createGrove.mapPrompt.later')}
          variant="ghost"
          size="small"
          onPress={() => {
            snoozedIds.add(field.id);
            setSnoozed(true);
          }}
        />
      </View>
      <Text style={[styles.locked, { color: colors.textTertiary }]}>
        {t('createGrove.mapPrompt.satelliteLocked')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.styles.h6,
  },
  body: {
    ...typography.styles.bodySmall,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  locked: {
    ...typography.styles.caption,
    marginTop: spacing.xs,
  },
});

export default MissingBoundaryPrompt;
