import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, createElevation } from '../../theme';

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
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primaryLight,
          borderColor: colors.oliveBorder,
          ...createElevation(colors, 'flat'),
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.surface }]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}>
          {t('fieldWork.form.createdTitle')}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
          {[title, fieldName, dateLabel].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.links}>
          <Pressable onPress={onView} style={{ minHeight: tapMin * 0.7, justifyContent: 'center' }}>
            <Text style={[styles.link, { color: colors.primary }]}>{t('fieldWork.form.viewTask')}</Text>
          </Pressable>
          <Pressable onPress={onCreateAnother} style={{ minHeight: tapMin * 0.7, justifyContent: 'center' }}>
            <Text style={[styles.link, { color: colors.primary }]}>{t('fieldWork.form.createAnother')}</Text>
          </Pressable>
          <Pressable onPress={onUndo} style={{ minHeight: tapMin * 0.7, justifyContent: 'center' }}>
            <Text style={[styles.link, { color: colors.textSecondary }]}>{t('fieldWork.form.undo')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  link: { fontWeight: '700', fontSize: 13 },
});

export default CreatedTaskBanner;
