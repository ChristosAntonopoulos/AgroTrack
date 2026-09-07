import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { FieldMembership } from '../../services/fieldPeopleService';
import { spacing, typography } from '../../theme';

type Props = {
  people: FieldMembership[];
};

const WhoWorksHere: React.FC<Props> = ({ people }) => {
  const { t } = useTranslation(['fields']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const active = people.filter((person) => person.status !== 'removed');

  if (active.length === 0) {
    return (
      <View style={[styles.wrap, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {t('fields:people.whoWorks')}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }}>
          {t('fields:people.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
        {t('fields:people.whoWorks')}
      </Text>
      <View style={styles.row}>
        {active.map((person) => (
          <View
            key={`${person.fieldId ?? ''}-${person.userId}`}
            style={[
              styles.chip,
              {
                minHeight: Math.max(tapMin - 8, 40),
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="person-outline" size={16} color={colors.primaryDark} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 * fontScaleMultiplier }}>
              {person.displayName || person.email || t('fields:people.unnamed')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.styles.body,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
  },
});

export default WhoWorksHere;
