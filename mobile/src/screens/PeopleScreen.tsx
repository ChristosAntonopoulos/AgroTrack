import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useRefresh } from '../hooks/useRefresh';
import { getFieldService } from '../services/serviceFactory';
import { fieldPeopleService, FieldMembership } from '../services/fieldPeopleService';
import { spacing, typography } from '../theme';

const PeopleScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['fields', 'common']);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<FieldMembership[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fields = await getFieldService().getFields(user.id, user.role);
      const rows = await Promise.all(
        fields.map(async (field) => {
          const members = await fieldPeopleService.getPeople(field.id, field);
          return members.map((member) => ({ ...member, fieldId: field.id, fieldName: field.name }));
        })
      );
      const seen = new Set<string>();
      const unique = rows.flat().filter((person) => {
        const key = `${person.userId}:${person.fieldId ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return person.status !== 'removed';
      });
      setPeople(unique);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const { refreshing, onRefresh } = useRefresh(load);

  if (loading && people.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title={t('fields:people.title')} subtitle={t('fields:people.subtitle')} />
      {people.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={36} color={colors.textTertiary} />}
          title={t('fields:people.emptyTitle')}
          description={t('fields:people.emptyHint')}
        />
      ) : (
        people.map((person) => (
          <View
            key={`${person.fieldId}-${person.userId}`}
            style={[
              styles.row,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderLight,
                minHeight: tapMin,
              },
            ]}
          >
            <Ionicons name="person-outline" size={20} color={colors.primaryDark} />
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
                {person.displayName || person.email || t('fields:people.unnamed')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }}>
                {person.fieldName}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'] },
  row: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: { flex: 1 },
  name: {
    ...typography.styles.body,
    fontWeight: '700',
  },
});

export default PeopleScreen;
