import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Button from '../ui/Button';

const CreatedTaskBanner = ({
  title,
  fieldName,
  dateLabel,
  onView,
  onCreateAnother,
  onUndo,
}: {
  title: string;
  fieldName: string;
  dateLabel: string;
  onView: () => void;
  onCreateAnother: () => void;
  onUndo: () => void;
}) => {
  const { t } = useTranslation('tasks');
  const { colors, fontScaleMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
        {t('fieldWork.form.createdTitle')}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {[title, fieldName, dateLabel].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.actions}>
        <Button title={t('fieldWork.form.viewTask')} onPress={onView} style={styles.btn} />
        <Button
          title={t('fieldWork.form.createAnother')}
          variant="outline"
          onPress={onCreateAnother}
          style={styles.btn}
        />
        <Button title={t('fieldWork.form.undo')} variant="ghost" onPress={onUndo} style={styles.btn} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.styles.body, fontWeight: '700' },
  meta: { ...typography.styles.bodySmall },
  actions: { gap: spacing.sm },
  btn: { alignSelf: 'stretch' },
});

export default CreatedTaskBanner;
