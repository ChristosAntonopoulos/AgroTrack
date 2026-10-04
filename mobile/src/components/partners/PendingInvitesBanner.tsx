import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fieldPeopleService, FieldInvite } from '../../services/fieldPeopleService';
import type { RootStackParamList } from '../../navigation/types';
import { radii, spacing, typography } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Surfaces pending field invites for the signed-in user on the launcher. */
const PendingInvitesBanner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation(['fields']);
  const navigation = useNavigation<Nav>();
  const [invites, setInvites] = useState<FieldInvite[]>([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setInvites([]);
      return;
    }
    try {
      const next = await fieldPeopleService.getPendingInvites();
      setInvites(next);
    } catch {
      setInvites([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAuthenticated || invites.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: isDark ? colors.primaryLight : '#E8EFE0',
          borderColor: colors.oliveBorder || colors.border,
        },
      ]}
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('fields:people.pendingInvitesTitle', {
          count: invites.length,
          defaultValue:
            invites.length === 1
              ? 'You have an invitation waiting'
              : 'You have {{count}} invitations waiting',
        })}
      </Text>
      {invites.slice(0, 3).map((invite) => (
        <Pressable
          key={invite.id}
          onPress={() => navigation.navigate('InviteAccept', { token: invite.token })}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {invite.invitedByName
              ? t('fields:people.pendingInviteLine', {
                  name: invite.invitedByName,
                  field: invite.fieldName,
                  defaultValue: '{{name}} · {{field}}',
                })
              : invite.fieldName}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.styles.body,
    fontWeight: '700',
  },
  row: {
    paddingVertical: spacing.xs,
  },
});

export default PendingInvitesBanner;
