import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

export type ChecklistFlags = {
  hasContact: boolean;
  inviteSent: boolean;
  accepted: boolean;
  hasModules: boolean;
  canCallOrMessage: boolean;
};

type Props = {
  checklist: ChecklistFlags;
  titleKey?: string;
};

const KEYS = ['hasContact', 'inviteSent', 'accepted', 'hasModules', 'canCallOrMessage'] as const;

const TeamChecklist: React.FC<Props> = ({ checklist, titleKey = 'partners:family.checklistTitle' }) => {
  const { t } = useTranslation(['partners']);
  const { colors } = useTheme();

  return (
    <View
      style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surface }]}
      accessibilityLabel={t(titleKey)}
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>{t(titleKey)}</Text>
      {KEYS.map((key) => {
        const ok = checklist[key];
        return (
          <View key={key} style={styles.row}>
            <Text style={{ color: ok ? colors.primary : colors.textSecondary, fontWeight: '700', width: 18 }}>
              {ok ? '✓' : '○'}
            </Text>
            <Text style={{ color: ok ? colors.textPrimary : colors.textSecondary, flex: 1, fontSize: 13 }}>
              {t(`partners:family.checklist.${key}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 6,
  },
  title: { fontSize: 12, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default TeamChecklist;
